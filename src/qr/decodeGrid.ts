import type { BitMatrix } from "./BitMatrix";
import { readCodewords, splitBlocks } from "./codewords";
import { decodeData } from "./data";
import { readFormatInfo } from "./format";
import { correctErrors } from "./reedSolomon";
import { ecBlocks } from "./versions";

/**
 * Parts 6–9: from a straightened N×N grid of modules to the decoded text.
 * Independent of the camera, so it can be tested with a perfect grid.
 */
export function decodeGrid(grid: BitMatrix, version: number): GridResult | null {
  // Part 6: error-correction level and mask
  const format = readFormatInfo(grid);
  if (!format) return null;

  // Part 7: unmask, read the bytes in zigzag order, de-interleave the blocks
  const codewords = readCodewords(grid, version, format.mask);
  const ec = ecBlocks(version, format.ecLevel);
  const blocks = splitBlocks(codewords, ec);

  // Part 8: Reed–Solomon on every block, then keep only the data bytes
  const dataLength = blocks.reduce((sum, b) => sum + b.dataLength, 0);
  const data = new Uint8Array(dataLength);
  let offset = 0;
  let correctedBlocks = 0;
  for (const block of blocks) {
    const before = block.bytes.slice();
    if (!correctErrors(block.bytes, ec.ecPerBlock)) return null;
    if (block.bytes.some((b, i) => b !== before[i])) correctedBlocks++;
    data.set(block.bytes.subarray(0, block.dataLength), offset);
    offset += block.dataLength;
  }

  // Part 9: bytes → text
  const text = decodeData(data, version);
  if (text === null) return null;
  return { text, format, correctedBlocks };
}
