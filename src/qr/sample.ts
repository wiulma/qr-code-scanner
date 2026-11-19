import { BitMatrix } from "./BitMatrix";
import { applyTransform, quadToQuad } from "./perspective";

export function moduleToImage(loc: QRLocation, anchor: Anchor): ModuleToImage {
  const d = loc.dimension;
  const m = anchor.module;
  const t = quadToQuad(
    [
      { x: 3.5, y: 3.5 },
      { x: d - 3.5, y: 3.5 },
      { x: m, y: m },
      { x: 3.5, y: d - 3.5 },
    ],
    [loc.topLeft, loc.topRight, anchor.point, loc.bottomLeft],
  );
  return (col, row) => applyTransform(t, col + 0.5, row + 0.5); // center of the module
}

export function sampleGrid(bits: BitMatrix, dimension: number, toImage: ModuleToImage): BitMatrix {
  const grid = new BitMatrix(dimension, dimension);
  for (let row = 0; row < dimension; row++) {
    for (let col = 0; col < dimension; col++) {
      const p = toImage(col, row);
      grid.set(col, row, bits.get(Math.floor(p.x), Math.floor(p.y)));
    }
  }
  return grid;
}
