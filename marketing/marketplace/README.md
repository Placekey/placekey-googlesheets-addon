# Marketplace listing assets

Source-of-truth specs for the Google Workspace Marketplace listing of
**Placekey for Google Sheets**. Design produces these files; engineering
uploads them in the Google Cloud Console.

## Icons (PNG, 1:1 square, transparent or solid background)

Generate all sizes from a single source SVG so they stay aligned.

| File | Size | Where it's used |
|---|---|---|
| `icon-32.png` | 32×32 | Marketplace Store Listing — small icon (required) |
| `icon-48.png` | 48×48 | Marketplace Store Listing — small web-app icon (required, web app) |
| `icon-96.png` | 96×96 | Marketplace SDK App Configuration — web-app icon (required, web app) |
| `icon-120.png` | 120×120 | Google Auth platform → Branding → App logo (required for brand verification) |
| `icon-128.png` | 128×128 | Marketplace Store Listing — large icon (required) |

## Promo banner (optional)

| File | Size | Notes |
|---|---|---|
| `banner-220x140.png` | 220×140 | Featured/category cards in the Marketplace |

## Screenshots (PNG, 1280×800 preferred)

Full-bleed (no padding). Take from the actual standalone deployment after
migration — never from a copy-template build (different look-and-feel).

| File | Caption |
|---|---|
| `screenshot-1-mapping.png` | Map your columns to Placekey API fields with auto-detection. |
| `screenshot-2-progress.png` | Generate Placekeys for thousands of rows in batches. |
| `screenshot-3-results.png` | Placekey, Confidence, and Geocode columns appended to your data. |
| `screenshot-4-fields.png` | Choose exactly which return fields you need. |
| `screenshot-5-apikey.png` | Free Placekey API key — get one in 30 seconds. |

3–5 screenshots are required; the captions above pair with the listing copy.

## Optional

- `promo.mp4` / YouTube URL — promotional video (optional; can boost conversion)

## Naming and storage

- All files lowercase, hyphenated, with explicit pixel dimensions for
  unambiguous size tracking.
- Source SVGs (icon source, screenshot mockups) live alongside their PNG
  exports under `marketing/marketplace/source/`.
- Re-export rather than hand-edit the PNGs when the brand changes.
