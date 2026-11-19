export class BitMatrix {
  width: number;
  height: number;
  data: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height);
  }

  /** true = dark. Outside the image counts as light (like the white margin) */
  get(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    return this.data[y * this.width + x] === 1;
  }

  set(x: number, y: number, dark: boolean) {
    this.data[y * this.width + x] = dark ? 1 : 0;
  }
}
