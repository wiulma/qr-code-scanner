import type { BitMatrix } from "./BitMatrix";

function ratioMatches(c: number[]): boolean {
  const total = c[0] + c[1] + c[2] + c[3] + c[4];
  if (total < 7) return false; // need at least 1px per module
  const m = total / 7; // estimated module size in pixels
  const tol = m / 2; // allow ±50% per run
  return (
    Math.abs(m - c[0]) < tol &&
    Math.abs(m - c[1]) < tol &&
    Math.abs(3 * m - c[2]) < 3 * tol &&
    Math.abs(m - c[3]) < tol &&
    Math.abs(m - c[4]) < tol
  );
}

/** Walk outward from `start` along a line: center dark run, then light, then dark, on each side. */
function crossCheck(
  get: (i: number) => boolean,
  start: number,
  length: number,
): { center: number; moduleSize: number } | null {
  const c = [0, 0, 0, 0, 0];
  let i = start;
  while (i >= 0 && get(i)) {
    c[2]++;
    i--;
  } // center (going back)
  while (i >= 0 && !get(i)) {
    c[1]++;
    i--;
  } // inner light ring
  while (i >= 0 && get(i)) {
    c[0]++;
    i--;
  } // outer dark ring
  i = start + 1;
  while (i < length && get(i)) {
    c[2]++;
    i++;
  } // center (going forward)
  while (i < length && !get(i)) {
    c[3]++;
    i++;
  }
  while (i < length && get(i)) {
    c[4]++;
    i++;
  }

  if (!ratioMatches(c)) return null;
  // i is now just past the outer dark run: step back to the middle of the center run
  return { center: i - c[4] - c[3] - c[2] / 2, moduleSize: (c[0] + c[1] + c[2] + c[3] + c[4]) / 7 };
}

function addCandidate(list: FinderPattern[], x: number, y: number, moduleSize: number) {
  const near = list.find((p) => Math.abs(p.x - x) < p.moduleSize * 2 && Math.abs(p.y - y) < p.moduleSize * 2);
  if (!near) {
    list.push({ x, y, moduleSize, count: 1 });
    return;
  }
  // running average: refines the center with every new hit
  const n = near.count;
  near.x = (near.x * n + x) / (n + 1);
  near.y = (near.y * n + y) / (n + 1);
  near.moduleSize = (near.moduleSize * n + moduleSize) / (n + 1);
  near.count++;
}

export function findFinderPatterns(bits: BitMatrix): FinderPattern[] | null {
  const candidates: FinderPattern[] = [];

  const onRowMatch = (c: number[], endX: number, y: number) => {
    const cx = Math.floor(endX - c[4] - c[3] - c[2] / 2);
    const v = crossCheck((i) => bits.get(cx, i), y, bits.height);
    if (!v) return;
    const cy = Math.floor(v.center);
    const h = crossCheck((i) => bits.get(i, cy), cx, bits.width);
    if (!h) return;
    addCandidate(candidates, h.center, v.center, (v.moduleSize + h.moduleSize) / 2);
  };

  for (let y = 0; y < bits.height; y++) {
    const c = [0, 0, 0, 0, 0];
    let state = 0;

    for (let x = 0; x < bits.width; x++) {
      const dark = bits.get(x, y);

      // Skip light pixels before the first dark run
      if (state === 0 && c[0] === 0 && !dark) continue;

      // Same color as the current run: just extend it
      if (dark === (state % 2 === 0)) {
        c[state]++;
        continue;
      }

      // Color changed: start the next run
      if (state < 4) {
        state++;
        c[state] = 1;
        continue;
      }

      // state 4 (dark) just ended: we have 5 complete runs, so test them
      if (ratioMatches(c)) onRowMatch(c, x, y);

      // Slide the window by two runs (one dark + one light) and keep going
      c[0] = c[2];
      c[1] = c[3];
      c[2] = c[4];
      c[3] = 1;
      c[4] = 0;
      state = 3;
    }

    // A pattern touching the right edge of the image
    if (state === 4 && ratioMatches(c)) onRowMatch(c, bits.width, y);
  }

  const confirmed = candidates.filter((p) => p.count >= 2).sort((a, b) => b.count - a.count);
  return pickBestTriple(confirmed);
}

const distance = (a: FinderPattern, b: FinderPattern) => Math.hypot(a.x - b.x, a.y - b.y);

/** Of the strongest candidates, the 3 that look most like real finder patterns */
function pickBestTriple(candidates: FinderPattern[]): FinderPattern[] | null {
  const top = candidates.slice(0, 6); // already sorted by count
  let best: FinderPattern[] | null = null;
  let bestScore = Infinity;

  for (let i = 0; i < top.length; i++)
    for (let j = i + 1; j < top.length; j++)
      for (let k = j + 1; k < top.length; k++) {
        const t = [top[i], top[j], top[k]];

        // Similar module sizes
        const sizes = t.map((p) => p.moduleSize);
        const minSize = Math.min(...sizes);
        const sizeError = (Math.max(...sizes) - minSize) / minSize;
        if (sizeError > 0.5) continue;

        // Sides sorted: a ≤ b ≤ c (c is the diagonal)
        const [a, b, c] = [distance(t[0], t[1]), distance(t[1], t[2]), distance(t[0], t[2])].sort((x, y) => x - y);
        if (a < minSize * 10) continue; // too close: a duplicate of the same finder

        // Right isosceles: a ≈ b, c ≈ √2 · a
        const shapeError = Math.abs(a - b) / b + Math.abs(c - (Math.SQRT2 * (a + b)) / 2) / c;
        if (shapeError > 0.5) continue;

        const score = sizeError + shapeError;
        if (score < bestScore) {
          bestScore = score;
          best = t;
        }
      }

  return best;
}
