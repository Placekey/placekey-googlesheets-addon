# Placekey Google Sheets Add-on

Placekey is a free, universal standard identifier for any physical place. This Google Sheets Add-on makes it easy to generate Placekeys for your address or POI data.

## Full Documentation

https://docs.placekey.io/

## Installation

The addon is distributed as a Google Sheet template with the script bound to it. Open this link to get your own copy with the addon pre-installed:

https://docs.google.com/spreadsheets/d/1a7GQY0Qx_xjGqeu-kgyx_TNAtSTCR2tqL0scRNgtS3o/copy

Click **Make a copy** — the **Placekey Add-on** menu will appear under **Extensions** after the sheet reloads. On first use, Google will prompt you to authorize the addon.

## Usage

1. Open the copied sheet and import your address or POI data. Or click **Fill with sample data** to experiment.
2. **Extensions → Placekey Add-on → Generate Placekeys**.
3. Enter your Placekey API key. If you don't have one, get a free API key at https://dev.placekey.io/.
4. Map your spreadsheet columns to the API fields. Most common column headers are auto-mapped.
5. Click **Generate Placekeys**.

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

Tagged releases (`git tag v0.X.Y && git push --tags`) trigger GitHub Actions to run the full test suite and deploy automatically via clasp.

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
