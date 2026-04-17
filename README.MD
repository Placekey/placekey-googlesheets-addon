# Placekey Google Sheets Add-on

Placekey is a free, universal standard identifier for any physical place. This Google Sheets Add-on makes it easy to generate Placekeys for your address or POI data.

## Full Documentation

https://docs.placekey.io/

## Installation

The addon is distributed as a Google Sheet template with the script bound to it. There is no Marketplace install — installation is by making your own copy.

### 1. Open the copy link

https://docs.google.com/spreadsheets/d/1a7GQY0Qx_xjGqeu-kgyx_TNAtSTCR2tqL0scRNgtS3o/copy

You must be signed in to a Google account. The link brings you to a **Copy document** dialog.

### 2. Click "Make a copy"

A new spreadsheet named **Copy of Placekey Starter** appears in your own Google Drive. Rename it to whatever you like — it's yours now.

### 3. Wait for the Extensions menu to populate

Open the **Extensions** menu. It may take **10–30 seconds** on first open for **Placekey Add-on** to appear. If you don't see it, close the menu and open it again, or refresh the sheet.

### 4. First run — authorize the addon

Go to **Extensions → Placekey Add-on → Generate Placekeys**. Google prompts you to authorize.

- Click **Continue** → pick your account
- You'll see a warning: _"Google hasn't verified this app"_. This is expected because the addon is not distributed via the Workspace Marketplace.
- Click **Advanced** → **Go to Placekey Add-on (unsafe)**
- Review the requested permissions (Sheets access, external URL requests for the Placekey API) and click **Allow**

You only do this once per copy.

### 5. Enter your API key

A dialog appears asking for your Placekey API key. If you don't have one, [get a free key](https://dev.placekey.io/). Your key is stored per-user in Apps Script's secure UserProperties — it does not live in the sheet and is not visible to anyone else who opens a copy.

### 6. Map columns and generate

The sidebar opens. See [Usage](#usage) below.

---

## Usage

1. **Have your data in the sheet.** Header row on row 1 (e.g. `Name`, `Street Address`, `City`, `State`, `Zip`, `Country`). Data rows beneath. Or click **Fill with sample data** in the sidebar to experiment.
2. **Open the sidebar** if it's not already open: **Extensions → Placekey Add-on → Generate Placekeys**.
3. **Map each API field to one of your columns.** Common column headers are auto-mapped (see Features). A green dot means the field is mapped; gray means unmapped; red means two fields point to the same column.
4. **Check the return fields** you want appended. `Placekey` is always returned. `Confidence Level` is checked by default. Enable others like `Geocode`, `GERS`, `UPI` as needed. Your selection is saved per-user across all sheets.
5. **Click Generate.** Progress is shown in the sidebar. Results are written into columns appended to the right of your data (or reused if headers like `Placekey` already exist).

### Updating to a newer version

Because each user has their own copy, existing copies do not auto-update. To get a newer version:

- Make a **fresh copy** from the link above
- Copy your data into the new sheet (or re-import)
- Authorize once again

The copy link is stable — it always serves the latest version.

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
