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

## I-3 — Prerequisites and unlocks share direction-dependent logic

- **Symptom:** `PrerequisiteExplorerScreen` and `LazyNode` branch on a direction flag; `prereqWalk.ts` combines flattened prerequisites and reverse unlocks; the repository exposes graph internals to UI helpers.
- **Root cause (confirmed):** the graph shape and traversal direction are interpreted in screens/components. `CourseDetailScreen` shows only a prerequisite preview and has no independent unlock section.
- **Decision:** isolate graph access in `services/courses/prereqGraph.ts`, use separate prerequisite and unlock view-model builders/components, and make the explorer select one mode component rather than sharing direction-aware recursion.
- **Evidence:** imports and call sites are mapped in the implementation diff; the new unit tests will exercise mutual/self cycles, depth limits, missing courses, text leaves, OR groups, and unlock dependants independently.

## I-4 — Theme selection is limited to light/dark and hard-coded pill colors remain

- **Symptom:** Settings exposes one dark-mode switch. Theme persistence uses `ignite.themeScheme`; `colors.ts` and `colorsDark.ts` plus duplicate spacing files define only two themes. `SeatStatusPill` hard-codes white text.
- **Root cause (confirmed):** theme context reduces stored values to `"light"`/`"dark"` and the theme object is selected with a two-case switch. Components do not have semantic seat-status foreground tokens.
- **Decision:** introduce a typed theme registry with system/light/dark plus four selectable palettes, migrate the legacy key/value, and add contrast tests over all semantic tokens.
- **Evidence:** `theme/context.tsx`, `theme/types.ts`, `theme/theme.ts`, `SettingsScreen.tsx`, and `SeatStatusPill.tsx`.

## I-5 — Architecture and styling consistency audit

- **Scope:** after I-1 through I-4, audit all screens, hooks, services, lib modules, styles, exports, assets, and dependency-cruiser rules.
- **Confirmed risks:** inline styles and file-level eslint disables remain in screens; `AppNavigator` hides native headers; async detail/search logic is partly in screens; `prereqWalk.ts` and the new view model overlap.
- **Decision:** run the audit last, remove only verified dead code, normalize styles and imports, update README ownership/layer diagrams, and run the full validation plus Maestro flow.
