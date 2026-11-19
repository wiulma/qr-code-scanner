export function toGrayscale({ data, width, height }: ImageData): Uint8Array {
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < gray.length; i++) {
    const r = data[i * 4],
      g = data[i * 4 + 1],
      b = data[i * 4 + 2];
    gray[i] = (r * 77 + g * 150 + b * 29) >> 8; // >> 8 is "divide by 256"
  }
  return gray;
}
