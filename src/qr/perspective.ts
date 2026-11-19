/** 3×3 matrix, row-major: [a, b, c, d, e, f, g, h, i] */

/** Transform mapping the unit square onto `quad` */
function squareToQuad([p0, p1, p2, p3]: Quad): Matrix {
  const dx1 = p1.x - p2.x,
    dx2 = p3.x - p2.x,
    dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y,
    dy2 = p3.y - p2.y,
    dy3 = p0.y - p1.y + p2.y - p3.y;
  const den = dx1 * dy2 - dx2 * dy1;
  const c = (dx3 * dy2 - dx2 * dy3) / den;
  const f = (dx1 * dy3 - dx3 * dy1) / den;
  return [
    p1.x - p0.x + c * p1.x,
    p1.y - p0.y + c * p1.y,
    c,
    p3.x - p0.x + f * p3.x,
    p3.y - p0.y + f * p3.y,
    f,
    p0.x,
    p0.y,
    1,
  ];
}

/** Inverse up to a scale factor: all a homography needs */
function adjugate([a, b, c, d, e, f, g, h, i]: Matrix): Matrix {
  return [
    e * i - f * h,
    c * h - b * i,
    b * f - c * e,
    f * g - d * i,
    a * i - c * g,
    c * d - a * f,
    d * h - e * g,
    b * g - a * h,
    a * e - b * d,
  ];
}

function multiply(m: Matrix, n: Matrix): Matrix {
  const r = new Array(9).fill(0);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) r[i * 3 + j] += m[i * 3 + k] * n[k * 3 + j];
  return r;
}

/** Transform mapping quad `src` onto quad `dst`: src → unit square → dst */
export function quadToQuad(src: Quad, dst: Quad): Matrix {
  return multiply(adjugate(squareToQuad(src)), squareToQuad(dst));
}

export function applyTransform(m: Matrix, u: number, v: number): Point {
  const w = m[2] * u + m[5] * v + m[8];
  return {
    x: (m[0] * u + m[3] * v + m[6]) / w,
    y: (m[1] * u + m[4] * v + m[7]) / w,
  };
}
