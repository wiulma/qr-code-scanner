import { BitMatrix } from "./BitMatrix";
// Tables from ISO/IEC 18004 for versions 1–10 (the range this decoder supports).

type VersionTable = { alignment: number[]; ec: Record<ECLevel, ECBlocks> };

const blocks = (ecPerBlock: number, ...groups: BlockGroup[]): ECBlocks => ({ ecPerBlock, groups });

const VERSIONS: VersionTable[] = [
  /* 1 */ {
    alignment: [],
    ec: { L: blocks(7, [1, 19]), M: blocks(10, [1, 16]), Q: blocks(13, [1, 13]), H: blocks(17, [1, 9]) },
  },
  /* 2 */ {
    alignment: [6, 18],
    ec: { L: blocks(10, [1, 34]), M: blocks(16, [1, 28]), Q: blocks(22, [1, 22]), H: blocks(28, [1, 16]) },
  },
  /* 3 */ {
    alignment: [6, 22],
    ec: { L: blocks(15, [1, 55]), M: blocks(26, [1, 44]), Q: blocks(18, [2, 17]), H: blocks(22, [2, 13]) },
  },
  /* 4 */ {
    alignment: [6, 26],
    ec: { L: blocks(20, [1, 80]), M: blocks(18, [2, 32]), Q: blocks(26, [2, 24]), H: blocks(16, [4, 9]) },
  },
  /* 5 */ {
    alignment: [6, 30],
    ec: {
      L: blocks(26, [1, 108]),
      M: blocks(24, [2, 43]),
      Q: blocks(18, [2, 15], [2, 16]),
      H: blocks(22, [2, 11], [2, 12]),
    },
  },
  /* 6 */ {
    alignment: [6, 34],
    ec: { L: blocks(18, [2, 68]), M: blocks(16, [4, 27]), Q: blocks(24, [4, 19]), H: blocks(28, [4, 15]) },
  },
  /* 7 */ {
    alignment: [6, 22, 38],
    ec: {
      L: blocks(20, [2, 78]),
      M: blocks(18, [4, 31]),
      Q: blocks(18, [2, 14], [4, 15]),
      H: blocks(26, [4, 13], [1, 14]),
    },
  },
  /* 8 */ {
    alignment: [6, 24, 42],
    ec: {
      L: blocks(24, [2, 97]),
      M: blocks(22, [2, 38], [2, 39]),
      Q: blocks(22, [4, 18], [2, 19]),
      H: blocks(26, [4, 14], [2, 15]),
    },
  },
  /* 9 */ {
    alignment: [6, 26, 46],
    ec: {
      L: blocks(30, [2, 116]),
      M: blocks(22, [3, 36], [2, 37]),
      Q: blocks(20, [4, 16], [4, 17]),
      H: blocks(24, [4, 12], [4, 13]),
    },
  },
  /* 10 */ {
    alignment: [6, 28, 50],
    ec: {
      L: blocks(18, [2, 68], [2, 69]),
      M: blocks(26, [4, 43], [1, 44]),
      Q: blocks(24, [6, 19], [2, 20]),
      H: blocks(28, [6, 15], [2, 16]),
    },
  },
];

export const MAX_VERSION = VERSIONS.length;

export function ecBlocks(version: number, level: ECLevel): ECBlocks {
  return VERSIONS[version - 1].ec[level];
}

/** Total codewords (data + EC) in a version: the same for every EC level */
export function totalCodewords(version: number): number {
  const { ecPerBlock, groups } = ecBlocks(version, "L");
  return groups.reduce((sum, [count, data]) => sum + count * (data + ecPerBlock), 0);
}

const functionMasks = new Map<number, BitMatrix>();

/**
 * Which modules are NOT data: finders + separators + format info, timing patterns,
 * alignment patterns, the dark module and (version 7+) version info. Cached per version.
 */
export function functionMask(version: number): BitMatrix {
  const cached = functionMasks.get(version);
  if (cached) return cached;

  const d = 17 + 4 * version;
  const m = new BitMatrix(d, d);
  const fill = (col: number, row: number, w: number, h: number) => {
    for (let r = row; r < row + h; r++) for (let c = col; c < col + w; c++) m.set(c, r, true);
  };

  fill(0, 0, 9, 9); // top-left finder, separator, format info
  fill(d - 8, 0, 8, 9); // top-right finder, separator, format info
  fill(0, d - 8, 9, 8); // bottom-left finder, separator, format info, dark module
  fill(6, 0, 1, d); // vertical timing pattern
  fill(0, 6, d, 1); // horizontal timing pattern

  const pos = VERSIONS[version - 1].alignment;
  const last = pos[pos.length - 1];
  for (const y of pos) {
    for (const x of pos) {
      // Skip the three positions that would overlap a finder pattern
      if ((x === 6 && y === 6) || (x === 6 && y === last) || (x === last && y === 6)) continue;
      fill(x - 2, y - 2, 5, 5);
    }
  }

  if (version >= 7) {
    fill(d - 11, 0, 3, 6); // version info, top-right
    fill(0, d - 11, 6, 3); // version info, bottom-left
  }

  functionMasks.set(version, m);
  return m;
}
