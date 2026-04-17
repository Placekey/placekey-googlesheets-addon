import { describe, it, expect, beforeAll } from "vitest";
import { loadCodeGS } from "./helpers.mjs";

let gs;

beforeAll(() => {
  gs = loadCodeGS();
});

const NO_INPUT = "--";
const FULL_HEADERS = ["Name", "Street Address", "City", "State", "Zip", "Lat", "Lng", "Country", "Phone", "NAICS", "Website", "StoreID", "MCC"];

function buildMappings(colsHeader, overrides = {}) {
  const base = {
    location_name: "Name",
    street_address: "Street Address",
    city: "City",
    region: "State",
    postal_code: "Zip",
    latitude: "Lat",
    longitude: "Lng",
    iso_country_code: "Country",
    store_id: NO_INPUT,
    phone_number: NO_INPUT,
    website: NO_INPUT,
    naics_code: NO_INPUT,
    mcc_code: NO_INPUT,
    ...overrides,
  };
  return gs.transformColumnMappings(base, colsHeader);
}

// ==========================================
// transformColumnMappings edge cases
// ==========================================
describe("transformColumnMappings edge cases", () => {
  it("returns rowIndex -1 when column not found in header", () => {
    const result = gs.transformColumnMappings({ city: "NonExistent" }, ["Name", "Street"]);
    expect(result.city.rowIndex).toBe(-1);
    expect(result.city.columnNumber).toBe(0);
  });

  it("uses first occurrence when duplicate column names exist", () => {
    const result = gs.transformColumnMappings({ city: "City" }, ["City", "Other", "City"]);
    expect(result.city.rowIndex).toBe(0);
  });

  it("handles all fields unmapped", () => {
    const result = gs.transformColumnMappings({ location_name: NO_INPUT, city: NO_INPUT, region: NO_INPUT }, ["Name", "City"]);
    expect(result.location_name).toBe(NO_INPUT);
    expect(result.city).toBe(NO_INPUT);
    expect(result.region).toBe(NO_INPUT);
  });
});

// ==========================================
// mapRowToObject edge cases
// ==========================================
describe("mapRowToObject edge cases", () => {
  it("returns undefined for fields when row is shorter than expected index", () => {
    const mappings = buildMappings(FULL_HEADERS);
    const shortRow = ["Name", "Street", "City"];
    const result = gs.mapRowToObject(shortRow, mappings);
    expect(result.location_name).toBe("Name");
    expect(result.region).toBeUndefined();
    expect(result.latitude).toBeUndefined();
  });
});

// ==========================================
// hasValidLatLongValues edge cases
// ==========================================
describe("hasValidLatLongValues edge cases", () => {
  it("returns false for empty string latitude", () => {
    expect(gs.hasValidLatLongValues({ latitude: "" }, ["latitude"])).toBe(false);
  });

  it("returns false for whitespace-only values", () => {
    expect(gs.hasValidLatLongValues({ latitude: "   " }, ["latitude"])).toBe(false);
  });

  it("handles scientific notation as valid", () => {
    expect(gs.hasValidLatLongValues({ latitude: "3.7e1", longitude: "-1.22e2" }, ["latitude", "longitude"])).toBe(true);
  });

  it("checks only fields present in keysWithValues", () => {
    const obj = { latitude: "37.7", longitude: "bad" };
    expect(gs.hasValidLatLongValues(obj, ["latitude"])).toBe(true);
  });
});

// ==========================================
// isValidRow edge cases
// ==========================================
describe("isValidRow edge cases", () => {
  let mappings;
  beforeAll(() => {
    mappings = buildMappings(FULL_HEADERS);
  });

  it("invalid: only latitude provided (no longitude)", () => {
    const row = ["", "", "", "", "", "37.7", "", "", "", "", "", "", ""];
    const result = gs.isValidRow(row, mappings);
    expect(result.isValid).toBe(false);
  });

  it("invalid: only longitude provided (no latitude)", () => {
    const row = ["", "", "", "", "", "", "-122.4", "", "", "", "", "", ""];
    const result = gs.isValidRow(row, mappings);
    expect(result.isValid).toBe(false);
  });

  it("valid: lat+long plus location name (lat+long sufficient)", () => {
    const row = ["Shop", "", "", "", "", "37.7", "-122.4", "", "", "", "", "", ""];
    const result = gs.isValidRow(row, mappings);
    expect(result.isValid).toBe(true);
  });

  it("valid: bad lat/long + street+city+region (country defaults to US)", () => {
    const noCountryMappings = buildMappings(FULL_HEADERS, { iso_country_code: NO_INPUT });
    const row = ["", "123 Main", "NYC", "NY", "", "bad", "bad", "", "", "", "", "", ""];
    const result = gs.isValidRow(row, noCountryMappings);
    // After dropping bad lat/long: street+city+region+iso_country_code("US" default) meets minimum
    expect(result.isValid).toBe(true);
  });

  it("invalid: iso_country_code only value when mapped", () => {
    const row = ["", "", "", "", "", "", "", "UK", "", "", "", "", ""];
    const result = gs.isValidRow(row, mappings);
    expect(result.isValid).toBe(false);
    expect(result.message).toContain("no values");
  });
});

// ==========================================
// validateAllRows edge cases
// ==========================================
describe("validateAllRows edge cases", () => {
  let mappings;
  beforeAll(() => {
    mappings = buildMappings(FULL_HEADERS);
  });

  it("handles empty input array", () => {
    const result = gs.validateAllRows([], mappings, true);
    expect(result.sortedValidIndexes).toEqual([]);
    expect(result.sortedInvalidIndexes).toEqual([]);
    expect(Object.keys(result.validRows)).toHaveLength(0);
    expect(Object.keys(result.errorRows)).toHaveLength(0);
  });

  it("single valid row", () => {
    const rows = [["", "", "", "", "", "37.7", "-122.4", "", "", "", "", "", ""]];
    const result = gs.validateAllRows(rows, mappings, true);
    expect(result.sortedValidIndexes).toEqual([0]);
  });

  it("single non-empty invalid row with insertError collects error", () => {
    const rows = [["Shop", "", "", "", "", "", "", "", "", "", "", "", ""]];
    const result = gs.validateAllRows(rows, mappings, true);
    expect(result.sortedInvalidIndexes).toEqual([0]);
    expect(result.errorRows[0]).toContain("minimum input");
  });

  it("preserves original row indexes (not re-indexed)", () => {
    const rows = [
      ["", "", "", "", "", "", "", "", "", "", "", "", ""], // 0: empty
      ["", "", "", "", "", "37.7", "-122.4", "", "", "", "", "", ""], // 1: valid
      ["", "", "", "", "", "", "", "", "", "", "", "", ""], // 2: empty
      ["", "", "", "", "", "40.7", "-74.0", "", "", "", "", "", ""], // 3: valid
    ];
    const result = gs.validateAllRows(rows, mappings, false);
    expect(result.sortedValidIndexes).toEqual([1, 3]);
  });
});

// ==========================================
// prepareOutputFields edge cases
// ==========================================
describe("prepareOutputFields edge cases", () => {
  it("returns empty object for empty field names", () => {
    const fields = gs.prepareOutputFields([], ["Name"]);
    expect(Object.keys(fields)).toHaveLength(0);
  });

  it("formats single-word field name", () => {
    const fields = gs.prepareOutputFields(["placekey"], []);
    expect(fields.placekey.displayName).toBe("Placekey");
  });

  it("formats placekey_error correctly", () => {
    const fields = gs.prepareOutputFields(["placekey_error"], []);
    expect(fields.placekey_error.displayName).toBe("Placekey Error");
  });

  it("handles geocode sub-fields", () => {
    const fields = gs.prepareOutputFields(["geocode_latitude", "geocode_longitude", "geocode_lat_long", "geocode_precision"], []);
    expect(fields.geocode_latitude.displayName).toBe("Geocode Latitude");
    expect(fields.geocode_longitude.displayName).toBe("Geocode Longitude");
    expect(fields.geocode_lat_long.displayName).toBe("Geocode Lat Long");
    expect(fields.geocode_precision.displayName).toBe("Geocode Precision");
    // Sequential indexes
    expect(fields.geocode_latitude.columnIndex).toBe(0);
    expect(fields.geocode_longitude.columnIndex).toBe(1);
    expect(fields.geocode_lat_long.columnIndex).toBe(2);
    expect(fields.geocode_precision.columnIndex).toBe(3);
  });

  it("reuses multiple existing columns without gaps", () => {
    const fields = gs.prepareOutputFields(["placekey", "gers"], ["Name", "Gers", "Street", "Placekey"]);
    expect(fields.placekey.columnIndex).toBe(3);
    expect(fields.gers.columnIndex).toBe(1);
  });
});
