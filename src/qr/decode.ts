import { findBottomRightAnchor } from "./alignment";
import { binarize } from "./binarize";
import type { BitMatrix } from "./BitMatrix";
import {
  drawBitMatrix,
  drawFinderPatterns,
  drawGrid,
  drawLocation,
  drawPoint,
  drawSamplePoints,
  drawStatus,
  timingErrors,
} from "./debug";
import { decodeGrid } from "./decodeGrid";
import { findFinderPatterns } from "./finder";
import { FORMAT_COPY_1, formatCopy2, readVersionInfo } from "./format";
import { locateQR, withVersion } from "./geometry";
import { toGrayscale } from "./grayscale";
import { moduleToImage, sampleGrid } from "./sample";
import { MAX_VERSION } from "./versions";

/** Debug view: only drawn when the page has a <canvas id="qr-debug"> */
function getDebugCanvas(): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById("qr-debug") as HTMLCanvasElement | null;
}

export function decodeQR(image: ImageData): string | null {
  const debugCanvas = getDebugCanvas();

  // Parts 1–2: pixels → black and white
  const gray = toGrayscale(image);
  const bits = binarize(gray, image.width, image.height);
  if (debugCanvas) drawBitMatrix(bits, debugCanvas);

  // Part 3: the three finder patterns
  const finders = findFinderPatterns(bits);
  if (debugCanvas && finders) drawFinderPatterns(debugCanvas, finders);
  if (!finders) return null;

  // Part 4: orientation and version
  const estimated = locateQR(bits, finders);
  if (!estimated) return null;

  // The version comes from a measurement, so it can be off by one on big codes.
  // Try the estimate first, then its neighbors: a wrong version can't pass the
  // format check and Reed–Solomon, so the first one that decodes is the right one.
  const tried = new Set<number>();
  for (const guess of [estimated.version, estimated.version + 1, estimated.version - 1]) {
    if (guess < 1 || guess > MAX_VERSION) continue;
    let location = withVersion(estimated, guess);

    // Version 7+: the code also says which version it is; trust that over our guess
    if (guess >= 7) {
      const written = readVersionInfo(sample(bits, location).grid);
      if (written && written <= MAX_VERSION) location = withVersion(estimated, written);
    }
    if (tried.has(location.version)) continue;
    tried.add(location.version);

    const text = decodeAt(bits, location, debugCanvas, guess === estimated.version);
    if (text !== null) return text;
  }
  return null;
}

/** Part 5: perspective transform and sampling */
function sample(bits: BitMatrix, loc: QRLocation) {
  const anchor = findBottomRightAnchor(bits, loc);
  const toImage = moduleToImage(loc, anchor);
  return { anchor, toImage, grid: sampleGrid(bits, loc.dimension, toImage) };
}

/** Sample the grid for one version and run Parts 6–9 on it */
function decodeAt(
  bits: BitMatrix,
  location: QRLocation,
  debugCanvas: HTMLCanvasElement | null,
  firstTry: boolean,
): string | null {
  const { anchor, toImage, grid } = sample(bits, location);

  // Draw only the first attempt, so the debug view doesn't flicker between guesses
  if (!firstTry) debugCanvas = null;

  if (debugCanvas) {
    drawLocation(debugCanvas, location);
    drawSamplePoints(debugCanvas, grid, toImage);
    drawPoint(debugCanvas, anchor.point, anchor.module === location.dimension - 6.5 ? "orange" : "gray");
    drawGrid(debugCanvas, grid, 4, [...FORMAT_COPY_1, ...formatCopy2(grid.width)]);
  }

  // Cheap early rejection: if the timing patterns are wrong, the sampling is wrong
  const timingModules = (grid.width - 16) * 2;
  if (timingErrors(grid) > timingModules * 0.2) {
    if (debugCanvas) drawStatus(debugCanvas, "timing patterns don't match", false);
    return null;
  }

  // Parts 6–9: format info, codewords, error correction, data
  const result = decodeGrid(grid, location.version);
  if (debugCanvas) {
    drawStatus(
      debugCanvas,
      result
        ? `EC ${result.format.ecLevel} · mask ${result.format.mask} · fixed ${result.correctedBlocks} block(s)`
        : "could not decode this frame",
      result !== null,
    );
  }
  return result?.text ?? null;
}
