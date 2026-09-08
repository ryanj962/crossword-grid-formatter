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

export function formatJson(grid: Grid, stats: Stats, warnings: string[]): string {
  return JSON.stringify(
    {
      width: stats.width,
      height: stats.height,
      rows: gridToRows(grid),
      blockCount: stats.blockCount,
      filledCount: stats.filledCount,
      emptyCount: stats.emptyCount,
      symmetric180: stats.symmetric180,
      warnings,
    },
    null,
    2
  );
}
