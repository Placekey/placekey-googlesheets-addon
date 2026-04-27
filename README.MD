# Placekey Google Sheets Add-on

Placekey is a free, universal standard identifier for any physical place. This Google Sheets Add-on makes it easy to generate Placekeys for your address or POI data.

## Full Documentation

https://docs.placekey.io/

## Installation

Install from the [Google Workspace Marketplace](https://workspace.google.com/marketplace/app/placekey_for_google_sheets/<APP_ID>).

1. Click **Install**, choose the Google account to install for, and authorize the requested permissions.
2. Open any Google Sheet and choose **Extensions → Placekey for Google Sheets → Generate Placekeys**.
3. Enter your Placekey API key when prompted ([get a free key](https://dev.placekey.io/)). Your key is stored per-user in Apps Script's `UserProperties` — it does not live in the sheet and is not visible to other collaborators.
4. The sidebar opens. See [Usage](#usage) below.

---

## Usage

1. **Have your data in the sheet.** Header row on row 1 (e.g. `Name`, `Street Address`, `City`, `State`, `Zip`, `Country`). Data rows beneath. Or click **Fill with sample data** in the sidebar to experiment (works in an empty sheet only).
2. **Open the sidebar** if it's not already open: **Extensions → Placekey for Google Sheets → Generate Placekeys**.
3. **Map each API field to one of your columns.** Common column headers are auto-mapped (see Features). A green dot means the field is mapped; gray means unmapped; red means two fields point to the same column.
4. **Check the return fields** you want appended. `Placekey` is always returned. `Confidence Level` is checked by default. Enable others like `Geocode`, `GERS`, `UPI` as needed. Your selection is saved per-user across all sheets.
5. **Click Generate.** Progress is shown in the sidebar. Results are written into columns appended to the right of your data (or reused if headers like `Placekey` already exist).

## Features

- **Auto-mapping** of column headers to API fields, including common abbreviations (Lat/Lng, Zip, ISO, etc.) and delimiter variants (`Store ID`, `store_id`, `store-id`, `StoreID` all match)
- **Fuzzy matching** catches common typos (`Adress` → address, `Streat` → street, `Lattitude` → latitude)
- **International vocabulary** for US, Canada, and UK data (State/Province/County, ZIP/Postcode/Eircode, Country/CC/ISO)
- **Learned aliases** — custom mappings you make are saved per-user and auto-applied to other sheets in the same spreadsheet
- **Batch processing** optimized for large datasets via contiguous-range writes
- **Error reporting** via an optional error column for rows that can't be processed

## Development

Requires Node.js 20+ and the [`clasp`](https://github.com/google/clasp) CLI (installed as a dev dependency).

```bash
npm install              # install dev dependencies
npm test                 # run unit tests
npm run lint             # ESLint
npm run format:check     # Prettier
```

### Deploying code changes

```bash
npm run clasp:login      # one-time OAuth (opens browser)
npm run push             # deploy current code to the Apps Script project
```

Tagged releases (`git tag v1.X.Y && git push --tags`) trigger GitHub Actions to run the full test suite and push code to the Apps Script project via clasp. Promoting a pushed change to a new Marketplace version is a manual step in the Apps Script editor (**Manage deployments → Edit → New version**) followed by a version bump in the Workspace Marketplace SDK App Configuration.

### Project layout

- `Code.gs` — server-side Apps Script (menu, API calls, sheet I/O, validation)
- `mapColumns.html` — sidebar UI for mapping columns and generating
- `setKey.html` — API key entry dialog
- `Help.html` — help modal
- `Stylesheet.html` — shared CSS (included via `<?!= include('Stylesheet'); ?>`)
- `appsscript.json` — Apps Script manifest with OAuth scopes
- `test/` — Vitest tests (pure logic functions loaded via Node's `vm` module)
- `.github/workflows/` — CI (lint/format/test) + Deploy (on `v*` tags)

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

[Apache-2.0 License](https://github.com/Placekey/placekey-googlesheets-addon/blob/master/LICENSE)
