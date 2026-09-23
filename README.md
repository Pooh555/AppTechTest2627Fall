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

## Platforms tested

The app is structured for Expo SDK 55 and was tested with the Expo web target and
an Android development build. The same SQLite asset/provider path is used by iOS.

## Architecture and state management

`app/services/courses/CourseRepository.ts` owns all dataset access. Screens receive
the bundled `expo-sqlite` database through `SQLiteProvider` and call plain async
repository functions for search, details, sections, and term/department filters.
The prerequisite graph is a static generated JSON asset loaded by the repository;
the dataset is deliberately not placed in React Context.

The only shared UI state is cross-cutting state: `FavouritesContext` persists
course codes in MMKV, while Ignite's existing `ThemeProvider` persists the light
/dark override in MMKV. Browse, Favourites, and sections use `@shopify/flash-list`
instead of the demo's `FlatList`, because the catalog contains about 4,000
canonical courses and up to tens of thousands of section rows.

## Data preprocessing

`courses.json` is the catalog input. The schedule slice was fetched once from the
Hugging Face `ust-archive/schedule` dataset, config `classes`, with this exact
command:

```bash
python -c "from huggingface_hub import hf_hub_download; print(hf_hub_download(repo_id='ust-archive/schedule', repo_type='dataset', revision='refs/convert/parquet', filename='classes/train/0000.parquet'))"
```

The reproducible trimming command is:

```bash
python scripts/fetch-schedule.py
```

It reads the four `term_code` values and every catalog `id` from `courses.json`,
then keeps only matching schedule rows and writes `assets/data/schedule.json`.
The script uses `pyarrow` and `huggingface_hub`; install them with
`pip install huggingface_hub pyarrow` when rebuilding from scratch.

`npm run build:data` then:

1. Groups catalog rows by human-facing `prefix + " " + number`, retains the most
   recent `term_num` row as the canonical display record, and preserves every
   offered term in `course_terms`.
2. Joins schedule rows by the stable catalog `id` (`schedule.course_id`) and
   `term_code`, not by row position or title.
3. Builds `assets/data/courses.db` with indexed `courses`, `course_terms`, and
   `sections` tables plus the `courses_fts` FTS5 table over code, title, and
   description.
4. Parses prerequisite, corequisite, and exclusion fields and writes
   `assets/data/prereq-graph.json`, including reverse `unlockedBy` edges.
5. Writes `assets/data/dataset-meta.json` for the Settings screen.

All parsing and SQLite construction happen in the Node build script. No catalog
preprocessing runs on-device.

## Prerequisite parsing and traversal

`app/lib/parsePrereq.ts` is a pure recursive-descent parser. It normalizes course
tokens matching `/[A-Z]{2,4}\s?\d{3,4}[A-Z]?/`, treats parentheses and square
brackets as equivalent groups, preserves explicit AND/OR grouping, and attaches
grade and “prior to” qualifiers to course nodes. Unresolvable prose remains a
`text` leaf rather than being guessed as a course.

The explorer starts with direct prerequisite edges, expands only when a node is
tapped, and carries an ancestor `Set`. A repeated course becomes a non-recursing
`cycle — jump back` leaf; depth is also capped at eight. The same screen can
invert the precomputed `unlockedBy` edges to show courses unlocked by the current
course.

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
light/dark theme persistence for accessibility, and the reverse “what this
course unlocks” prerequisite view for planning future coursework.

## Validation

```bash
npm test -- --runInBand
npm run compile
npm run depcruise
```

The Maestro flow in `.maestro/flows/CourseExplorer.yaml` covers searching,
department filtering, opening detail, expanding prerequisites, and navigating to
the linked course.
