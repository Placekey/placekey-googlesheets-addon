# Marketplace Store Listing copy

Paste-ready content for the Workspace Marketplace SDK Store Listing in
the GCP console. When this file changes, update the live listing to
match — Marketplace can request re-review for any change visible to
end users.

## Short description (≤80 characters)

> Generate Placekeys for any address or POI data, directly in Google Sheets.

## Detailed description

> **Placekey for Google Sheets** brings Placekey — the free, universal
> standard identifier for any physical place — directly into your
> spreadsheet workflow.
>
> Use Placekeys to join, deduplicate, and enrich your address and POI
> data across any source, without writing code or leaving Google Sheets.
>
> **Features**
>
> - **Generate Placekeys** for any combination of address,
>   latitude/longitude, or POI fields
> - **Auto-mapping** of common column headers (Address, City, State,
>   Zip, Lat/Lng, ISO, Country, and many more) and their abbreviations
>   and delimiter variants
> - **Fuzzy matching** that catches common typos like "Adress,"
>   "Streat," or "Lattitude"
> - **International support** for US, Canada, and UK address
>   vocabularies (State / Province / County, ZIP / Postcode / Eircode)
> - **Learned aliases** — your custom column mappings are remembered and
>   auto-applied across other sheets
> - **Optional return fields** — Placekey, Confidence Level, Geocode
>   coordinates, GERS, UPI
> - **Batch processing** with built-in rate limiting for large datasets
> - **Per-row error reporting** for any rows that can't be processed
>
> **Getting started**
>
> 1. Install the add-on from the Marketplace.
> 2. Open any Google Sheet with address or location data.
> 3. Choose **Extensions → Placekey for Google Sheets → Generate Placekeys**.
> 4. Enter your free Placekey API key (get one at
>    [https://dev.placekey.io](https://dev.placekey.io)).
> 5. Map your columns and click Generate.
>
> Placekey identifiers are returned in seconds and appended to your
> spreadsheet.
>
> **Privacy**: This add-on uses the minimum-permission
> `spreadsheets.currentonly` scope. It only accesses the single
> spreadsheet you have open when you run it. Your Placekey API key is
> stored privately in your Google account and never shared. See our
> [privacy policy](https://www.placekey.io/privacy-policy) for full
> details.
>
> **Support**: Documentation at
> [docs.placekey.io](https://docs.placekey.io). For help, email
> [support@placekey.io](mailto:support@placekey.io).

## Screenshot captions

Pair these with the screenshots in `marketing/marketplace/`. Caption
order matches `screenshot-1` through `screenshot-5`.

1. **Map your columns to Placekey API fields with auto-detection.**
   — sidebar with green dots on mapped fields
2. **Generate Placekeys for thousands of rows in batches.**
   — sidebar showing progress
3. **Placekey, Confidence, and Geocode columns appended to your data.**
   — sheet with results
4. **Choose exactly which return fields you need.**
   — sidebar return fields section
5. **Free Placekey API key — get one in 30 seconds.**
   — API key dialog

## Reviewer testing instructions

Paste this into the SDK Store Listing **Testing instructions** field.
Use a **disposable, low-quota Placekey API key** dedicated to review
and rotate it after each round.

```
Test API key for review: <generate at https://dev.placekey.io/ and rotate after each review round>

To test:
1. Install the add-on.
2. Open a fresh, empty Google Sheet (the "Fill with sample data" button refuses to overwrite a sheet that already has content).
3. Choose Extensions → Placekey for Google Sheets → Generate Placekeys.
4. When prompted, enter the API key above.
5. The sidebar will open. Click "Fill with sample data" to populate test rows.
6. Map the columns (auto-mapping will pre-fill most fields), then click Generate.
7. Placekey columns will be appended to the right of the data.
```

## Listing metadata

| Field | Value |
|---|---|
| App name | Placekey for Google Sheets |
| Category | Productivity → Office Productivity |
| Pricing | Free of charge |
| Distribution | All regions |
| Languages | English |
| Developer name | Placekey |
| Developer website | https://placekey.io |
| Developer email | support@placekey.io |
| Privacy policy URL | https://www.placekey.io/privacy-policy |
| Terms of service URL | https://www.placekey.io/terms-of-service |
| Support URL | mailto:support@placekey.io (Marketplace accepts mailto for the Support URL field) |
