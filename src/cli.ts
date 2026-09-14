import { readFileSync } from "node:fs";
import process from "node:process";
import { computeStats, normalizeGrids, NormalizeError } from "./grid.js";
import { formatHumanMulti, formatJsonMulti } from "./format.js";

const HELP = `usage: grid-fmt [file] [--json]

Reads one or more crossword grids from FILE (or stdin if omitted) and
prints each back out in a canonical form: block cells as '#', empty
cells as '.', filled cells as an uppercase letter.

A file can hold more than one grid - separate them with two or more
blank lines. A single blank line inside one grid is treated as
copy/paste noise and dropped instead.

  --json    print the normalized grid(s) and stats as JSON instead of
            the human-readable layout
  -h, --help  show this message
`;

function parseArgs(argv: string[]): { file: string | null; json: boolean } {
  let file: string | null = null;
  let json = false;

  for (const arg of argv) {
    if (arg === "--json") {
      json = true;
    } else if (arg === "-h" || arg === "--help") {
      process.stdout.write(HELP);
      process.exit(0);
    } else if (arg.startsWith("-")) {
      process.stderr.write(`unknown flag: ${arg}\n`);
      process.exit(2);
    } else {
      file = arg;
    }
  }

  return { file, json };
}

function readInput(file: string | null): string {
  if (file) return readFileSync(file, "utf8");
  return readFileSync(0, "utf8");
}

function main(): void {
  const { file, json } = parseArgs(process.argv.slice(2));

  let input: string;
  try {
    input = readInput(file);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`could not read input: ${message}\n`);
    process.exit(1);
  }

  try {
    const results = normalizeGrids(input).map((result) => ({
      grid: result.grid,
      stats: computeStats(result.grid),
      warnings: result.warnings,
    }));
    const output = json ? formatJsonMulti(results) : formatHumanMulti(results);
    process.stdout.write(output + "\n");
  } catch (err) {
    if (err instanceof NormalizeError) {
      const location =
        err.gridIndex === undefined
          ? `row ${err.row}, col ${err.col}`
          : `grid ${err.gridIndex}, row ${err.row}, col ${err.col}`;
      process.stderr.write(`${err.message} (${location})\n`);
      process.exit(1);
    }
    throw err;
  }
}

main();
