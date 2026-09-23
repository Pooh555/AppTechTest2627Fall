# AGENTS.md

## Project overview

This repository is a React Native app built with Expo and Ignite conventions. The app entry point is `app/app.tsx`, the root navigation is `app/navigators/AppNavigator.tsx`, and app-wide configuration is managed through `app/config/`.

## Working conventions

- Use TypeScript for application code unless a file is clearly a JSON or config artifact.
- Keep changes aligned with the existing Ignite structure: `app/components`, `app/screens`, `app/context`, `app/theme`, `app/utils`, `app/services`, and `scripts/`.
- Prefer small, compositional UI changes over large rewrites.
- Reuse existing providers and patterns for auth, theming, navigation, storage, and i18n rather than introducing new app-wide state patterns.
- Preserve the current app structure and naming patterns when adding screens, components, or utility modules.

## Key entry points

- `app/app.tsx`: bootstraps development tooling, i18n, app theme, storage restoration, and navigation.
- `app/navigators/AppNavigator.tsx`: route configuration and auth flow.
- `app/config/index.ts`: picks between dev/prod config variants.
- `app/context/`: application-level providers such as auth and favorites.
- `app/components/`: reusable UI primitives and screen-level building blocks.
- `app/screens/`: feature screens and route-level views.
- `scripts/`: data scripts and build-time tooling.
- `test/`: Jest setup and shared test utilities.

## Validation commands

Run the smallest relevant check for the area you changed:

- `npm run compile` — TypeScript check for the project.
- `npm run lint:check` — ESLint validation.
- `npm test -- --runInBand` — Jest suite.
- `npm run start` — run the Expo app locally.

For app changes, prefer validating with the narrowest command that exercises the changed behavior.

## Repo-specific notes

- This project uses React Navigation and route-level auth gating in `AppNavigator`.
- Global theming is provided through `app/theme/context.tsx`; keep new UI code theme-aware instead of hardcoding colors.
- Localization is handled through `app/i18n/`; when adding user-facing copy, prefer the existing i18n setup.
- Data and schedule generation scripts live in `scripts/`; if the task touches generated data, check whether the source script must also be updated.
- Tests use Jest with `@testing-library/react-native` and live alongside the code they verify (for example, `*.test.tsx` files).

## Before finishing a task

- Check whether the change is covered by an existing test or whether a focused new test is needed.
- Keep the fix scoped to the root cause rather than broad refactors.
- If you add or change user-facing behavior, verify that it fits the existing app flow and styling patterns.

## Links to project docs

- [README.md](README.md)
- [app/navigators/AppNavigator.tsx](app/navigators/AppNavigator.tsx)
- [app/app.tsx](app/app.tsx)
- [app/config/index.ts](app/config/index.ts)
