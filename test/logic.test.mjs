import { describe, it, expect, beforeAll } from "vitest";
import { loadCodeGS } from "./helpers.mjs";

let gs;

beforeAll(() => {
  gs = loadCodeGS();
});

// ==========================================
// Test data setup helpers
// ==========================================
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
// transformColumnMappings
// ==========================================
describe("transformColumnMappings", () => {
  it("transforms mapped fields to objects with column positions", () => {
    const result = gs.transformColumnMappings({ location_name: "Name", city: "City" }, ["Name", "Street", "City"]);

    expect(result.location_name).toEqual({
      columnName: "Name",
      columnNumber: 1,
      rowIndex: 0,
    });
    expect(result.city).toEqual({
      columnName: "City",
      columnNumber: 3,
      rowIndex: 2,
    });
  });

  it("preserves NO_INPUT_STRING for unmapped fields", () => {
    const result = gs.transformColumnMappings({ location_name: NO_INPUT, city: "City" }, ["City"]);

    expect(result.location_name).toBe(NO_INPUT);
    expect(result.city.rowIndex).toBe(0);
  });
});

// ==========================================
// mapRowToObject
// ==========================================
describe("mapRowToObject", () => {
  it("maps a complete row with real location data", () => {
    const mappings = buildMappings(FULL_HEADERS);
    const row = ["Twin Peaks Petroleum", "598 Portola Dr", "San Francisco", "CA", "94131", "37.7371", "-122.44283", "US", "", "", "", "", ""];
    const result = gs.mapRowToObject(row, mappings);

    expect(result.location_name).toBe("Twin Peaks Petroleum");
    expect(result.street_address).toBe("598 Portola Dr");
    expect(result.city).toBe("San Francisco");
    expect(result.region).toBe("CA");
    expect(result.postal_code).toBe("94131");
    expect(result.latitude).toBe("37.7371");
    expect(result.longitude).toBe("-122.44283");
    expect(result.iso_country_code).toBe("US");
  });

  it("returns empty strings for unmapped fields", () => {
    const mappings = buildMappings(FULL_HEADERS, {
      location_name: NO_INPUT,
      latitude: NO_INPUT,
      longitude: NO_INPUT,
    });
    const row = ["Twin Peaks Petroleum", "598 Portola Dr", "San Francisco", "CA", "94131", "37.7371", "-122.44283", "US", "", "", "", "", ""];
    const result = gs.mapRowToObject(row, mappings);

    expect(result.location_name).toBe("");
    expect(result.latitude).toBe("");
    expect(result.longitude).toBe("");
    expect(result.street_address).toBe("598 Portola Dr");
  });

  it("defaults iso_country_code to US when unmapped", () => {
    const mappings = buildMappings(FULL_HEADERS, { iso_country_code: NO_INPUT });
    const row = ["", "598 Portola Dr", "San Francisco", "CA", "94131", "", "", "", "", "", "", "", ""];
    const result = gs.mapRowToObject(row, mappings);

    expect(result.iso_country_code).toBe("US");
  });

  it("maps metadata fields correctly", () => {
    const mappings = buildMappings(FULL_HEADERS, {
      phone_number: "Phone",
      naics_code: "NAICS",
      website: "Website",
      store_id: "StoreID",
      mcc_code: "MCC",
    });
    const row = ["Shop", "123 Main St", "NYC", "NY", "10001", "", "", "US", "5551234567", "712120", "example.com", "S001", "9399"];
    const result = gs.mapRowToObject(row, mappings);

    expect(result.place_metadata.phone_number).toBe("5551234567");
    expect(result.place_metadata.naics_code).toBe("712120");
    expect(result.place_metadata.website).toBe("example.com");
    expect(result.place_metadata.store_id).toBe("S001");
    expect(result.place_metadata.mcc_code).toBe("9399");
  });
});

// ==========================================
// hasValidLatLongValues
// ==========================================
describe("hasValidLatLongValues", () => {
  it("returns true for valid numeric lat/long", () => {
    const obj = { latitude: "37.7371", longitude: "-122.44283" };
    expect(gs.hasValidLatLongValues(obj, ["latitude", "longitude"])).toBe(true);
  });

  it("returns false for non-numeric latitude", () => {
    const obj = { latitude: "not-a-number", longitude: "-122.44283" };
    expect(gs.hasValidLatLongValues(obj, ["latitude", "longitude"])).toBe(false);
  });

  it("returns false for non-numeric longitude", () => {
    const obj = { latitude: "37.7371", longitude: "abc" };
    expect(gs.hasValidLatLongValues(obj, ["latitude", "longitude"])).toBe(false);
  });

  it("returns true when lat/long not in keysWithValues", () => {
    const obj = { latitude: "bad", longitude: "bad" };
    expect(gs.hasValidLatLongValues(obj, ["city", "region"])).toBe(true);
  });

  it("handles zero as valid", () => {
    const obj = { latitude: "0", longitude: "0" };
    expect(gs.hasValidLatLongValues(obj, ["latitude", "longitude"])).toBe(true);
  });

  it("handles negative values", () => {
    const obj = { latitude: "-33.8688", longitude: "151.2093" };
    expect(gs.hasValidLatLongValues(obj, ["latitude", "longitude"])).toBe(true);
  });
});

// ==========================================
// isValidRow
// ==========================================
describe("isValidRow", () => {
  let mappings;
  beforeAll(() => {
    mappings = buildMappings(FULL_HEADERS);
  });

  it("valid: lat/long only", () => {
    const row = ["", "", "", "", "", "37.7371", "-122.44283", "", "", "", "", "", ""];
    const result = gs.isValidRow(row, mappings);
    expect(result.isValid).toBe(true);
  });

  it("valid: full address (street, city, region, postal, country)", () => {
    const row = ["Beretta", "1199 Valencia St", "San Francisco", "CA", "94110", "", "", "US", "", "", "", "", ""];
    const result = gs.isValidRow(row, mappings);
    expect(result.isValid).toBe(true);
  });

  it("valid: street, region, postal, country (no city)", () => {
    const row = ["", "1 Doyers St", "", "NY", "10013", "", "", "US", "", "", "", "", ""];
    const result = gs.isValidRow(row, mappings);
    expect(result.isValid).toBe(true);
  });

  it("valid: street, city, region, country (no postal)", () => {
    const row = ["", "1 Doyers St", "New York", "NY", "", "", "", "US", "", "", "", "", ""];
    const result = gs.isValidRow(row, mappings);
    expect(result.isValid).toBe(true);
  });

  it("valid: all fields populated", () => {
    const row = ["Twin Peaks Petroleum", "598 Portola Dr", "San Francisco", "CA", "94131", "37.7371", "-122.44283", "US", "", "", "", "", ""];
    const result = gs.isValidRow(row, mappings);
    expect(result.isValid).toBe(true);
  });

  it("invalid: completely empty row", () => {
    const row = ["", "", "", "", "", "", "", "", "", "", "", "", ""];
    const result = gs.isValidRow(row, mappings);
    expect(result.isValid).toBe(false);
    expect(result.message).toContain("no values");
  });

  it("invalid: only country code defaults to US (treated as empty)", () => {
    const mappingsNoCountry = buildMappings(FULL_HEADERS, { iso_country_code: NO_INPUT });
    const row = ["", "", "", "", "", "", "", "", "", "", "", "", ""];
    const result = gs.isValidRow(row, mappingsNoCountry);
    expect(result.isValid).toBe(false);
    expect(result.row.iso_country_code).toBe("US");
  });

  it("invalid: only location name (insufficient fields)", () => {
    const row = ["Twin Peaks Petroleum", "", "", "", "", "", "", "", "", "", "", "", ""];
    const result = gs.isValidRow(row, mappings);
    expect(result.isValid).toBe(false);
    expect(result.message).toContain("minimum input");
  });

  it("invalid: non-numeric lat/long with no other address fields", () => {
    const row = ["", "", "", "", "", "bad-lat", "bad-lng", "", "", "", "", "", ""];
    const result = gs.isValidRow(row, mappings);
    expect(result.isValid).toBe(false);
    expect(result.message).toContain("latitude or longitude");
  });

  it("valid: non-numeric lat/long dropped when other address fields sufficient", () => {
    const row = ["Beretta", "1199 Valencia St", "San Francisco", "CA", "94110", "bad", "bad", "US", "", "", "", "", ""];
    const result = gs.isValidRow(row, mappings);
    expect(result.isValid).toBe(true);
    expect(result.row.latitude).toBeUndefined();
    expect(result.row.longitude).toBeUndefined();
  });

  it("invalid: street only (no city, region, postal, or lat/long)", () => {
    const row = ["", "598 Portola Dr", "", "", "", "", "", "", "", "", "", "", ""];
    const result = gs.isValidRow(row, mappings);
    expect(result.isValid).toBe(false);
  });
});

// ==========================================
// validateAllRows
// ==========================================
describe("validateAllRows", () => {
  let mappings;
  beforeAll(() => {
    mappings = buildMappings(FULL_HEADERS);
  });

  const sampleRows = [
    ["Twin Peaks Petroleum", "598 Portola Dr", "San Francisco", "CA", "94131", "37.7371", "-122.44283", "US", "", "", "", "", ""],
    ["", "", "", "", "", "37.7371", "-122.44283", "", "", "", "", "", ""],
    ["Beretta", "1199 Valencia St", "San Francisco", "CA", "94110", "", "", "US", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", "", "", "", "", ""],
    ["", "only street", "", "", "", "", "", "", "", "", "", "", ""],
  ];

  it("separates valid and invalid rows", () => {
    const result = gs.validateAllRows(sampleRows, mappings, true);

    expect(result.sortedValidIndexes).toEqual([0, 1, 2]);
    expect(Object.keys(result.validRows)).toHaveLength(3);
  });

  it("collects error rows when insertError is true", () => {
    const result = gs.validateAllRows(sampleRows, mappings, true);

    // Row 3 is empty (no error collected), row 4 has insufficient fields (error collected)
    expect(result.sortedInvalidIndexes).toEqual([4]);
    expect(result.errorRows[4]).toContain("minimum input");
  });

  it("does not collect error rows when insertError is false", () => {
    const result = gs.validateAllRows(sampleRows, mappings, false);

    expect(result.sortedInvalidIndexes).toEqual([]);
    expect(Object.keys(result.errorRows)).toHaveLength(0);
  });

  it("does not collect empty row errors even with insertError", () => {
    const result = gs.validateAllRows(sampleRows, mappings, true);

    // Row 3 is empty — should NOT appear in errorRows
    expect(result.errorRows[3]).toBeUndefined();
  });

  it("returns sorted indexes", () => {
    const result = gs.validateAllRows(sampleRows, mappings, false);

    expect(result.sortedValidIndexes).toEqual([0, 1, 2]);
    for (let i = 1; i < result.sortedValidIndexes.length; i++) {
      expect(result.sortedValidIndexes[i]).toBeGreaterThan(result.sortedValidIndexes[i - 1]);
    }
  });

  it("handles all-valid input", () => {
    const allValid = [sampleRows[0], sampleRows[1], sampleRows[2]];
    const result = gs.validateAllRows(allValid, mappings, true);

    expect(result.sortedValidIndexes).toEqual([0, 1, 2]);
    expect(result.sortedInvalidIndexes).toEqual([]);
  });

  it("handles all-invalid input", () => {
    const allInvalid = [sampleRows[3], sampleRows[4]];
    const result = gs.validateAllRows(allInvalid, mappings, true);

    expect(result.sortedValidIndexes).toEqual([]);
    expect(Object.keys(result.validRows)).toHaveLength(0);
  });
});

// ==========================================
// prepareOutputFields
// ==========================================
describe("prepareOutputFields", () => {
  it("appends new fields after existing columns", () => {
    const fields = gs.prepareOutputFields(["placekey", "confidence_score"], ["Name", "Street"]);

    expect(fields.placekey.columnIndex).toBe(2);
    expect(fields.confidence_score.columnIndex).toBe(3);
  });

  it("reuses existing column position (case-insensitive)", () => {
    const fields = gs.prepareOutputFields(["placekey"], ["Name", "Street", "Placekey"]);

    expect(fields.placekey.columnIndex).toBe(2);
  });

  it("is case-insensitive when matching existing columns", () => {
    const fields = gs.prepareOutputFields(["placekey"], ["Name", "PLACEKEY"]);

    expect(fields.placekey.columnIndex).toBe(1);
  });

  it("skips geocode field name", () => {
    const fields = gs.prepareOutputFields(["placekey", "geocode", "confidence_score"], ["Name"]);

    expect(fields.geocode).toBeUndefined();
    expect(fields.placekey).toBeDefined();
    expect(fields.confidence_score).toBeDefined();
  });

  it("formats display names from snake_case to Title Case", () => {
    const fields = gs.prepareOutputFields(["confidence_score", "address_placekey"], []);

    expect(fields.confidence_score.displayName).toBe("Confidence Score");
    expect(fields.address_placekey.displayName).toBe("Address Placekey");
  });

  it("does not create gaps when reusing existing columns", () => {
    const fields = gs.prepareOutputFields(["placekey", "confidence_score", "gers"], ["Name", "Placekey"]);

    // placekey reuses index 1, confidence_score and gers are appended at 2 and 3
    expect(fields.placekey.columnIndex).toBe(1);
    expect(fields.confidence_score.columnIndex).toBe(2);
    expect(fields.gers.columnIndex).toBe(3);
  });
});

// ==========================================
// getStatusKey
// ==========================================
describe("getStatusKey", () => {
  it("appends 'status' to the key", () => {
    expect(gs.getStatusKey("abc123")).toBe("abc123status");
  });
});
