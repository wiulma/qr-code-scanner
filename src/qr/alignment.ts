import type { BitMatrix } from "./BitMatrix";

/** How many of the 25 samples of a 5×5 alignment pattern match, centered at (x, y) */
function alignmentScore(bits: BitMatrix, x: number, y: number, col: Point, row: Point): number {
  let score = 0;
  for (let j = -2; j <= 2; j++) {
    for (let i = -2; i <= 2; i++) {
      const expectDark = Math.max(Math.abs(i), Math.abs(j)) !== 1; // center & outer ring dark
      const px = Math.round(x + i * col.x + j * row.x);
      const py = Math.round(y + i * col.y + j * row.y);
      if (bits.get(px, py) === expectDark) score++;
    }
  }
  return score;
}

/**
 * The alignment pattern's center is a single dark module surrounded by a light ring.
 * Walk left/right and up/down from `p` to the edges of that dark module, and move
 * to the middle. Twice, because the first move can change the other axis's run.
 */
function refineCenter(bits: BitMatrix, p: Point, moduleSize: number): Point {
  const limit = Math.ceil(moduleSize * 1.5);
  let { x, y } = p;
  for (let pass = 0; pass < 2; pass++) {
    const cx = Math.round(x), cy = Math.round(y);
    if (!bits.get(cx, cy)) return { x, y }; // not on the dark center: keep the estimate

    let left = cx, right = cx, up = cy, down = cy;
    while (left > cx - limit && bits.get(left - 1, cy)) left--;
    while (right < cx + limit && bits.get(right + 1, cy)) right++;
    while (up > cy - limit && bits.get(cx, up - 1)) up--;
    while (down < cy + limit && bits.get(cx, down + 1)) down++;

    // A run that hit the limit isn't the 1-module center: don't trust it
    if (right - left > 2 * limit - 1 || down - up > 2 * limit - 1) return { x, y };
    x = (left + right + 1) / 2; // +1: the run covers whole pixels [left, right]
    y = (up + down + 1) / 2;
  }
  return { x, y };
}

export function findBottomRightAnchor(bits: BitMatrix, loc: QRLocation): Anchor {
  const { topLeft: tl, topRight: tr, bottomLeft: bl, dimension: d } = loc;

  // One module step along the code's columns and rows (finder centers are d−7 modules apart)
  const col = { x: (tr.x - tl.x) / (d - 7), y: (tr.y - tl.y) / (d - 7) };
  const row = { x: (bl.x - tl.x) / (d - 7), y: (bl.y - tl.y) / (d - 7) };

  // Fallback: the parallelogram's 4th corner, where a 4th finder center would be
  const fallback: Anchor = {
    point: { x: tr.x + bl.x - tl.x, y: tr.y + bl.y - tl.y },
    module: d - 3.5,
  };
  if (loc.version < 2) return fallback; // version 1 has no alignment pattern

  // Expected alignment center: 3 modules up and left of the fallback
  const ex = Math.round(fallback.point.x - 3 * (col.x + row.x));
  const ey = Math.round(fallback.point.y - 3 * (col.y + row.y));
  // Perspective moves the real position away from the parallelogram estimate, and
  // more so on bigger codes: search at least 4 modules around it, more on big codes.
  const radius = Math.ceil(loc.moduleSize * Math.max(4, (d - 7) * 0.15));

  // With perspective, modules near the bottom-right can also look smaller (or bigger)
  // than the average: try the template at a few scales and keep the best match.
  // On a tie, prefer the position closest to the estimate.
  let best = 0;
  let bestDistance = Infinity;
  let found: Point = { x: ex, y: ey };
  for (const scale of [1, 0.85, 0.7, 1.15]) {
    const c = { x: col.x * scale, y: col.y * scale };
    const r = { x: row.x * scale, y: row.y * scale };
    for (let y = ey - radius; y <= ey + radius; y++) {
      for (let x = ex - radius; x <= ex + radius; x++) {
        const s = alignmentScore(bits, x, y, c, r);
        if (s < best) continue;
        const dist = (x - ex) ** 2 + (y - ey) ** 2;
        if (s > best || dist < bestDistance) {
          best = s;
          bestDistance = dist;
          found = { x, y };
        }
      }
    }
  }

  if (best < 22) return fallback; // no convincing match: better than a wrong point
  // The template match is only accurate to a pixel or two: center it on the dark module
  return { point: refineCenter(bits, found, loc.moduleSize), module: d - 6.5 };
}
