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

- **Symptom:** Browse supports only one selected term in the header; users cannot filter by multiple departments or open seats in the advanced sheet.
- **Root cause (confirmed):** `SearchFilters` only contains `termCode` and `departmentCode`; the advanced UI had no multi-department filter and exposed raw attribute codes instead.
- **Decision:** add a pure `CourseFilters` shape with `terms`, `departments`, and `openSeatsOnly`; expose department multi-select in the modal and generate a parameterized `department_code IN (...)` clause.
- **Evidence:** `idx_courses_department` already covers the direct department filter; the generated attribute relation was removed because numerical attribute codes were not a useful user-facing filter.

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

## I-16 — Prerequisite Explorer vertical scrolling

- **Symptom:** deep Requires and long Unlocks views stop before their final rows.
- **Root cause (confirmed):** the shared scrolling `Screen` content container used `flex: 1`, forcing content to the viewport height instead of allowing the scroll view content to grow.
- **Decision:** change the scroll content container to `flexGrow: 1`, explicitly enable vertical scrolling and bottom safe-area content on the Explorer, and keep tree rows as ordinary nested views/pressables without competing scroll handlers.
- **Evidence:** Explorer has one outer `Screen` scroll container and no nested scroll handlers; the old `$innerStyle.flex` constrained the content height.

## I-17 — Browse list scroll stability

- **Symptom:** extended Browse scrolling can stall while rows are recycled.
- **Root cause (confirmed):** Browse supplied an inline render callback without an explicit stable callback and did not document the FlashList v2 sizing behavior; `CourseRow` is already memoized and keys are unique course codes.
- **Decision:** memoize Browse's render callback, retain deterministic code keys, and rely on FlashList v2's automatic measurement because this installed version does not expose `estimatedItemSize` in its typed API.
- **Evidence:** FlashList v2 type definitions have no `estimatedItemSize`; no Browse scroll-state updates or scroll handlers exist.

## I-18 — Favorite icon consistency

- **Symptom:** Course Detail used star glyphs while Favorites and navigation used hearts.
- **Root cause (confirmed):** `CourseDetailScreen` rendered `★`/`☆` directly.
- **Decision:** use Ionicons `heart`/`heart-outline` in Course Detail and the reusable CourseRow action, with state-specific accessibility labels.
- **Evidence:** repository search found no remaining star favorite glyphs after the change.

## I-19 — Browse header and department filters

- **Symptom:** Browse header duplicated term selection while advanced filters exposed numerical attributes.
- **Root cause (confirmed):** `TermSelector` was rendered as a standalone header control; `AdvancedFilterSheet` accepted attribute strings and the search planner generated attribute relation clauses.
- **Decision:** remove the standalone term selector and obsolete DepartmentSheet/TermSelector components; make `CourseFilters.departments` drive a parameterized department `IN` clause backed by `idx_courses_department`. Terms remain available inside Advanced Filters.
- **Evidence:** generated database no longer creates the temporary attribute relation; department query plans use the existing department index.

## I-20 — Browser scrolling regression

- **Symptom:** scrolling stopped working in the browser build after the shared screen scrolling changes.
- **Root cause (confirmed):** `ScreenWithScrolling` mounted `react-native-keyboard-controller`'s reanimated `KeyboardAwareScrollView` for every platform. That component is intended for native keyboard handling and is not the appropriate web scroll primitive.
- **Decision:** render React Native's standard `ScrollView` on web, while retaining `KeyboardAwareScrollView` on iOS and Android. Disable keyboard-avoiding behavior on web because browsers manage viewport/input behavior themselves.
- **Evidence:** the web bundle now exports successfully with the platform branch; TypeScript, ESLint, Jest, and Prettier pass after the change.

## I-21 — Course detail content density

- **Symptom:** CILOs, prerequisites, unlocks, and sections were all visible immediately, making course detail screens unnecessarily long and dense.
- **Root cause (confirmed):** `CourseDetailScreen` rendered each group directly in the FlashList header and had no section expansion state.
- **Decision:** add a reusable accessible `CollapsibleSection` with 44dp header targets, expanded accessibility state, chevron affordances, and native `LayoutAnimation`. All four groups start collapsed; section rows remain in the existing FlashList and are only supplied as data while Sections is expanded.
- **Evidence:** the new component test verifies closed-by-default rendering and accessible toggle state; the detail screen now has independent CILOs, Prerequisites, Unlocks, and Sections accordions.

## I-22 — Advanced filter submit nomenclature

- **Symptom:** the filter sheet submit action was labelled “Done”, which did not clearly communicate that selected filters would be applied.
- **Root cause (confirmed):** `AdvancedFilterSheet` used `testID="advanced-filter-done"` and rendered a “Done” label.
- **Decision:** rename the action to “Apply”, expose `accessibilityLabel="Apply advanced search filters"`, and use `testID="filter-apply-button"` while retaining the existing apply-through-state and close behavior.
- **Evidence:** the component test presses the labelled Apply button and verifies `onClose`; the Maestro flow uses the new selector.

## I-23 — Runtime error and async lifecycle audit

- **Reproduction:** static search identified nested promise chains in `FavouritesScreen`, metadata loading in `BrowseScreen`, and search requests that could complete after their effect cleanup. The baseline test suite did not expose these navigation-race paths.
- **Root cause (confirmed):** `FavouritesScreen` had no cancellation or rejection boundary around its two-step database load; Browse metadata could set state after unmount; `useCourseSearch` cancelled its timer but did not invalidate an already-running request. MMKV favourite toggles also derived writes from the render snapshot rather than the latest synchronous storage value.
- **Decision:** add explicit async `try/catch/finally` boundaries and cancellation guards, invalidate stale search request IDs during cleanup, and read the latest MMKV value before each toggle. Preserve typed repository results and existing UI fallbacks.
- **Evidence:** TypeScript, ESLint, Jest, and dependency-cruiser pass after the changes; the audit found no repository imports of React/UI modules.

## I-24 — Layer and dependency audit

- **Reproduction:** `npm run depcruise` was run against the complete `app` tree, and imports from `app/services` and `app/lib` were searched for React/UI dependencies.
- **Root cause (confirmed):** no active circular dependency or service-to-UI violation was found. The architecture already follows screen → hook → service/lib boundaries.
- **Decision:** avoid a speculative rewrite. Document the enforced boundaries and make only lifecycle/type fixes that preserve the current ownership model.
- **Evidence:** dependency-cruiser reports zero violations across 134 modules and 365 dependencies; no screen-to-screen imports or service imports of React/components were found.

## I-25 — TypeScript and style quality audit

- **Reproduction:** baseline `tsc`, ESLint, and targeted searches for `any`, `as unknown`, inline styles, and eslint disables.
- **Root cause (confirmed):** the Button accessory contract used `StyleProp<any>`, and the safe-area utility used an unnecessary unknown-based default cast. Remaining matches are prose, test setup compatibility shims, or intentional debugging/navigation code.
- **Decision:** type Button accessories as `StyleProp<ViewStyle>`, invoke themed accessory factories correctly, and use optional generic parameters in the safe-area utility. Do not rewrite compatibility/test scaffolding without a failing defect.
- **Evidence:** strict compile and lint pass after the changes; no application inline `style={{...}}` patterns were found.

## I-26 — Documentation and onboarding audit

- **Reproduction:** README instructions and architecture claims were compared with package scripts, current directories, database scripts, generated assets, and validation commands.
- **Root cause (confirmed):** the README covered the primary workflow but did not explicitly state all layer contracts, directory responsibilities, native/web setup differences, or the full quality command sequence.
- **Decision:** expand the README with a Mermaid/text architecture diagram, setup matrix, module responsibility table, feature contracts, generated-data workflow, and validation guidance without introducing stale commands.
- **Evidence:** all documented commands map to scripts in `package.json`; Maestro is explicitly documented as requiring an external CLI and native development build.

## I-27 — Collapsible section render-phase update

- **Reproduction:** opening Course Detail and expanding Sections emitted React's warning that `CourseDetailScreen` was updated while `CollapsibleSection` was rendering.
- **Root cause (confirmed):** `CollapsibleSection` invoked the owner's `setSectionsExpanded` callback inside the functional updater passed to its own `setExpanded`. React may evaluate that updater during render, so the cross-component state update occurred in a render phase.
- **Decision:** derive the next value from the current committed `expanded` state, update the local state, then notify the owner from the event handler. Add a regression test for the callback contract.
- **Evidence:** the callback no longer executes inside a state updater; the focused component test and full Jest suite pass without the warning.

## I-28 — Browse home web scrolling

- **Reproduction:** open the Expo web build on Browse with more than one page of courses and attempt to scroll the home list. The fixed `Screen` wrapper and FlashList had no explicit web flex viewport contract.
- **Root cause (confirmed):** the fixed screen content wrapper used only `flexGrow`, and the Browse FlashList had no flex/min-height style. Web flex layout therefore allowed the list to size to its content instead of constraining it to the remaining viewport.
- **Decision:** give fixed screen content `flex: 1` and `minHeight: 0`, and give Browse's FlashList the same bounded flex style. Preserve the scroll-screen `flexGrow` behavior used by long-form screens.
- **Evidence:** the web layout now has a bounded list viewport; compile, lint, Jest, dependency-cruiser, and formatting checks are required after the change.

## I-15 — Final verification of the four-issue pass

- **Settings:** helper metadata is grouped, dimmed with `textDim`, and spaced with theme tokens.
- **Filters:** the advanced sheet now offers departments, terms, and open seats. `EXPLAIN QUERY PLAN` shows indexed lookups for terms, seat aggregates, and the existing department index.
- **Favorites:** `CourseRow` exposes an accessible inline action with a 44dp minimum target; the Favorites screen removes the row before the MMKV-backed refresh completes.
- **Tabs:** Main navigation renders Ionicons, theme tint colors, caption typography, and bottom-inset-aware height.
- **Validation:** TypeScript, ESLint, Jest, dependency-cruiser, and Prettier pass. Maestro remains unavailable in this environment, so device execution is still pending on a runner with the CLI and app build.

## I-9 — Duplicated course sections

- **Symptom:** Course detail displays the same `LEC L1` repeatedly with changing enrollment and wait-list values.
- **Reproduction:** `SELECT course_code, term_code, type, section, COUNT(*) FROM sections GROUP BY course_code, term_code, type, section HAVING COUNT(*) > 1` reports dozens of rows for one logical section; `COMP 1023 / 2610 / L1` has 76 rows.
- **Root cause (confirmed):** the schedule source contains timestamped enrollment snapshots. `build-data.ts` inserts every joined snapshot into SQLite, while `CourseRepository.getSections` selects all rows.
- **Decision:** deduplicate in `scripts/pipeline.ts` before database generation using `course_id + term_code + type + section`, retaining the lexicographically latest timestamp even when the source snapshot's internal `number` changes, and preserving source order between distinct sections. The display-layer slot dedupe remains as protection for repeated schedule blocks within one row.
- **Test-first evidence:** `scripts/pipeline.test.ts` now asserts an older and newer snapshot collapse to the newer row while a distinct section remains.
