import type { BitMatrix } from "./BitMatrix";

const LOADED_AT = new Date().toLocaleTimeString();

export function drawBitMatrix(m: BitMatrix, canvas: HTMLCanvasElement) {
  canvas.width = m.width;
  canvas.height = m.height;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(m.width, m.height);
  for (let i = 0; i < m.data.length; i++) {
    const v = m.data[i] ? 0 : 255;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  /* FIXME: remove debug */
  ctx.fillStyle = "blue";
  ctx.font = "14px sans-serif";
  ctx.fillText(`loaded ${LOADED_AT}`, 10, canvas.height - 10);
  /* FIXME: remove debug */
}

export function drawFinderPatterns(canvas: HTMLCanvasElement, patterns: FinderPattern[]) {
  const ctx = canvas.getContext("2d")!;
  ctx.strokeStyle = "red";
  ctx.lineWidth = 3;
  for (const p of patterns) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.moduleSize * 3.5, 0, Math.PI * 2); // 3.5 = half of 7 modules
    ctx.stroke();
  }
}

export function drawLocation(canvas: HTMLCanvasElement, loc: QRLocation) {
  const ctx = canvas.getContext("2d")!;
  const { topLeft: tl, topRight: tr, bottomLeft: bl } = loc;

  ctx.lineWidth = 3;
  ctx.strokeStyle = "lime"; // top edge
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(tr.x, tr.y);
  ctx.stroke();
  ctx.strokeStyle = "deepskyblue"; // left edge
  ctx.beginPath();
  ctx.moveTo(tl.x, tl.y);
  ctx.lineTo(bl.x, bl.y);
  ctx.stroke();

  ctx.font = "bold 18px sans-serif";
  ctx.fillStyle = "magenta";
  ctx.fillText("TL", tl.x, tl.y);
  ctx.fillText("TR", tr.x, tr.y);
  ctx.fillText("BL", bl.x, bl.y);
  ctx.fillText(`v${loc.version} · ${loc.dimension}×${loc.dimension}`, 10, 24);
}

/** A dot where every module was read: red = dark, green = light */
export function drawSamplePoints(canvas: HTMLCanvasElement, grid: BitMatrix, toImage: ModuleToImage) {
  const ctx = canvas.getContext("2d")!;
  for (let row = 0; row < grid.height; row++) {
    for (let col = 0; col < grid.width; col++) {
      const p = toImage(col, row);
      ctx.fillStyle = grid.get(col, row) ? "red" : "lime";
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }
  }
}

export function drawPoint(canvas: HTMLCanvasElement, p: Point, color: string) {
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
  ctx.fill();
}

/** The straightened grid, enlarged, in the top-right corner. `highlight` cells are tinted blue. */
export function drawGrid(canvas: HTMLCanvasElement, grid: BitMatrix, scale = 4, highlight: [number, number][] = []) {
  const ctx = canvas.getContext("2d")!;
  const size = grid.width * scale;
  const x0 = canvas.width - size - 2 * scale - 8;
  const y0 = 8;
  ctx.fillStyle = "white";
  ctx.fillRect(x0, y0, size + 4 * scale, size + 4 * scale); // with a 2-module white margin
  ctx.fillStyle = "black";
  for (let row = 0; row < grid.height; row++)
    for (let col = 0; col < grid.width; col++)
      if (grid.get(col, row)) ctx.fillRect(x0 + (col + 2) * scale, y0 + (row + 2) * scale, scale, scale);
  ctx.fillStyle = "rgb(0 120 255 / 0.5)";
  for (const [col, row] of highlight) ctx.fillRect(x0 + (col + 2) * scale, y0 + (row + 2) * scale, scale, scale);
}

/** A line of status text, below the version label */
export function drawStatus(canvas: HTMLCanvasElement, text: string, ok: boolean) {
  const ctx = canvas.getContext("2d")!;
  ctx.font = "bold 18px sans-serif";
  ctx.fillStyle = ok ? "magenta" : "red";
  ctx.fillText(text, 10, 48);
}

/** Wrong modules in the two timing patterns: 0 means the grid lines up */
export function timingErrors(grid: BitMatrix): number {
  let errors = 0;
  for (let i = 8; i < grid.width - 8; i++) {
    const expectDark = i % 2 === 0;
    if (grid.get(i, 6) !== expectDark) errors++;
    if (grid.get(6, i) !== expectDark) errors++;
  }
  return errors;
}
