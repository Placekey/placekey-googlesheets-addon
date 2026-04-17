import { describe, it, expect, beforeAll } from "vitest";
import { loadCodeGS } from "./helpers.mjs";

let gs;

beforeAll(() => {
  gs = loadCodeGS();
});

const NO_INPUT = "--";

// ==========================================
// Full pipeline: transform → validate → prepare
// ==========================================
describe("full validation pipeline", () => {
  it("chains transform → validate → prepareOutputFields correctly", () => {
    const headers = ["Name", "Street", "City", "State", "Zip"];
    const raw = {
      location_name: "Name",
      street_address: "Street",
      city: "City",
      region: "State",
      postal_code: "Zip",
      latitude: NO_INPUT,
      longitude: NO_INPUT,
      iso_country_code: NO_INPUT,
      store_id: NO_INPUT,
      phone_number: NO_INPUT,
      website: NO_INPUT,
      naics_code: NO_INPUT,
      mcc_code: NO_INPUT,
    };

    const transformed = gs.transformColumnMappings(raw, headers);

    const rows = [
      ["Shop A", "123 Main St", "NYC", "NY", "10001"],
      ["Shop B", "456 Oak Ave", "LA", "CA", "90001"],
      ["", "", "", "", ""], // empty
      ["Shop C", "", "", "", ""], // insufficient: name only
    ];

    const { validRows, sortedValidIndexes, sortedInvalidIndexes, errorRows } = gs.validateAllRows(rows, transformed, true);

    expect(sortedValidIndexes).toEqual([0, 1]);
    expect(sortedInvalidIndexes).toEqual([3]);
    expect(errorRows[3]).toContain("minimum input");

    // Validate the row objects have expected shape
    expect(validRows[0].street_address).toBe("123 Main St");
    expect(validRows[0].iso_country_code).toBe("US"); // defaulted
    expect(validRows[1].city).toBe("LA");

    // Prepare output fields
    const fields = gs.prepareOutputFields(["placekey", "confidence_score"], headers);
    expect(fields.placekey.columnIndex).toBe(5); // appended after 5 headers
    expect(fields.confidence_score.columnIndex).toBe(6);
  });
});

// ==========================================
// Sample data acceptance test
// ==========================================
describe("sample data acceptance", () => {
  it("all sample data rows validate as expected", () => {
    const sampleHeaders = ["Name", "Street Address", "City", "State", "Zip code", "Latitude", "Longitude", "Country"];
    const sampleMappings = gs.transformColumnMappings(
      {
        location_name: "Name",
        street_address: "Street Address",
        city: "City",
        region: "State",
        postal_code: "Zip code",
        latitude: "Latitude",
        longitude: "Longitude",
        iso_country_code: "Country",
        store_id: NO_INPUT,
        phone_number: NO_INPUT,
        website: NO_INPUT,
        naics_code: NO_INPUT,
        mcc_code: NO_INPUT,
      },
      sampleHeaders,
    );

    // Exact sample data from insertSample()
    const sampleRows = [
      ["Twin Peaks Petroleum", "598 Portola Dr", "San Francisco", "CA", "94131", "37.7371", "-122.44283", "US"],
      ["", "", "", "", "", "37.7371", "-122.44283", "US"],
      ["Beretta", "1199 Valencia St", "San Francisco", "CA", "94110", "", "", "US"],
      ["Tasty Hand Pulled Noodle", "1 Doyers St", "New York", "ny", "10013", "", "", "US"],
      ["", "1 Doyers St", "New York", "NY", "10013", "", "", "US"],
    ];

    const result = gs.validateAllRows(sampleRows, sampleMappings, true);

    // All 5 sample rows should be valid
    expect(result.sortedValidIndexes).toEqual([0, 1, 2, 3, 4]);
    expect(result.sortedInvalidIndexes).toEqual([]);

    // Verify specific row shapes
    expect(result.validRows[0].location_name).toBe("Twin Peaks Petroleum");
    expect(result.validRows[0].latitude).toBe("37.7371");
    expect(result.validRows[1].iso_country_code).toBe("US");
    expect(result.validRows[3].region).toBe("ny"); // lowercase preserved
  });
});

// ==========================================
// Constants consistency (verified indirectly through function behavior)
// ==========================================
describe("constants consistency", () => {
  const SAMPLE_HEADERS = ["Name", "Street", "City", "State", "Zip", "Lat", "Lng", "Country"];

  function makeMappings(mapped) {
    const all = {
      location_name: NO_INPUT,
      street_address: NO_INPUT,
      city: NO_INPUT,
      region: NO_INPUT,
      postal_code: NO_INPUT,
      latitude: NO_INPUT,
      longitude: NO_INPUT,
      iso_country_code: NO_INPUT,
      store_id: NO_INPUT,
      phone_number: NO_INPUT,
      website: NO_INPUT,
      naics_code: NO_INPUT,
      mcc_code: NO_INPUT,
      ...mapped,
    };
    return gs.transformColumnMappings(all, SAMPLE_HEADERS);
  }

  it("accepts lat+long as minimum input", () => {
    const m = makeMappings({ latitude: "Lat", longitude: "Lng" });
    const row = ["", "", "", "", "", "37.7", "-122.4", ""];
    expect(gs.isValidRow(row, m).isValid).toBe(true);
  });

  it("accepts street+city+region+postal+country as minimum input", () => {
    const m = makeMappings({ street_address: "Street", city: "City", region: "State", postal_code: "Zip", iso_country_code: "Country" });
    const row = ["", "123 Main", "NYC", "NY", "10001", "", "", "US"];
    expect(gs.isValidRow(row, m).isValid).toBe(true);
  });

  it("accepts street+region+postal+country as minimum input", () => {
    const m = makeMappings({ street_address: "Street", region: "State", postal_code: "Zip", iso_country_code: "Country" });
    const row = ["", "123 Main", "", "NY", "10001", "", "", "US"];
    expect(gs.isValidRow(row, m).isValid).toBe(true);
  });

  it("accepts street+city+region+country as minimum input", () => {
    const m = makeMappings({ street_address: "Street", city: "City", region: "State", iso_country_code: "Country" });
    const row = ["", "123 Main", "NYC", "NY", "", "", "", "US"];
    expect(gs.isValidRow(row, m).isValid).toBe(true);
  });

  it("rejects lat only (not a valid minimum set)", () => {
    const m = makeMappings({ latitude: "Lat" });
    const row = ["", "", "", "", "", "37.7", "", ""];
    expect(gs.isValidRow(row, m).isValid).toBe(false);
  });

  it("rejects street+city only (not a valid minimum set)", () => {
    const m = makeMappings({ street_address: "Street", city: "City" });
    const row = ["", "123 Main", "NYC", "", "", "", "", ""];
    expect(gs.isValidRow(row, m).isValid).toBe(false);
  });

  it("mapRowToObject produces all expected main fields", () => {
    const m = makeMappings({
      location_name: "Name",
      street_address: "Street",
      city: "City",
      region: "State",
      postal_code: "Zip",
      latitude: "Lat",
      longitude: "Lng",
      iso_country_code: "Country",
    });
    const row = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const result = gs.mapRowToObject(row, m);
    // Verify all main fields are present
    for (const field of ["location_name", "street_address", "city", "region", "postal_code", "latitude", "longitude", "iso_country_code"]) {
      expect(result).toHaveProperty(field);
    }
    // Verify metadata sub-object exists with expected keys
    for (const field of ["store_id", "phone_number", "website", "naics_code", "mcc_code"]) {
      expect(result.place_metadata).toHaveProperty(field);
    }
  });

  it("prepareOutputFields skips geocode but keeps geocode sub-fields", () => {
    const fields = gs.prepareOutputFields(["geocode", "geocode_latitude", "geocode_longitude"], []);
    expect(fields.geocode).toBeUndefined();
    expect(fields.geocode_latitude).toBeDefined();
    expect(fields.geocode_longitude).toBeDefined();
  });
});
