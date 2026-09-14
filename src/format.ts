import type { Grid, Stats } from "./grid.js";

function cellChar(cell: Grid["rows"][number][number]): string {
  if (cell.type === "block") return "#";
  if (cell.type === "empty") return ".";
  return cell.letter;
}

export function gridToRows(grid: Grid): string[] {
  return grid.rows.map((row) => row.map(cellChar).join(""));
}

export function formatHuman(grid: Grid, stats: Stats, warnings: string[]): string {
  const lines = gridToRows(grid);
  const summary = [
    `${stats.width}x${stats.height}`,
    `${stats.blockCount} block, ${stats.filledCount} filled, ${stats.emptyCount} empty`,
    `180-degree symmetric: ${stats.symmetric180 ? "yes" : "no"}`,
  ];

  const out = [...lines, "", ...summary];

  if (warnings.length > 0) {
    out.push("", "warnings:");
    for (const w of warnings) out.push(`  - ${w}`);
  }

  return out.join("\n");
}

function toJsonResult(grid: Grid, stats: Stats, warnings: string[]) {
  return {
    width: stats.width,
    height: stats.height,
    rows: gridToRows(grid),
    blockCount: stats.blockCount,
    filledCount: stats.filledCount,
    emptyCount: stats.emptyCount,
    symmetric180: stats.symmetric180,
    warnings,
  };
}

export function formatJson(grid: Grid, stats: Stats, warnings: string[]): string {
  return JSON.stringify(toJsonResult(grid, stats, warnings), null, 2);
}

export interface GridResult {
  grid: Grid;
  stats: Stats;
  warnings: string[];
}

// A file with exactly one grid keeps the plain single-grid shape, so
// existing single-grid output and scripts parsing it don't change.
// Only a file with more than one grid pays for the array wrapper.
export function formatJsonMulti(results: GridResult[]): string {
  if (results.length === 1) {
    const [r] = results;
    return formatJson(r!.grid, r!.stats, r!.warnings);
  }
  return JSON.stringify(
    results.map((r) => toJsonResult(r.grid, r.stats, r.warnings)),
    null,
    2
  );
}

export function formatHumanMulti(results: GridResult[]): string {
  if (results.length === 1) {
    const [r] = results;
    return formatHuman(r!.grid, r!.stats, r!.warnings);
  }
  return results
    .map(
      (r, i) =>
        `grid ${i + 1} of ${results.length}:\n\n${formatHuman(r.grid, r.stats, r.warnings)}`
    )
    .join("\n\n" + "-".repeat(40) + "\n\n");
}
