import type { BitMatrix } from "./BitMatrix";

type Pos = [col: number, row: number];

// The 2 EC bits are not in L-M-Q-H order: 00 = M, 01 = L, 10 = H, 11 = Q
const EC_LEVELS: ECLevel[] = ["M", "L", "H", "Q"];

/** Copy 1, around the top-left finder, most significant bit first */
export const FORMAT_COPY_1: Pos[] = [
  [0, 8],
  [1, 8],
  [2, 8],
  [3, 8],
  [4, 8],
  [5, 8], // row 8, left part
  [7, 8],
  [8, 8],
  [8, 7], // around the corner (skip timing at col/row 6)
  [8, 5],
  [8, 4],
  [8, 3],
  [8, 2],
  [8, 1],
  [8, 0], // column 8, going up
];

/** Copy 2: bottom-left (column 8, going up), then top-right (row 8, going right) */
export function formatCopy2(d: number): Pos[] {
  const p: Pos[] = [];
  for (let row = d - 1; row >= d - 7; row--) p.push([8, row]);
  for (let col = d - 8; col < d; col++) p.push([col, 8]);
  return p;
}

/**
 * BCH encoding: append the remainder of dividing `data` (shifted left) by `generator`,
 * using XOR instead of subtraction. `checkBits` is the degree of the generator.
 */
function bchCodeword(data: number, generator: number, checkBits: number): number {
  let rem = data << checkBits;
  for (let bit = 31 - Math.clz32(rem); bit >= checkBits; bit--) {
    if (rem & (1 << bit)) rem ^= generator << (bit - checkBits); // "subtract" the generator
  }
  return (data << checkBits) | rem;
}

/** 5 data bits → 15-bit format codeword, with the fixed XOR so it's never all zeros */
const formatCodeword = (data: number) => bchCodeword(data, 0x537, 10) ^ 0x5412;

const VALID_FORMATS = Array.from({ length: 32 }, (_, data) => ({ data, code: formatCodeword(data) }));

function readBits(grid: BitMatrix, positions: Pos[]): number {
  return positions.reduce((acc, [col, row]) => (acc << 1) | (grid.get(col, row) ? 1 : 0), 0);
}

/** Number of 1 bits: here, how many bits differ */
function popcount(x: number): number {
  let n = 0;
  for (; x; x >>>= 1) n += x & 1;
  return n;
}

/** The valid value closest to any of `reads`, if it is within 3 bits (what the BCH code can correct) */
function closest(reads: number[], valid: { data: number; code: number }[]) {
  let best = -1;
  let bestDistance = Infinity;
  for (const { data, code } of valid) {
    for (const read of reads) {
      const distance = popcount(read ^ code); // XOR: 1 where they differ
      if (distance < bestDistance) {
        bestDistance = distance;
        best = data;
      }
    }
  }
  return bestDistance <= 3 ? { data: best, distance: bestDistance } : null;
}

export function readFormatInfo(grid: BitMatrix): FormatInfo | null {
  const reads = [readBits(grid, FORMAT_COPY_1), readBits(grid, formatCopy2(grid.width))];
  const match = closest(reads, VALID_FORMATS);
  if (!match) return null;
  return { ecLevel: EC_LEVELS[match.data >> 3], mask: match.data & 7, distance: match.distance };
}

// ---------------------------------------------------------------------------
// Version information (versions 7+ only)
//
// From version 7 the code also stores its version in two 6×3 blocks, next to
// the top-right and bottom-left finders: 6 version bits + 12 BCH bits (no XOR).
// The geometric estimate from Part 4 can be off by one on big codes; this fixes it.
// ---------------------------------------------------------------------------

const VALID_VERSIONS = Array.from({ length: 34 }, (_, i) => {
  const version = i + 7;
  return { data: version, code: bchCodeword(version, 0x1f25, 12) };
});

/** Top-right block: rows 5…0, columns d-9…d-11. Bottom-left: the same, transposed. */
function versionPositions(d: number): [Pos[], Pos[]] {
  const topRight: Pos[] = [];
  const bottomLeft: Pos[] = [];
  for (let a = 5; a >= 0; a--) {
    for (let b = d - 9; b >= d - 11; b--) {
      topRight.push([b, a]);
      bottomLeft.push([a, b]);
    }
  }
  return [topRight, bottomLeft];
}

export function readVersionInfo(grid: BitMatrix): number | null {
  const [topRight, bottomLeft] = versionPositions(grid.width);
  const match = closest([readBits(grid, topRight), readBits(grid, bottomLeft)], VALID_VERSIONS);
  return match ? match.data : null;
}
