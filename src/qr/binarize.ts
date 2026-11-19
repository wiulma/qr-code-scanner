import { BitMatrix } from "./BitMatrix";

const BLOCK = 8;
const RADIUS = 2; // 2 blocks on each side → 5×5 neighborhood
const MIN_CONTRAST = 24; // below this, a block is "flat"

export function binarize(gray: Uint8Array, width: number, height: number): BitMatrix {
  const bw = Math.ceil(width / BLOCK);
  const bh = Math.ceil(height / BLOCK);
  const means = new Float32Array(bw * bh);

  // 1. Mean of each block (flat blocks get a low mean → stay light)
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let sum = 0,
        count = 0,
        min = 255,
        max = 0;
      for (let y = by * BLOCK; y < Math.min((by + 1) * BLOCK, height); y++) {
        for (let x = bx * BLOCK; x < Math.min((bx + 1) * BLOCK, width); x++) {
          const v = gray[y * width + x];
          sum += v;
          count++;
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
      means[by * bw + bx] = max - min < MIN_CONTRAST ? min / 2 : sum / count;
    }
  }

  // 2. Threshold each block by the average of its neighborhood
  const matrix = new BitMatrix(width, height);
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let sum = 0,
        n = 0;
      for (let dy = -RADIUS; dy <= RADIUS; dy++) {
        for (let dx = -RADIUS; dx <= RADIUS; dx++) {
          const nx = bx + dx,
            ny = by + dy;
          if (nx >= 0 && ny >= 0 && nx < bw && ny < bh) {
            sum += means[ny * bw + nx];
            n++;
          }
        }
      }
      const threshold = sum / n;

      for (let y = by * BLOCK; y < Math.min((by + 1) * BLOCK, height); y++) {
        for (let x = bx * BLOCK; x < Math.min((bx + 1) * BLOCK, width); x++) {
          matrix.set(x, y, gray[y * width + x] <= threshold);
        }
      }
    }
  }
  return matrix;
}
