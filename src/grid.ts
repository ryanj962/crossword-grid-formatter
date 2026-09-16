// Canonical representation of a crossword grid, plus the parser that
// turns messy hand-typed grid text into it.

export type Cell =
  | { type: "block" }
  | { type: "empty" }
  | { type: "filled"; letter: string };

export interface Grid {
  width: number;
  height: number;
  rows: Cell[][];
}

export interface Stats {
  width: number;
  height: number;
  blockCount: number;
  filledCount: number;
  emptyCount: number;
  symmetric180: boolean;
}

export class NormalizeError extends Error {
  constructor(
    message: string,
    readonly row: number,
    readonly col: number,
    // set when the error came from a specific grid within a multi-grid
    // file, so the message can point at the right one.
    readonly gridIndex?: number
  ) {
    super(message);
    this.name = "NormalizeError";
  }
}

// Characters people actually type for a block square, collected from
// puzzles seen in the wild: hash, letter X, a filled block glyph, an
// asterisk, an at-sign.
const BLOCK_CHARS = new Set(["#", "X", "x", "■", "*", "@"]);

// Characters for "this cell exists but has no letter yet".
const EMPTY_CHARS = new Set([".", "_", "-", " "]);

function classifyChar(ch: string, row: number, col: number): Cell {
  if (BLOCK_CHARS.has(ch)) return { type: "block" };
  if (EMPTY_CHARS.has(ch)) return { type: "empty" };
  if (/[A-Za-z]/.test(ch)) return { type: "filled", letter: ch.toUpperCase() };
  throw new NormalizeError(
    `unrecognized character ${JSON.stringify(ch)} in grid`,
    row,
    col
  );
}

export interface NormalizeResult {
  grid: Grid;
  warnings: string[];
}

// Turns raw grid text into a Grid. Two normalization rules worth
// knowing about because they're lossy:
//
//   1. Trailing whitespace on a line is stripped before parsing, so it
//      can't be used to mean "trailing empty cells" - use '.' for that.
//   2. Ragged rows (shorter than the widest row) are padded out with
//      block cells rather than rejected, since a truncated row is
//      almost always a copy/paste artifact, not an intentional shape.
export function normalizeGrid(input: string): NormalizeResult {
  const warnings: string[] = [];

  const rawLines = input.split(/\r\n|\r|\n/).map((line) => line.replace(/\s+$/, ""));

  // Drop leading/trailing/interior blank lines - blank lines never
  // carry grid content, only ever show up from copy/paste noise.
  const lines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]!;
    if (line.length === 0) {
      if (i > 0 && i < rawLines.length - 1) {
        warnings.push(`blank line ${i + 1} removed`);
      }
      continue;
    }
    lines.push(line);
  }

  if (lines.length === 0) {
    throw new NormalizeError("input has no grid content", 0, 0);
  }

  const width = Math.max(...lines.map((line) => line.length));

  const rows: Cell[][] = lines.map((line, rowIndex) => {
    let padded = line;
    if (padded.length < width) {
      warnings.push(
        `row ${rowIndex + 1} was ${padded.length} cells wide, padded to ${width} with block cells`
      );
      padded = padded + "#".repeat(width - padded.length);
    }
    return Array.from(padded).map((ch, colIndex) =>
      classifyChar(ch, rowIndex + 1, colIndex + 1)
    );
  });

  return { grid: { width, height: rows.length, rows }, warnings };
}

// Splits a file into the text of each grid it contains. A single blank
// line is left alone here - normalizeGrid already treats a lone blank
// line as copy/paste noise within one grid. A run of two or more blank
// lines is different: that's a deliberate gap, so it's treated as the
// boundary between one grid and the next.
export function splitGridSections(input: string): string[] {
  const rawLines = input.split(/\r\n|\r|\n/).map((line) => line.replace(/\s+$/, ""));

  const sections: string[][] = [[]];
  let blankRun = 0;

  for (const line of rawLines) {
    if (line.length === 0) {
      blankRun++;
      continue;
    }

    if (blankRun >= 2) {
      sections.push([]);
    } else if (blankRun === 1) {
      sections[sections.length - 1]!.push("");
    }
    blankRun = 0;
    sections[sections.length - 1]!.push(line);
  }

  return sections
    .map((lines) => lines.join("\n"))
    .filter((section) => section.length > 0);
}

export function normalizeGrids(input: string): NormalizeResult[] {
  const sections = splitGridSections(input);
  if (sections.length === 0) {
    throw new NormalizeError("input has no grid content", 0, 0);
  }

  return sections.map((section, index) => {
    try {
      return normalizeGrid(section);
    } catch (err) {
      if (err instanceof NormalizeError) {
        throw new NormalizeError(err.message, err.row, err.col, index + 1);
      }
      throw err;
    }
  });
}

export interface ClueNumber {
  number: number;
  row: number;
  col: number;
  across: boolean;
  down: boolean;
}

// Standard crossword numbering: scan the grid in reading order (left to
// right, top to bottom) and hand out the next number to any open cell
// that starts an across and/or down entry of length two or more. A cell
// starts an across entry if its left neighbor is a block (or off the
// grid) and its right neighbor is open, and symmetrically for down.
export function numberClues(grid: Grid): ClueNumber[] {
  const isOpen = (row: number, col: number): boolean =>
    row >= 0 &&
    row < grid.height &&
    col >= 0 &&
    col < grid.width &&
    grid.rows[row]![col]!.type !== "block";

  const clues: ClueNumber[] = [];
  let next = 1;

  for (let row = 0; row < grid.height; row++) {
    for (let col = 0; col < grid.width; col++) {
      if (!isOpen(row, col)) continue;

      const startsAcross = !isOpen(row, col - 1) && isOpen(row, col + 1);
      const startsDown = !isOpen(row - 1, col) && isOpen(row + 1, col);

      if (startsAcross || startsDown) {
        clues.push({
          number: next,
          row: row + 1,
          col: col + 1,
          across: startsAcross,
          down: startsDown,
        });
        next++;
      }
    }
  }

  return clues;
}

export function computeStats(grid: Grid): Stats {
  let blockCount = 0;
  let filledCount = 0;
  let emptyCount = 0;

  for (const row of grid.rows) {
    for (const cell of row) {
      if (cell.type === "block") blockCount++;
      else if (cell.type === "filled") filledCount++;
      else emptyCount++;
    }
  }

  let symmetric180 = true;
  outer: for (let r = 0; r < grid.height; r++) {
    for (let c = 0; c < grid.width; c++) {
      const a = grid.rows[r]![c]!.type === "block";
      const b =
        grid.rows[grid.height - 1 - r]![grid.width - 1 - c]!.type === "block";
      if (a !== b) {
        symmetric180 = false;
        break outer;
      }
    }
  }

  return {
    width: grid.width,
    height: grid.height,
    blockCount,
    filledCount,
    emptyCount,
    symmetric180,
  };
}
