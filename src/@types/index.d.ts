declare class BarcodeDetector {
  constructor(options?: { formats: string[] });
  static getSupportedFormats(): Promise<string[]>;
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

type Detect = (video: HTMLVideoElement) => Promise<string | null>;

type QRLocation = {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  moduleSize: number;
  version: number;
  dimension: number;
};

type FinderPattern = { x: number; y: number; moduleSize: number; count: number };

type ModuleToImage = (col: number, row: number) => Point;

type Anchor = { point: Point; module: number };

type Point = { x: number; y: number };

type Block = { dataLength: number; bytes: Uint8Array };

type GridResult = { text: string; format: FormatInfo; correctedBlocks: number };

type ECLevel = "L" | "M" | "Q" | "H";
type FormatInfo = { ecLevel: ECLevel; mask: number; distance: number };

type Matrix = number[];

/** 4 corners in order: top-left, top-right, bottom-right, bottom-left */
type Quad = [Point, Point, Point, Point];

/** `count` blocks of `dataCodewords` data bytes each */
type BlockGroup = [count: number, dataCodewords: number];

/** How the data is split into blocks, and how many EC bytes each block has */
type ECBlocks = { ecPerBlock: number; groups: BlockGroup[] };
