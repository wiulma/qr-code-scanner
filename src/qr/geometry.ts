import type { BitMatrix } from "./BitMatrix";
import { MAX_VERSION } from "./versions";

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function orderFinderPatterns([a, b, c]: FinderPattern[]) {
  const ab = distance(a, b),
    bc = distance(b, c),
    ac = distance(a, c);

  // The point opposite the longest side (the diagonal) is top-left
  let topLeft: Point, p1: Point, p2: Point;
  if (bc >= ab && bc >= ac) [topLeft, p1, p2] = [a, b, c];
  else if (ac >= ab && ac >= bc) [topLeft, p1, p2] = [b, a, c];
  else [topLeft, p1, p2] = [c, a, b];

  // Clockwise from p1 to p2 (positive cross, y down) means p1 is top-right
  const cross = (p1.x - topLeft.x) * (p2.y - topLeft.y) - (p1.y - topLeft.y) * (p2.x - topLeft.x);

  return cross > 0 ? { topLeft, topRight: p1, bottomLeft: p2 } : { topLeft, topRight: p2, bottomLeft: p1 };
}

/** Pixels from `from` (a finder center) toward `toward` until the finder's outer edge: 3.5 modules */
function halfFinderWidth(bits: BitMatrix, from: Point, toward: Point): number {
  const len = distance(from, toward);
  const dx = (toward.x - from.x) / len; // unit vector: one step = one pixel
  const dy = (toward.y - from.y) / len;

  let n = 0,
    transitions = 0,
    wasDark = true;
  for (;;) {
    const x = Math.round(from.x + dx * n);
    const y = Math.round(from.y + dy * n);
    if (x < 0 || y < 0 || x >= bits.width || y >= bits.height) break;
    const dark = bits.get(x, y);
    if (dark !== wasDark) {
      transitions++;
      wasDark = dark;
      if (transitions === 3) break; // center → light ring → dark ring → outside
    }
    n++;
  }
  return n;
}

/** Module size measured along the line a→b, through both finders (7 modules each) */
function moduleSizeAlong(bits: BitMatrix, a: Point, b: Point): number {
  // The point mirrored through p, i.e. a target in the opposite direction
  const away = (p: Point, q: Point) => ({ x: 2 * p.x - q.x, y: 2 * p.y - q.y });

  const aWidth = halfFinderWidth(bits, a, b) + halfFinderWidth(bits, a, away(a, b));
  const bWidth = halfFinderWidth(bits, b, a) + halfFinderWidth(bits, b, away(b, a));
  // Each finder's center pixel was counted by both walks: remove it once per finder
  return (aWidth + bWidth - 2) / 14; // two finders × 7 modules
}

export function locateQR(bits: BitMatrix, finders: FinderPattern[]): QRLocation | null {
  const { topLeft, topRight, bottomLeft } = orderFinderPatterns(finders);

  // Measure each side separately: with perspective, they can differ
  const msTop = moduleSizeAlong(bits, topLeft, topRight);
  const msLeft = moduleSizeAlong(bits, topLeft, bottomLeft);

  const modulesTop = distance(topLeft, topRight) / msTop + 7;
  const modulesLeft = distance(topLeft, bottomLeft) / msLeft + 7;
  if (Math.abs(modulesTop - modulesLeft) > 4) return null; // not a square: bad finders

  const version = Math.round(((modulesTop + modulesLeft) / 2 - 17) / 4);
  if (version < 1 || version > MAX_VERSION) return null; // our supported range

  return withVersion({ topLeft, topRight, bottomLeft, moduleSize: (msTop + msLeft) / 2, version, dimension: 0 }, version);
}

/** The same location with another version (e.g. the one read from the version info) */
export function withVersion(loc: QRLocation, version: number): QRLocation {
  return { ...loc, version, dimension: 17 + 4 * version };
}
