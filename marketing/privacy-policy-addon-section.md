# Privacy policy — Placekey for Google Sheets add-on section

Paste the section below into `https://www.placekey.io/privacy-policy`
(or wherever the canonical privacy policy lives). The Marketplace
reviewer reads this section explicitly during review; the language is
calibrated to satisfy the Google API Services User Data Policy
(including **Limited Use**) without padding.

When the privacy URL changes, update **Google Auth platform → Branding →
Privacy policy link** and **Marketplace SDK Store Listing → Privacy
policy URL** to match.

---

## Placekey for Google Sheets Add-on

The Placekey for Google Sheets add-on's use and transfer of information
received from Google APIs adhere to the
[Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy),
including the **Limited Use** requirements.

The add-on accesses Google user data only as needed to provide its
user-facing functionality. We do not transfer this data to third parties
except as needed to provide the feature, do not use it to serve
advertisements, and do not allow humans to read it except with your
explicit consent or as needed for security purposes. Specifically:

- **Spreadsheet contents**: The add-on reads address, location, and
  identifier columns from the spreadsheet you have open when you invoke
  it, transmits those rows to the Placekey API at
  `https://api.placekey.io/v1/placekeys` over HTTPS to obtain Placekey
  identifiers, and writes the returned identifiers back into your
  spreadsheet. The add-on uses the `spreadsheets.currentonly` OAuth
  scope, which limits its access to the single document you have open.
- **Your Placekey API key**: Stored in Google's per-user Apps Script
  `UserProperties` storage. It is bound to your Google account and is
  not visible to anyone else, including other collaborators on the same
  spreadsheet. The API key is never logged, shared with third parties,
  or transmitted anywhere except to the Placekey API as the `apikey`
  HTTP header.
- **Column mappings, preferences, and transient progress status**:
  Stored in Apps Script's `UserProperties` (cross-spreadsheet
  preferences and learned aliases) and `DocumentProperties`
  (per-spreadsheet column mappings and progress status messages). These
  are kept on Google's servers under your Google account and are never
  transmitted off-device by the add-on.
- **Operational logs**: Unhandled errors are logged to Google Cloud
  Logging under the developer's GCP project (function names, file
  paths, and line numbers — no spreadsheet contents).

The add-on does not access any other Google data — no Drive files, no
Gmail, no Calendar, no Contacts. The add-on does not retain copies of
your spreadsheet data. The Placekey API processes addresses and
locations as described in
[Placekey's main privacy policy](https://www.placekey.io/privacy-policy).

**Deleting your data**: To revoke the add-on's access at any time, visit
your [Google Account permissions](https://myaccount.google.com/permissions).
UserProperties and DocumentProperties stored under your Google account
become inaccessible to the add-on once access is revoked. To request
deletion of any data held by the Placekey API, contact
[support@placekey.io](mailto:support@placekey.io).
