import type { BitMatrix } from "./BitMatrix";
import { functionMask, totalCodewords } from "./versions";

// Part 7: unmask the grid and read the bytes in the QR zigzag order.

/**
 * The 8 mask patterns. When the formula is true for (row, col), that data module was
 * flipped by the encoder (to avoid big blobs or finder-like shapes); we flip it back.
 */
const MASKS: ((row: number, col: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/**
 * Data is placed in 2-module-wide columns, starting at the bottom-right corner,
 * going up, then down, then up… moving left. Column 6 (vertical timing) is skipped.
 * Inside each pair, the right module comes before the left one.
 */
export function readCodewords(grid: BitMatrix, version: number, mask: number): Uint8Array {
  const d = grid.width;
  const isFunction = functionMask(version);
  const isMasked = MASKS[mask];
  const total = totalCodewords(version);
  const out = new Uint8Array(total);

  let bitIndex = 0;
  let upward = true;
  for (let right = d - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5; // skip the timing column
    for (let k = 0; k < d; k++) {
      const row = upward ? d - 1 - k : k;
      for (let c = 0; c < 2; c++) {
        const col = right - c;
        if (isFunction.get(col, row)) continue;
        // A few leftover "remainder bits" at the end aren't part of any byte
        if (bitIndex >> 3 < total && grid.get(col, row) !== isMasked(row, col)) {
          out[bitIndex >> 3] |= 0x80 >> (bitIndex & 7);
        }
        bitIndex++;
      }
    }
    upward = !upward;
  }
  return out;
}

/**
 * Bigger codes split the message into several blocks, each with its own error correction,
 * and interleave them: data byte 0 of every block, then data byte 1 of every block, …
 * then EC byte 0 of every block, … A scratch or a smudge then spreads its damage
 * across blocks instead of destroying one. Here we undo the interleaving.
 */
export function splitBlocks(codewords: Uint8Array, { ecPerBlock, groups }: ECBlocks): Block[] {
  const result: Block[] = [];
  for (const [count, dataLength] of groups) {
    for (let i = 0; i < count; i++) result.push({ dataLength, bytes: new Uint8Array(dataLength + ecPerBlock) });
  }

  let k = 0;
  const maxData = Math.max(...result.map((b) => b.dataLength));
  for (let i = 0; i < maxData; i++) {
    for (const b of result) if (i < b.dataLength) b.bytes[i] = codewords[k++];
  }
  for (let i = 0; i < ecPerBlock; i++) {
    for (const b of result) b.bytes[b.dataLength + i] = codewords[k++];
  }
  return result;
}
