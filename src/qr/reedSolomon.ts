// Part 8: Reed–Solomon error correction over GF(256), as used by QR codes.
//
// GF(256) ("Galois field") is arithmetic on bytes where:
//   - addition and subtraction are both XOR
//   - multiplication is polynomial multiplication modulo 0x11D (x⁸ + x⁴ + x³ + x² + 1)
// Every non-zero byte is a power of α = 2, so multiplying is adding exponents:
// a · b = α^(log a + log b). We precompute the EXP and LOG tables once.
//
// A block of n bytes is read as the coefficients of a polynomial (first byte = highest
// power). The encoder chose the EC bytes so that this polynomial is zero at
// α⁰, α¹, …, α^(nsym-1). If some bytes got damaged, those values ("syndromes") aren't
// zero any more, and from them we can work out where the errors are and their values.
// With nsym EC bytes, up to nsym / 2 wrong bytes can be fixed.

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]; // so mul() never needs a % 255
}

const mul = (a: number, b: number) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);
const div = (a: number, b: number) => (a === 0 ? 0 : EXP[(LOG[a] + 255 - LOG[b]) % 255]);
const inverse = (a: number) => EXP[255 - LOG[a]];
/** α^p, for any integer p */
const alphaPow = (p: number) => EXP[((p % 255) + 255) % 255];

/** Evaluate a polynomial stored highest power first (Horner's method) */
function evalHigh(p: ArrayLike<number>, x: number): number {
  let y = 0;
  for (let i = 0; i < p.length; i++) y = mul(y, x) ^ p[i];
  return y;
}

/** Evaluate a polynomial stored lowest power first */
function evalLow(p: number[], x: number): number {
  let y = 0;
  for (let i = p.length - 1; i >= 0; i--) y = mul(y, x) ^ p[i];
  return y;
}

function syndromes(block: Uint8Array, nsym: number): number[] {
  return Array.from({ length: nsym }, (_, i) => evalHigh(block, alphaPow(i)));
}

/**
 * Berlekamp–Massey: find the shortest "error locator" polynomial Λ(x) (lowest power first)
 * that generates the syndrome sequence. Its roots tell us where the errors are.
 */
function errorLocator(S: number[]): number[] {
  let lambda = [1]; // current Λ
  let prev = [1]; // Λ before the last length change
  let L = 0; // number of errors assumed so far
  let shift = 1; // how many steps since `prev` was saved
  let prevDelta = 1;

  for (let n = 0; n < S.length; n++) {
    // Discrepancy: how far the current Λ is from predicting S[n]
    let delta = S[n];
    for (let i = 1; i <= L; i++) delta ^= mul(lambda[i] ?? 0, S[n - i]);

    if (delta === 0) {
      shift++;
      continue;
    }

    // Λ(x) ← Λ(x) − (delta / prevDelta) · x^shift · prev(x)
    const factor = div(delta, prevDelta);
    const next = lambda.slice();
    for (let i = 0; i < prev.length; i++) {
      next[i + shift] = (next[i + shift] ?? 0) ^ mul(factor, prev[i]);
    }

    if (2 * L <= n) {
      L = n + 1 - L;
      prev = lambda;
      prevDelta = delta;
      shift = 1;
    } else {
      shift++;
    }
    lambda = next;
  }

  while (lambda.length < L + 1) lambda.push(0);
  lambda.length = L + 1;
  return lambda;
}

/**
 * Correct up to nsym / 2 wrong bytes in place.
 * Returns false if the block is too damaged (then the frame is simply skipped).
 */
export function correctErrors(block: Uint8Array, nsym: number): boolean {
  const S = syndromes(block, nsym);
  if (S.every((s) => s === 0)) return true; // no errors at all: the common case

  const lambda = errorLocator(S);
  const errorCount = lambda.length - 1;
  if (errorCount * 2 > nsym) return false;

  // Chien search: byte i (power p = n-1-i) is wrong when Λ(α^-p) = 0
  const n = block.length;
  const positions: number[] = [];
  for (let i = 0; i < n; i++) {
    if (evalLow(lambda, inverse(alphaPow(n - 1 - i))) === 0) positions.push(i);
  }
  if (positions.length !== errorCount) return false; // inconsistent: too many errors

  // Forney: the error value at each position.
  // Ω(x) = S(x) · Λ(x) mod x^nsym, and the value is X · Ω(X⁻¹) / Λ'(X⁻¹).
  const omega = new Array(nsym).fill(0);
  for (let i = 0; i < nsym; i++) {
    for (let j = 0; j <= i && j < lambda.length; j++) omega[i] ^= mul(S[i - j], lambda[j]);
  }
  // Derivative in GF(2^8): even powers vanish, odd powers drop by one
  const lambdaPrime = lambda.slice(1).map((c, i) => (i % 2 === 0 ? c : 0));

  for (const i of positions) {
    const X = alphaPow(n - 1 - i);
    const Xinv = inverse(X);
    const denominator = evalLow(lambdaPrime, Xinv);
    if (denominator === 0) return false;
    block[i] ^= mul(X, div(evalLow(omega, Xinv), denominator));
  }

  // Double-check: a correct fix leaves all syndromes at zero
  return syndromes(block, nsym).every((s) => s === 0);
}
