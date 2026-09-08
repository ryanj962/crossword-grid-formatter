import { readFileSync } from "node:fs";
import process from "node:process";
import { computeStats, normalizeGrid, NormalizeError } from "./grid.js";
import { formatHuman, formatJson } from "./format.js";

const HELP = `usage: grid-fmt [file] [--json]

Reads a crossword grid from FILE (or stdin if omitted) and prints it
back out in a canonical form: block cells as '#', empty cells as '.',
filled cells as an uppercase letter.

  --json    print the normalized grid and stats as JSON instead of
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
    const { grid, warnings } = normalizeGrid(input);
    const stats = computeStats(grid);
    const output = json
      ? formatJson(grid, stats, warnings)
      : formatHuman(grid, stats, warnings);
    process.stdout.write(output + "\n");
  } catch (err) {
    if (err instanceof NormalizeError) {
      process.stderr.write(`${err.message} (row ${err.row}, col ${err.col})\n`);
      process.exit(1);
    }
    throw err;
  }
}

main();
