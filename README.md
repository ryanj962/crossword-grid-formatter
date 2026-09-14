# crossword-grid-formatter

Grid text for crosswords tends to arrive messy: block squares typed as
`#`, `X`, `*`, or a literal `■` depending on who made the puzzle,
ragged rows where someone forgot a trailing block, trailing spaces
left behind by an editor. This is a small formatter that reads that
kind of input and prints back a canonical grid - one character set,
consistent row widths, plus basic stats (dimensions, block count,
whether the grid has standard 180-degree rotational symmetry).

It's a CLI, not a library, and it doesn't try to solve or fill grids -
just normalize whatever text you feed it.

## Usage

Given a messy file `messy.txt`:

```
#..#....#
X.......X
..###....
....X..#.
```

```
$ node dist/cli.js messy.txt
#..#....#
#.......#
..###....
....#..#.

9x4
9 block, 0 filled, 27 empty
180-degree symmetric: no
```

Every block variant (`#`, `X`, `x`, `■`, `*`, `@`) is normalized to
`#`. Empty-but-open cells (`.`, `_`, `-`, a bare space) become `.`.
Letters are uppercased in place.

With `--json`:

```
$ node dist/cli.js messy.txt --json
{
  "width": 9,
  "height": 4,
  "rows": [
    "#..#....#",
    "#.......#",
    "..###....",
    "....#..#."
  ],
  "blockCount": 9,
  "filledCount": 0,
  "emptyCount": 27,
  "symmetric180": false,
  "warnings": []
}
```

Reading from stdin works the same way:

```
$ cat messy.txt | node dist/cli.js --json
```

## Multiple grids in one file

A file can hold more than one grid. Separate them with two or more
blank lines:

```
#.#
...
#.#


X..
...
.X.
```

```
$ node dist/cli.js multi.txt
grid 1 of 2:

#.#
...
#.#

3x3
4 block, 0 filled, 5 empty
180-degree symmetric: yes

----------------------------------------

grid 2 of 2:

#..
...
.#.

3x3
2 block, 0 filled, 7 empty
180-degree symmetric: no
```

A *single* blank line inside a grid's rows is left alone - it's
treated as copy/paste noise and dropped, the same as a lone blank
line at the top or bottom of the file. Only a run of two or more
blank lines counts as the gap between grids.

With `--json`, a file with exactly one grid still prints the plain
object shown above. A file with more than one grid prints a JSON
array of those same objects, in order.

If a row is shorter than the widest row in the grid, it gets padded
out with block cells and a warning is added to the output (visible in
both modes) rather than failing outright - a truncated row is almost
always a copy/paste accident, not an intentionally irregular shape.
Any character outside the recognized block/empty/letter sets is a
hard error, since silently guessing what it meant would defeat the
point of a formatter.

## Building

No third-party dependencies - just the TypeScript compiler and
Node's standard library.

```
npx tsc
node dist/cli.js some-grid.txt
```

## Testing

Uses Node's built-in test runner, no test framework dependency:

```
npm test
```

## Status

Early skeleton: normalization, multi-grid files, and the two output
modes work, with unit test coverage for character mapping, the
padding and blank-line edge cases, and grid splitting. See the issue
tracker for what's planned next.
