import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeStats,
  normalizeGrid,
  normalizeGrids,
  splitGridSections,
  NormalizeError,
} from "./grid.js";
import { gridToRows } from "./format.js";

test("recognizes every block character variant", () => {
  const { grid } = normalizeGrid("#X x ■ * @".replace(/ /g, ""));
  for (const cell of grid.rows[0]!) {
    assert.equal(cell.type, "block");
  }
});

test("recognizes every empty character variant", () => {
  // the space has to lead, not trail - trailing whitespace on a line
  // is stripped before parsing.
  const { grid } = normalizeGrid(" ._-");
  for (const cell of grid.rows[0]!) {
    assert.equal(cell.type, "empty");
  }
});

test("uppercases filled letters and preserves them", () => {
  const { grid } = normalizeGrid("aBc");
  const letters = grid.rows[0]!.map((cell) =>
    cell.type === "filled" ? cell.letter : null
  );
  assert.deepEqual(letters, ["A", "B", "C"]);
});

test("rejects an unrecognized character with its position", () => {
  try {
    normalizeGrid("..\n.?.");
    assert.fail("expected normalizeGrid to throw");
  } catch (err) {
    assert.ok(err instanceof NormalizeError);
    if (err instanceof NormalizeError) {
      assert.equal(err.row, 2);
      assert.equal(err.col, 2);
    }
  }
});

test("rejects input with no grid content", () => {
  assert.throws(() => normalizeGrid("\n\n"), NormalizeError);
});

test("pads a short row with block cells and warns", () => {
  const { grid, warnings } = normalizeGrid("###\n#\n###");
  assert.equal(grid.width, 3);
  assert.deepEqual(gridToRows(grid), ["###", "###", "###"]);
  assert.ok(
    warnings.some((w) => w.includes("row 2 was 1 cells wide, padded to 3"))
  );
});

test("does not warn about a row that already matches the widest width", () => {
  const { warnings } = normalizeGrid("###\n###");
  assert.equal(warnings.length, 0);
});

test("strips trailing whitespace before measuring row width", () => {
  const { grid } = normalizeGrid("###   \n###");
  assert.equal(grid.width, 3);
});

test("drops interior blank lines with a warning but leaves surrounding rows intact", () => {
  const { grid, warnings } = normalizeGrid("###\n\n###");
  assert.equal(grid.height, 2);
  assert.ok(warnings.some((w) => w.includes("blank line 2 removed")));
});

test("drops a leading blank line silently", () => {
  const { grid, warnings } = normalizeGrid("\n###\n###");
  assert.equal(grid.height, 2);
  assert.equal(warnings.length, 0);
});

test("drops a single trailing blank line silently", () => {
  const { grid, warnings } = normalizeGrid("###\n###\n");
  assert.equal(grid.height, 2);
  assert.equal(warnings.length, 0);
});

test("computeStats counts cell types and detects 180-degree symmetry", () => {
  const { grid } = normalizeGrid("#.#\n...\n#.#");
  const stats = computeStats(grid);
  assert.equal(stats.blockCount, 4);
  assert.equal(stats.emptyCount, 5);
  assert.equal(stats.filledCount, 0);
  assert.equal(stats.symmetric180, true);
});

test("computeStats detects asymmetric grids", () => {
  // a block at (0,0) with no matching block at its 180-degree
  // opposite (2,2) - true rotational symmetry requires paired blocks.
  const { grid } = normalizeGrid("#..\n...\n.#.");
  const stats = computeStats(grid);
  assert.equal(stats.symmetric180, false);
});

test("splitGridSections keeps a single grid as one section", () => {
  const sections = splitGridSections("###\n#.#\n###");
  assert.deepEqual(sections, ["###\n#.#\n###"]);
});

test("splitGridSections treats two or more blank lines as a grid boundary", () => {
  const sections = splitGridSections("###\n#.#\n\n\n@@@\n@.@");
  assert.deepEqual(sections, ["###\n#.#", "@@@\n@.@"]);
});

test("splitGridSections leaves a single blank line inside a section alone", () => {
  const sections = splitGridSections("###\n\n#.#");
  assert.deepEqual(sections, ["###\n\n#.#"]);
});

test("splitGridSections drops leading and trailing blank runs", () => {
  const sections = splitGridSections("\n\n###\n#.#\n\n\n");
  assert.deepEqual(sections, ["###\n#.#"]);
});

test("normalizeGrids parses each section of a multi-grid file", () => {
  const results = normalizeGrids("##\n..\n\n\n#.\n.#");
  assert.equal(results.length, 2);
  assert.deepEqual(gridToRows(results[0]!.grid), ["##", ".."]);
  assert.deepEqual(gridToRows(results[1]!.grid), ["#.", ".#"]);
});

test("normalizeGrids tags an error with the failing grid's index", () => {
  try {
    normalizeGrids("##\n..\n\n\n#?\n.#");
    assert.fail("expected normalizeGrids to throw");
  } catch (err) {
    assert.ok(err instanceof NormalizeError);
    if (err instanceof NormalizeError) {
      assert.equal(err.gridIndex, 2);
      assert.equal(err.row, 1);
      assert.equal(err.col, 2);
    }
  }
});
