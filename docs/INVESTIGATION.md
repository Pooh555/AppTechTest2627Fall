# Issue investigations

## I-1 — Empty-state text reaches the screen edge

- **Symptom:** `CourseDetailScreen`, `BrowseScreen`, and `FavouritesScreen` pass bare `Text` nodes to list empty slots. `CourseDetailScreen` specifically renders `No sections for this term.` without horizontal insets.
- **Root cause (confirmed):** list state components are not centralized; several `ListEmptyComponent` values are direct `Text` elements with either no style or raw padding. `DepartmentSheet` also has no reusable loading/error/empty state.
- **Decision:** add themed `EmptyState`, `LoadingState`, and retryable `ErrorState` primitives. Use them for every list/state slot and keep spacing/safe-area padding in the primitives.
- **Evidence:** `rg` found direct list/state text in `BrowseScreen.tsx`, `FavouritesScreen.tsx`, `CourseDetailScreen.tsx`, and `PrerequisiteExplorerScreen.tsx`.

## I-2 — Code-prefix search does not narrow on letters

- **Reproduction:** current `searchCourses` sends every non-empty query to `courses_fts MATCH`; ordering distinguishes exact/prefix matches but does not filter out description matches. A query such as `comp` therefore includes prose matches before a numeric code is entered.
- **Root cause (confirmed):** `toFtsQuery` creates unconstrained tokens and `searchCourses` joins FTS for all query intents. The `CASE` expression only affects ordering. `courses` has indexed `prefix`, `number`, and `code_compact` data suitable for strict code search.
- **Decision:** add pure `lib/search` intent classification and SQL planning. Code-prefix/partial intents use indexed course columns; text intents use deterministic FTS tiers. Preserve term, department, code-list, and limit-plus-one filters.
- **Evidence to capture in tests:** query counts, distinct prefixes, and top codes for `c`, `co`, `comp`, `comp `, `comp4`, `comp 42`, `comp4211`, `data`, and `machine learning` against the bundled database.

### Search evidence

| Query              | Before count / prefixes | Before top code | After count / prefixes | After top code |
| ------------------ | ----------------------: | --------------- | ---------------------: | -------------- |
| `c`                |              3913 / 129 | CHEM 5210       |             3913 / 129 | CHEM 5210      |
| `co`               |              3705 / 129 | COMP 6912       |             3705 / 129 | COMP 6912      |
| `comp`             |              1355 / 121 | COMP 6912       |                109 / 1 | COMP 1001      |
| `comp `            |              1355 / 121 | COMP 6912       |                109 / 1 | COMP 1001      |
| `comp4`            |                   1 / 1 | COMP 4633       |                 36 / 1 | COMP 4021      |
| `comp 42`          |                 30 / 16 | COMP 4221       |                  4 / 1 | COMP 4211      |
| `comp4211`         |                   0 / 0 | —               |                  1 / 1 | COMP 4211      |
| `data`             |                567 / 89 | DSAA 5002       |               567 / 89 | DSAA 5002      |
| `machine learning` |                164 / 51 | MSBD 5012       |               164 / 51 | MSBD 5012      |

The deliberate classification decision is that one- and two-letter inputs remain text search: they are too ambiguous to identify a real course family reliably. A complete known prefix switches to indexed code search.

## I-3 — Prerequisites and unlocks share direction-dependent logic

- **Symptom:** `PrerequisiteExplorerScreen` and `LazyNode` branch on a direction flag; `prereqWalk.ts` combines flattened prerequisites and reverse unlocks; the repository exposes graph internals to UI helpers.
- **Root cause (confirmed):** the graph shape and traversal direction are interpreted in screens/components. `CourseDetailScreen` shows only a prerequisite preview and has no independent unlock section.
- **Decision:** isolate graph access in `services/courses/prereqGraph.ts`, use separate prerequisite and unlock view-model builders/components, and make the explorer select one mode component rather than sharing direction-aware recursion.
- **Evidence:** imports and call sites are mapped in the implementation diff; the new unit tests will exercise mutual/self cycles, depth limits, missing courses, text leaves, OR groups, and unlock dependants independently.
- **Implemented evidence:** `services/courses/prereqGraph.ts` is now the only JSON loader; `PrerequisiteTree` owns AST expansion and `UnlockList` owns flat dependants. The explorer only selects the two components, and `CourseDetailScreen` renders separate Requires and Unlocks sections.

## I-4 — Theme selection is limited to light/dark and hard-coded pill colors remain

- **Symptom:** Settings exposes one dark-mode switch. Theme persistence uses `ignite.themeScheme`; `colors.ts` and `colorsDark.ts` plus duplicate spacing files define only two themes. `SeatStatusPill` hard-codes white text.
- **Root cause (confirmed):** theme context reduces stored values to `"light"`/`"dark"` and the theme object is selected with a two-case switch. Components do not have semantic seat-status foreground tokens.
- **Decision:** introduce a typed theme registry with system/light/dark plus four selectable palettes, migrate the legacy key/value, and add contrast tests over all semantic tokens.
- **Evidence:** `theme/context.tsx`, `theme/types.ts`, `theme/theme.ts`, `SettingsScreen.tsx`, and `SeatStatusPill.tsx`.
- **Implemented evidence:** `theme/registry.ts` is the single palette registry for six concrete themes plus System selection. `registry.test.ts` checks text, tint, and every seat-status foreground/background pair at WCAG AA contrast.

## I-5 — Architecture and styling consistency audit

- **Scope:** after I-1 through I-4, audit all screens, hooks, services, lib modules, styles, exports, assets, and dependency-cruiser rules.
- **Confirmed risks:** inline styles and file-level eslint disables remain in screens; `AppNavigator` hides native headers; async detail/search logic is partly in screens; `prereqWalk.ts` and the new view model overlap.
- **Decision:** run the audit last, remove only verified dead code, normalize styles and imports, update README ownership/layer diagrams, and run the full validation plus Maestro flow.
- **Implemented evidence:** removed the obsolete palette files, demo navigation aliases, direction-aware `prereqWalk`, inline-style disables, and direct list-slot state text. TypeScript, ESLint, Jest, Prettier, and dependency-cruiser pass. Maestro could not execute in this environment because the `maestro` CLI is not installed; the updated flow remains checked in for a device-capable runner.

## I-6 — Duplicated course time slots

- **Symptom:** Course detail renders the decoded `sections.schedules` arrays directly. The generated database contains no duplicate slot signatures inside a single section, but the UI has no defensive normalization if an upstream schedule payload repeats a block.
- **Root cause (confirmed):** `CourseRepository.getSections` maps raw JSON arrays directly to `CourseSection.schedules`; there is no stable-signature deduplication boundary between SQLite JSON and the display model.
- **Decision:** add a pure `deduplicateSlots` helper keyed by section identity plus weekday, dates, times, and venue. Apply it once while hydrating sections, preserving legitimate identical times belonging to different sections.
- **Evidence:** real DB audit found `0` within-section duplicates across the generated asset; the regression test uses an intentionally inflated array to guard the mapping boundary.

## I-7 — Semester selector clipping

- **Symptom:** Browse renders department and all term chips inside a static horizontal `View`; narrow layouts cannot reveal chips beyond the viewport.
- **Root cause (confirmed):** `BrowseScreen` uses `$filters` with `flexDirection: "row"` and no horizontal scrolling container.
- **Decision:** use a horizontal `ScrollView` with hidden indicators and themed content padding so all terms remain reachable at 360dp.
- **Evidence:** current JSX maps all terms into the static `$filters` view; the updated Maestro flow swipes the term selector before asserting Winter.

## I-8 — Theme registry nomenclature

- **Symptom:** the registry exposes the non-stylistic identifier `youtube`.
- **Root cause (confirmed):** `ThemeId`, registry definitions, and Settings labels all derive from the literal `"youtube"`. Existing migration only handles legacy light/dark values.
- **Decision:** rename it to `crimson`, migrate stored `youtube` values to `crimson` during provider hydration, and retain all existing palette values. Extend contrast tests and document the mapping.
- **Evidence:** registry-level WCAG tests already calculate all required contrast pairs; the new test will assert every renamed theme and migration mapping.
- **Implemented evidence:** the public registry now contains `System | Light | Dark | Pastel | Sepia | Midnight | Crimson`; only the migration function recognizes the legacy persisted string and rewrites it to `crimson`.

## I-10 — Seat-status label contrast

- **Symptom:** `No seats data` and `N/A` can render as black text on a theme-specific muted pill, especially in Crimson and Sepia.
- **Root cause (confirmed):** `SeatStatusPill` had semantic foreground tokens only for `open`, `near-full`, and `full`; both neutral states fell through to `colors.text` while their backgrounds were `surfaceMuted` or `palette.neutral500`.
- **Decision:** add explicit `seatUnavailable/onSeatUnavailable` and `seatUnknown/onSeatUnknown` tokens to every palette. The pill now selects a foreground token for all five `SeatStatus` values, with no implicit React Native text color. Also correct shared button pressed/reversed styles to use tested semantic pairs rather than palette aliases with insufficient contrast.
- **Evidence:** the registry contrast suite now verifies both neutral status pairs, common neutral surfaces, and primary button foreground/background pairs for every concrete theme in addition to the existing semantic status pairs.

## I-11 — Settings helper hierarchy

- **Symptom:** Settings places bundled-term, generation, and dataset-count details as adjacent raw `Text` nodes below the theme picker.
- **Root cause (confirmed):** `SettingsScreen` uses a single margin-only `$dataset` style and leaves the two following `Text` elements unstyled, so secondary information has no visual hierarchy or shared spacing.
- **Decision:** group dataset metadata into a themed helper block with `textDim`, semantic `xs` typography, token spacing, and safe-area-aware screen padding.
- **Evidence:** the current screen contains three sibling metadata `Text` elements; only the first has a style.

## I-12 — Advanced structured course filters

- **Symptom:** Browse supports only one department and one selected term; users cannot filter by open seats or course attributes.
- **Root cause (confirmed):** `SearchFilters` only contains `termCode` and `departmentCode`; `courses.attributes` is stored as JSON and has no queryable/indexed relation.
- **Decision:** add a pure `CourseFilters` shape and parameterized search-plan clauses. Generate an indexed `course_attributes(code, attribute)` relation from the existing attribute JSON, and expose a modal filter sheet from Browse.
- **Evidence:** the bundled database contains Common Core labels such as `CC26`, but has no attribute table or attribute index.

## I-13 — Inline unfavourite action

- **Symptom:** Favorites rows navigate to Course Detail and offer no direct removal action.
- **Root cause (confirmed):** `CourseRow` accepts only `course` and `onPress`; `FavouritesScreen` does not pass an action slot and only reloads after the MMKV codes array changes.
- **Decision:** add an optional accessible trailing action to `CourseRow`; Favorites supplies an optimistic removal callback and binds it to `toggleFavourite`.
- **Evidence:** `FavouritesScreen` renders the same navigation-only row used by Browse.

## I-14 — Bottom tab icons and label sizing

- **Symptom:** Main tabs configure active/inactive colors but no icons, label typography, or safe-area-aware height.
- **Root cause (confirmed):** `MainNavigator` has no `tabBarIcon`, `tabBarLabelStyle`, or inset-aware `tabBarStyle`; the existing Expo vector-icons package is available through the Expo dependency tree.
- **Decision:** use `@expo/vector-icons` Ionicons with themed active/inactive colors, typography-derived labels, and bottom inset padding.
- **Evidence:** `MainNavigator.tsx` only sets `tabBarStyle`, `tabBarActiveTintColor`, and `tabBarInactiveTintColor`; no icon renderer exists.

## I-15 — Final verification of the four-issue pass

- **Settings:** helper metadata is grouped, dimmed with `textDim`, and spaced with theme tokens.
- **Filters:** `course_attributes` contains 3,085 normalized attribute rows; the generated attribute index is used by the correlated filter lookup. `EXPLAIN QUERY PLAN` shows indexed lookups for terms, seat aggregates, and attributes.
- **Favorites:** `CourseRow` exposes an accessible inline action with a 44dp minimum target; the Favorites screen removes the row before the MMKV-backed refresh completes.
- **Tabs:** Main navigation renders Ionicons, theme tint colors, caption typography, and bottom-inset-aware height.
- **Validation:** TypeScript, ESLint, Jest, dependency-cruiser, and Prettier pass. Maestro remains unavailable in this environment, so device execution is still pending on a runner with the CLI and app build.

## I-9 — Duplicated course sections

- **Symptom:** Course detail displays the same `LEC L1` repeatedly with changing enrollment and wait-list values.
- **Reproduction:** `SELECT course_code, term_code, type, section, COUNT(*) FROM sections GROUP BY course_code, term_code, type, section HAVING COUNT(*) > 1` reports dozens of rows for one logical section; `COMP 1023 / 2610 / L1` has 76 rows.
- **Root cause (confirmed):** the schedule source contains timestamped enrollment snapshots. `build-data.ts` inserts every joined snapshot into SQLite, while `CourseRepository.getSections` selects all rows.
- **Decision:** deduplicate in `scripts/pipeline.ts` before database generation using `course_id + term_code + type + section`, retaining the lexicographically latest timestamp even when the source snapshot's internal `number` changes, and preserving source order between distinct sections. The display-layer slot dedupe remains as protection for repeated schedule blocks within one row.
- **Test-first evidence:** `scripts/pipeline.test.ts` now asserts an older and newer snapshot collapse to the newer row while a distinct section remains.
