# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-04-27

### Added

- Distribution via the Google Workspace Marketplace (standalone Apps Script project, public listing).
- Auto-mapping of spreadsheet column headers to API fields with ~130 aliases covering US, Canadian, and UK terminology (State/Province/County, ZIP/Postcode/Eircode, Country/CC/ISO, etc.).
- Fuzzy matching via Levenshtein distance as a fallback, catching common typos (e.g., `Adress` -> address, `Streat` -> street, `Lattitude` -> latitude).
- Learned aliases: custom column mappings are saved per-user and auto-applied to other sheets in the same script project.
- Country column with ISO2 codes in the sample data.
- 140 unit tests across 5 files using Vitest with real logic (no mocks) — up from 0 tests.
- ESLint and Prettier CI enforcement via GitHub Actions.
- Auto-deploy workflow on `v*` tags using clasp.
- `clasp` developer tooling and npm scripts (`push`, `open`, `clasp:login`, `clasp:create`) for one-command deployment to Apps Script.

### Changed

- Tightened OAuth scope from `spreadsheets` (full access to all spreadsheets) to `spreadsheets.currentonly` (active document only) — a least-privilege upgrade enabled by the audit confirming the add-on never reaches outside the active spreadsheet.
- USER_AGENT bumped to `placekey-googlesheets/1.0.0` to match the released version.
- README rewritten for the Marketplace install flow.
- Decomposed the monolithic `generateKeys` function into 12 focused helpers for maintainability.
- Modernized source from `var` to `const`/`let` throughout.
- Sheet writes now batch contiguous ranges instead of one cell at a time, significantly improving performance on large datasets.
- Error column is now written as the last column rather than the second column, preserving the visual order of source data.
- Tailwind CSS upgraded from 1.9.6 to 2.2.17.
- Replaced the retired Google Font "Spartan" with "League Spartan".
- Normalized delimiter variants in auto-map (`Store ID`, `store_id`, `store-id`, `StoreID` all match the same canonical field).
- CI Node.js version bumped to 24.
- Field mapping rows switched to a compact 2-column grid (label left, select right) with a fixed 110px label column so all fields line up vertically.
- Simplified the readiness status chip from "✓ Lat/Lng ready" / "✓ Address ready" variants to a single "✓ Ready".
- `insertSample()` now refuses to overwrite a sheet that already contains data — guards against accidental data loss when invoked from a populated sheet.
- Renamed `testUser()` to `pingAuth()` to accurately describe its role (probing OAuth state from the API key dialog).

### Fixed

- Accessibility: added `lang` attributes on HTML templates, visible focus styles, and semantic `<button>` elements in place of clickable divs.
- "Get API Key" link now points to the `dev.placekey.io` root rather than a broken deep link.

### Security

- Fixed XSS vulnerabilities in HTML template rendering.
- Fixed API key injection issue in outbound requests.
- Corrected OAuth scopes in the Apps Script manifest to follow least-privilege.

### Removed

- Unwired `reset()` function (deleted all UserProperties + DocumentProperties; not exposed in any UI but globally callable from `google.script.run`).
- Copy-template distribution flow and references in the README.
