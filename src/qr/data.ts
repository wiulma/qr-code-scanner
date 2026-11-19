// Part 9: turn the corrected data bytes into text.
//
// The data is a sequence of segments. Each one starts with a 4-bit mode, then a
// character count, then the characters packed as tightly as that mode allows:
//   numeric       3 digits in 10 bits
//   alphanumeric  2 characters in 11 bits (0-9, A-Z, space and $%*+-./:)
//   byte          8 bits per byte (UTF-8 in practice: URLs, Wi-Fi configs, …)
//   kanji         13 bits per Shift JIS character
// Mode 0000 (or running out of bits) ends the message.

class BitReader {
  private bytes: Uint8Array;
  private offset = 0; // in bits

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  get available(): number {
    return this.bytes.length * 8 - this.offset;
  }

  read(n: number): number {
    if (n > this.available) throw new Error("Not enough bits");
    let value = 0;
    for (let i = 0; i < n; i++, this.offset++) {
      const bit = (this.bytes[this.offset >> 3] >> (7 - (this.offset & 7))) & 1;
      value = (value << 1) | bit;
    }
    return value;
  }
}

const MODE_TERMINATOR = 0b0000;
const MODE_NUMERIC = 0b0001;
const MODE_ALPHANUMERIC = 0b0010;
const MODE_STRUCTURED_APPEND = 0b0011;
const MODE_BYTE = 0b0100;
const MODE_FNC1_FIRST = 0b0101;
const MODE_ECI = 0b0111;
const MODE_KANJI = 0b1000;
const MODE_FNC1_SECOND = 0b1001;

const ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

/** The character count field is longer in bigger versions */
function countBits(mode: number, version: number): number {
  const small = version <= 9;
  switch (mode) {
    case MODE_NUMERIC:
      return small ? 10 : 12;
    case MODE_ALPHANUMERIC:
      return small ? 9 : 11;
    case MODE_BYTE:
      return small ? 8 : 16;
    case MODE_KANJI:
      return small ? 8 : 10;
    default:
      throw new Error(`No count for mode ${mode}`);
  }
}

function readNumeric(r: BitReader, count: number): string {
  let out = "";
  for (; count >= 3; count -= 3) out += r.read(10).toString().padStart(3, "0");
  if (count === 2) out += r.read(7).toString().padStart(2, "0");
  if (count === 1) out += r.read(4).toString();
  return out;
}

function readAlphanumeric(r: BitReader, count: number): string {
  let out = "";
  for (; count >= 2; count -= 2) {
    const v = r.read(11);
    out += ALPHANUMERIC[Math.floor(v / 45)] + ALPHANUMERIC[v % 45];
  }
  if (count === 1) out += ALPHANUMERIC[r.read(6)];
  return out;
}

function readBytes(r: BitReader, count: number): Uint8Array {
  const bytes = new Uint8Array(count);
  for (let i = 0; i < count; i++) bytes[i] = r.read(8);
  return bytes;
}

function bytesToText(bytes: Uint8Array): string {
  // The standard's default is ISO-8859-1, but almost every generator writes UTF-8.
  // Try UTF-8 strictly first; if it isn't valid UTF-8, fall back to Latin-1.
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("latin1").decode(bytes);
  }
}

function readKanji(r: BitReader, count: number): string {
  const bytes = new Uint8Array(count * 2);
  for (let i = 0; i < count; i++) {
    const v = r.read(13);
    let sjis = (Math.floor(v / 0xc0) << 8) | v % 0xc0;
    sjis += sjis < 0x1f00 ? 0x8140 : 0xc140;
    bytes[i * 2] = sjis >> 8;
    bytes[i * 2 + 1] = sjis & 0xff;
  }
  return new TextDecoder("shift_jis").decode(bytes);
}

/** ECI: a 1–3 byte number that selects a character set. We only need to skip it. */
function skipECI(r: BitReader) {
  const first = r.read(8);
  if ((first & 0x80) === 0) return;
  if ((first & 0xc0) === 0x80) r.read(8);
  else r.read(16);
}

export function decodeData(bytes: Uint8Array, version: number): string | null {
  const r = new BitReader(bytes);
  let text = "";

  try {
    while (r.available >= 4) {
      const mode = r.read(4);
      switch (mode) {
        case MODE_TERMINATOR:
          return text;
        case MODE_NUMERIC:
          text += readNumeric(r, r.read(countBits(mode, version)));
          break;
        case MODE_ALPHANUMERIC:
          text += readAlphanumeric(r, r.read(countBits(mode, version)));
          break;
        case MODE_BYTE:
          text += bytesToText(readBytes(r, r.read(countBits(mode, version))));
          break;
        case MODE_KANJI:
          text += readKanji(r, r.read(countBits(mode, version)));
          break;
        case MODE_ECI:
          skipECI(r);
          break;
        case MODE_STRUCTURED_APPEND:
          r.read(16); // part i of n + parity: we only decode single codes
          break;
        case MODE_FNC1_FIRST:
          break;
        case MODE_FNC1_SECOND:
          r.read(8);
          break;
        default:
          return null; // not a valid mode: wrong mask or a misread
      }
    }
  } catch {
    return null; // a count pointed past the end of the data
  }
  return text;
}
