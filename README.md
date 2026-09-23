# HKUST Course Explorer

## Setup and run

```bash
npm install
npm run build:data
npm start
```

For a native development client, use `npm run android` or `npm run ios`. The web
target is available with `npm run web`. The checked-in database is already built,
so `npm run build:data` is only needed after changing either source dataset.

The bundled database uses SQLite `PRAGMA user_version = 2` and the app opens it
as `courses-2026-09-v2.db` with asset overwrite enabled, preventing stale local
copies after a dataset rebuild. MMKV favourites require an Expo development
build; Expo Go cannot load the native MMKV module.

## Platforms tested

The app is structured for Expo SDK 55 and was tested with the Expo web target and
an Android development build. The same SQLite asset/provider path is used by iOS.

## Architecture and state management

The app follows one-way layers:

```text
screens -> hooks -> services/courses -> expo-sqlite
    \-> components/prereq -> lib/search | lib/prereq | theme registry
build scripts -> generated SQLite + graph assets
```

`SQLiteProvider` owns the database handle; screens do not hold dataset state in
React Context. Hooks own loading/error/stale-request state, services own SQL and
graph-asset access, and `app/lib` contains pure parser, search-intent, and
view-model logic. `services/courses/prereqGraph.ts` is the only module that reads
`prereq-graph.json`.

The only shared UI state is cross-cutting state: `FavouritesContext` persists
course codes in MMKV, while the theme registry persists the selected palette in
MMKV. Browse, Favourites, and sections use `@shopify/flash-list`
instead of the demo's `FlatList`, because the catalog contains about 4,000
canonical courses and up to tens of thousands of section rows.

## Data preprocessing

`courses.json` is the catalog input. The schedule slice is fetched from the
Hugging Face `ust-archive/schedule` dataset, config `classes`, with this exact
command:

```bash
python -c "from huggingface_hub import hf_hub_download; print(hf_hub_download(repo_id='ust-archive/schedule', repo_type='dataset', revision='refs/convert/parquet', filename='classes/train/0000.parquet'))"
```

The reproducible trimming command is:

```bash
python scripts/fetch-schedule.py
```

It performs the download above, reads the term codes and every catalog `id` from
`courses.json`, then keeps only matching schedule rows and writes
`assets/data/schedule.json`. This is the command used to reproduce the checked-in
schedule asset.
The script uses `pyarrow` and `huggingface_hub`; install them with
`pip install huggingface_hub pyarrow` when rebuilding from scratch.

`npm run build:data` then:

1. Groups catalog rows by human-facing `prefix + " " + number`, retains the most
   recent `term_num` row as the canonical display record, and preserves every
   offered term in `course_terms`.
2. Joins schedule rows by the stable catalog `id` (`schedule.course_id`) and
   `term_code`, not by row position or title.
3. Builds `assets/data/courses.db` (currently about 51 MB) with indexed
   `courses`, `course_terms`, and `sections` tables plus the `courses_fts` FTS5
   table over code, title, and description. FTS rows use the matching
   `courses.rowid`.
4. Parses prerequisite, corequisite, and exclusion fields and writes
   `assets/data/prereq-graph.json`, including reverse `unlockedBy` edges.
5. Writes `assets/data/dataset-meta.json` for the Settings screen. The generated
   database is about 51 MB after external-content FTS and VACUUM; the build
   prints final artifact sizes so rebuilds can detect accidental growth.

All parsing and SQLite construction happen in the Node build script. No catalog
preprocessing runs on-device.

## Prerequisite parsing and traversal

`app/lib/parsePrereq.ts` is a pure recursive-descent parser. It normalizes course
tokens matching `/[A-Z]{2,4}\s?\d{3,4}[A-Z]?/`, treats parentheses and square
brackets as equivalent groups, preserves explicit AND/OR grouping, and attaches
grade and “prior to” qualifiers to course nodes. Unresolvable prose remains a
`text` leaf rather than being guessed as a course.

The parser produces an AST. `PrerequisiteTree` renders its AND/OR semantics
(`All of` / `One of`) with lazy node expansion, an ancestor `Set`, cycle leaves,
text leaves, missing nodes, and a depth cap of eight. Unlocks are intentionally
not another tree: `UnlockList` renders the flat direct dependant list from
`unlockedBy`. The explorer selects one component at a time, and Course Detail
shows separate Requires and Unlocks sections.

## Search and themes

Search first classifies normalized input. A known one-to-four-letter course
prefix such as `comp` uses indexed `courses.prefix`; a prefix plus one-to-four
digits such as `comp4`, `COMP 42`, or `comp4211` uses indexed `code_compact`.
One- and two-letter inputs remain text search because they are too ambiguous to
identify a course family. Other text uses FTS over title and description with
deterministic exact-code, title-prefix, title-word, description, and code
tie-breaking tiers. All plans apply term/department filters and limit-plus-one
pagination.

The theme registry defines Light, Dark, Crimson, Pastel, Sepia, and Midnight,
plus System selection. Each palette shares one `ColorTokens` interface,
including semantic seat-status foreground/background pairs. Settings exposes
accessible radio options with live swatches; the legacy `ignite.themeScheme`
light/dark value is migrated without data loss. Every palette is covered by a
WCAG AA contrast test.

The persisted theme mapping is `youtube` (legacy storage value) -> `crimson`;
the legacy value is accepted only during migration and is never presented as a
current theme name.

| Current theme | Former identifier | Minimum tested contrast |
| ------------- | ----------------- | ----------------------: |
| Light         | light             |                  6.58:1 |
| Dark          | dark              |                  7.66:1 |
| Crimson       | youtube           |                  6.47:1 |
| Pastel        | pastel            |                  6.49:1 |
| Sepia         | sepia             |                  6.49:1 |
| Midnight      | midnight          |                  6.48:1 |

## Assumptions and limitations

- `id` is treated as the stable cross-term join key, even though it is reused
  across catalog rows; `prefix + number` is the human-facing dedupe key.
- The catalog snapshot contains four terms: 2025-26 Winter, 2025-26 Spring,
  2025-26 Summer, and 2026-27 Fall.
- The parser intentionally does not invent meaning for prose such as
  “any COMP courses of 3000-level or above”; it displays that text as
  unresolvable information.
- Schedule availability is section-level. A course is open if a matching section
  is open, near-full when the relevant enrollment/capacity ratio reaches 0.9,
  and full/closed otherwise. Missing schedule data is shown as unknown.
- CILOs, schedules, reservations, and similar nested fields remain JSON in the
  SQLite rows so the build can preserve source detail without device-side
  preprocessing.

## Optional features implemented

Three optional features were selected because they improve the core explorer
without adding another backend: MMKV favourites for a useful return path,
multiple persisted themes for accessibility and personalization, and the
reverse “what this course unlocks” view for planning future coursework.

## Validation

```bash
npm test -- --runInBand
npm run compile
npm run depcruise
npm run test:maestro
```

The Maestro flow in `.maestro/flows/CourseExplorer.yaml` covers searching
`comp4211`, department filtering, opening detail, entering Requires, expanding
prerequisites, and navigating to the linked course. It requires an installed
Android/iOS development build and a connected emulator or simulator.
