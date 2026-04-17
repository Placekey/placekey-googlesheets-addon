// @vitest-environment happy-dom
import { describe, it, expect, beforeAll } from "vitest";
import { loadClientFunctions } from "./client-helpers.mjs";

let client;

beforeAll(() => {
  // Pass real DOM globals from happy-dom environment
  client = loadClientFunctions({ document });
});

// ==========================================
// minimumInputProvided (pure logic, no DOM)
// ==========================================
describe("minimumInputProvided", () => {
  it("returns true for lat+long", () => {
    expect(client.minimumInputProvided({ latitude: "Lat", longitude: "Lng", city: "--", region: "--", street_address: "--", postal_code: "--", iso_country_code: "--" })).toBe(true);
  });

  it("returns true for street+city+region+postal+country", () => {
    expect(
      client.minimumInputProvided({
        latitude: "--",
        longitude: "--",
        street_address: "Street",
        city: "City",
        region: "State",
        postal_code: "Zip",
        iso_country_code: "Country",
      }),
    ).toBe(true);
  });

  it("returns true for street+region+postal+country (no city)", () => {
    expect(
      client.minimumInputProvided({
        latitude: "--",
        longitude: "--",
        street_address: "Street",
        city: "--",
        region: "State",
        postal_code: "Zip",
        iso_country_code: "Country",
      }),
    ).toBe(true);
  });

  it("returns true for street+city+region+country (no postal)", () => {
    expect(
      client.minimumInputProvided({
        latitude: "--",
        longitude: "--",
        street_address: "Street",
        city: "City",
        region: "State",
        postal_code: "--",
        iso_country_code: "Country",
      }),
    ).toBe(true);
  });

  it("returns false when nothing mapped", () => {
    expect(
      client.minimumInputProvided({
        latitude: "--",
        longitude: "--",
        street_address: "--",
        city: "--",
        region: "--",
        postal_code: "--",
        iso_country_code: "--",
      }),
    ).toBe(false);
  });

  it("returns false for only latitude (no longitude)", () => {
    expect(client.minimumInputProvided({ latitude: "Lat", longitude: "--", street_address: "--", city: "--", region: "--", postal_code: "--", iso_country_code: "--" })).toBe(false);
  });

  it("returns false for street+city only (insufficient)", () => {
    expect(
      client.minimumInputProvided({
        latitude: "--",
        longitude: "--",
        street_address: "Street",
        city: "City",
        region: "--",
        postal_code: "--",
        iso_country_code: "--",
      }),
    ).toBe(false);
  });
});

// ==========================================
// hasDuplicateMappings (pure logic, no DOM)
// ==========================================
describe("hasDuplicateMappings", () => {
  it("returns false when no duplicates", () => {
    expect(client.hasDuplicateMappings({ a: "Col1", b: "Col2", c: "--" })).toBe(false);
  });

  it("returns true when two fields map to same column", () => {
    expect(client.hasDuplicateMappings({ a: "Col1", b: "Col1", c: "--" })).toBe(true);
  });

  it("returns false when all unmapped (-- values filtered out)", () => {
    expect(client.hasDuplicateMappings({ a: "--", b: "--", c: "--" })).toBe(false);
  });

  it("returns false for single mapped field", () => {
    expect(client.hasDuplicateMappings({ a: "Col1", b: "--" })).toBe(false);
  });

  it("detects duplicates among many fields", () => {
    expect(client.hasDuplicateMappings({ a: "A", b: "B", c: "C", d: "B", e: "--" })).toBe(true);
  });
});

// ==========================================
// escapeHtml (needs DOM)
// ==========================================
describe("escapeHtml", () => {
  it("returns normal strings unchanged", () => {
    expect(client.escapeHtml("Hello World")).toBe("Hello World");
  });

  it("escapes < and > (prevents tag injection)", () => {
    const result = client.escapeHtml("<script>alert('xss')</script>");
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;script&gt;");
  });

  it("escapes &", () => {
    expect(client.escapeHtml("A & B")).toContain("&amp;");
  });

  it("does not escape double quotes (safe in text nodes, not attributes)", () => {
    const result = client.escapeHtml('value="injected"');
    // createTextNode does not escape " — quotes are only special in attribute context
    // The escapeHtml function is used for option text/values, which are safe
    expect(result).toContain('"');
  });

  it("handles empty string", () => {
    expect(client.escapeHtml("")).toBe("");
  });

  it("handles string with only special characters", () => {
    const result = client.escapeHtml('<>&"');
    expect(result).not.toContain("<");
    expect(result).not.toContain(">");
  });
});

// ==========================================
// buildSheetOptions (needs DOM for escapeHtml)
// ==========================================
describe("buildSheetOptions", () => {
  it("marks active sheet as selected", () => {
    const html = client.buildSheetOptions(["Sheet1", "Sheet2"], "Sheet1");
    expect(html).toContain('value="Sheet1" selected');
    expect(html).not.toContain('value="Sheet2" selected');
  });

  it("produces option tags for all sheets", () => {
    const html = client.buildSheetOptions(["A", "B", "C"], "B");
    expect(html).toContain("A</option>");
    expect(html).toContain("B</option>");
    expect(html).toContain("C</option>");
  });

  it("escapes HTML in sheet names", () => {
    const html = client.buildSheetOptions(["<img src=x onerror=alert(1)>"], "other");
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("returns empty string for empty array", () => {
    expect(client.buildSheetOptions([], "Sheet1")).toBe("");
  });
});

// ==========================================
// buildColumnOptions (needs DOM for escapeHtml)
// ==========================================
describe("buildColumnOptions", () => {
  it("starts with default 'none' option", () => {
    const html = client.buildColumnOptions(["Col1"]);
    expect(html.startsWith('<option value="--">')).toBe(true);
    expect(html).toContain('value="--"');
  });

  it("includes non-empty column names", () => {
    const html = client.buildColumnOptions(["Name", "Street", "City"]);
    expect(html).toContain("Name</option>");
    expect(html).toContain("Street</option>");
    expect(html).toContain("City</option>");
  });

  it("skips empty strings", () => {
    const html = client.buildColumnOptions(["Name", "", "City"]);
    const optionCount = (html.match(/<option/g) || []).length;
    expect(optionCount).toBe(3); // -- + Name + City (empty skipped)
  });

  it("escapes HTML in column names", () => {
    const html = client.buildColumnOptions(["<script>evil</script>"]);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("returns only default option for empty array", () => {
    const html = client.buildColumnOptions([]);
    expect(html).toMatch(/^<option value="--">.*<\/option>$/);
    expect((html.match(/<option/g) || []).length).toBe(1);
  });
});

// ==========================================
// computeAutomap (pure logic, no DOM needed)
// ==========================================
describe("computeAutomap", () => {
  it("maps the exact sample data headers correctly", () => {
    const headers = ["Name", "Street Address", "City", "State", "Zip code", "Latitude", "Longitude", "Country"];
    const result = client.computeAutomap(headers);
    expect(result.location_name).toBe("Name");
    expect(result.street_address).toBe("Street Address");
    expect(result.city).toBe("City");
    expect(result.region).toBe("State");
    expect(result.postal_code).toBe("Zip code");
    expect(result.latitude).toBe("Latitude");
    expect(result.longitude).toBe("Longitude");
    expect(result.iso_country_code).toBe("Country");
  });

  it("is case-insensitive", () => {
    const result = client.computeAutomap(["NAME", "street address", "City"]);
    expect(result.location_name).toBe("NAME");
    expect(result.street_address).toBe("street address");
    expect(result.city).toBe("City");
  });

  it("trims whitespace", () => {
    const result = client.computeAutomap(["  Name  ", "  City  "]);
    expect(result.location_name).toBe("  Name  ");
    expect(result.city).toBe("  City  ");
  });

  it("recognizes common abbreviations", () => {
    const result = client.computeAutomap(["Lat", "Lng", "Zip"]);
    expect(result.latitude).toBe("Lat");
    expect(result.longitude).toBe("Lng");
    expect(result.postal_code).toBe("Zip");
  });

  it("maps metadata headers", () => {
    const result = client.computeAutomap(["Phone", "NAICS", "Website", "Store ID", "MCC"]);
    expect(result.phone_number).toBe("Phone");
    expect(result.naics_code).toBe("NAICS");
    expect(result.website).toBe("Website");
    expect(result.store_id).toBe("Store ID");
    expect(result.mcc_code).toBe("MCC");
  });

  it("skips empty header strings", () => {
    const result = client.computeAutomap(["Name", "", "City"]);
    expect(result.location_name).toBe("Name");
    expect(result.city).toBe("City");
  });

  it("returns empty object when no headers match", () => {
    const result = client.computeAutomap(["Foo", "Bar", "Baz"]);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("first match wins when multiple headers map to the same field", () => {
    const result = client.computeAutomap(["Name", "Business Name"]);
    // Both "Name" and "Business Name" map to location_name — first wins
    expect(result.location_name).toBe("Name");
  });

  it("handles empty array", () => {
    const result = client.computeAutomap([]);
    expect(result).toEqual({});
  });

  it("learned aliases map custom headers to fields", () => {
    // Learned alias keys are normalized (stripped of delimiters) same as built-ins
    const learned = { locationn: "location_name", bizstreet: "street_address" };
    const result = client.computeAutomap(["Location_N", "Biz_Street", "City"], learned);
    expect(result.location_name).toBe("Location_N");
    expect(result.street_address).toBe("Biz_Street");
    expect(result.city).toBe("City"); // falls back to built-in
  });

  it("learned aliases take priority over built-in aliases", () => {
    // User learned that "Name" should map to store_id (unusual, but user's choice)
    const learned = { name: "store_id" };
    const result = client.computeAutomap(["Name"], learned);
    expect(result.store_id).toBe("Name");
    expect(result.location_name).toBeUndefined();
  });

  it("built-in aliases still work when learned aliases is empty", () => {
    const result = client.computeAutomap(["Name", "City"], {});
    expect(result.location_name).toBe("Name");
    expect(result.city).toBe("City");
  });

  it("learned aliases match across delimiter variants", () => {
    // Same learned alias matches different delimiter styles
    const learned = { locationn: "location_name" };
    expect(client.computeAutomap(["Location_N"], learned).location_name).toBe("Location_N");
    expect(client.computeAutomap(["Location N"], learned).location_name).toBe("Location N");
    expect(client.computeAutomap(["location-n"], learned).location_name).toBe("location-n");
    expect(client.computeAutomap(["LOCATIONN"], learned).location_name).toBe("LOCATIONN");
  });

  it("built-in aliases match across delimiter variants", () => {
    // "Store ID", "store_id", "store-id", "StoreID" all map to store_id
    expect(client.computeAutomap(["Store ID"]).store_id).toBe("Store ID");
    expect(client.computeAutomap(["store_id"]).store_id).toBe("store_id");
    expect(client.computeAutomap(["store-id"]).store_id).toBe("store-id");
    expect(client.computeAutomap(["StoreID"]).store_id).toBe("StoreID");
  });

  it("recognizes expanded vocabulary for location_name", () => {
    expect(client.computeAutomap(["Business Name"]).location_name).toBe("Business Name");
    expect(client.computeAutomap(["Company"]).location_name).toBe("Company");
    expect(client.computeAutomap(["DBA"]).location_name).toBe("DBA");
    expect(client.computeAutomap(["Venue"]).location_name).toBe("Venue");
    expect(client.computeAutomap(["Place Name"]).location_name).toBe("Place Name");
  });

  it("recognizes expanded vocabulary for addresses and regions", () => {
    expect(client.computeAutomap(["Address Line 1"]).street_address).toBe("Address Line 1");
    expect(client.computeAutomap(["Street 1"]).street_address).toBe("Street 1");
    expect(client.computeAutomap(["Line 1"]).street_address).toBe("Line 1");
    expect(client.computeAutomap(["Locality"]).city).toBe("Locality");
    expect(client.computeAutomap(["Province"]).region).toBe("Province");
    expect(client.computeAutomap(["State Code"]).region).toBe("State Code");
  });

  it("recognizes expanded vocabulary for coordinates", () => {
    expect(client.computeAutomap(["Y"]).latitude).toBe("Y");
    expect(client.computeAutomap(["X"]).longitude).toBe("X");
    expect(client.computeAutomap(["Lat_DD"]).latitude).toBe("Lat_DD");
    expect(client.computeAutomap(["YCoord"]).latitude).toBe("YCoord");
  });

  it("recognizes expanded vocabulary for country codes", () => {
    expect(client.computeAutomap(["Country Code"]).iso_country_code).toBe("Country Code");
    expect(client.computeAutomap(["ISO2"]).iso_country_code).toBe("ISO2");
    expect(client.computeAutomap(["CC"]).iso_country_code).toBe("CC");
    expect(client.computeAutomap(["Nation"]).iso_country_code).toBe("Nation");
  });

  it("recognizes expanded vocabulary for metadata fields", () => {
    expect(client.computeAutomap(["Mobile"]).phone_number).toBe("Mobile");
    expect(client.computeAutomap(["Contact Number"]).phone_number).toBe("Contact Number");
    expect(client.computeAutomap(["Store Number"]).store_id).toBe("Store Number");
    expect(client.computeAutomap(["Site ID"]).store_id).toBe("Site ID");
    expect(client.computeAutomap(["Branch ID"]).store_id).toBe("Branch ID");
    expect(client.computeAutomap(["Domain"]).website).toBe("Domain");
    expect(client.computeAutomap(["Merchant Category"]).mcc_code).toBe("Merchant Category");
  });

  it("maps a typical US headers row", () => {
    const headers = ["Business Name", "Street Address", "City", "State", "ZIP Code", "Country"];
    const result = client.computeAutomap(headers);
    expect(result.location_name).toBe("Business Name");
    expect(result.street_address).toBe("Street Address");
    expect(result.city).toBe("City");
    expect(result.region).toBe("State");
    expect(result.postal_code).toBe("ZIP Code");
    expect(result.iso_country_code).toBe("Country");
  });

  it("maps a typical Canadian headers row", () => {
    const headers = ["Company", "Street", "City", "Province", "Postal Code", "Country Code"];
    const result = client.computeAutomap(headers);
    expect(result.location_name).toBe("Company");
    expect(result.street_address).toBe("Street");
    expect(result.city).toBe("City");
    expect(result.region).toBe("Province");
    expect(result.postal_code).toBe("Postal Code");
    expect(result.iso_country_code).toBe("Country Code");
  });

  it("maps a typical UK headers row", () => {
    const headers = ["Business", "Address Line 1", "Town", "County", "Postcode", "Country"];
    const result = client.computeAutomap(headers);
    expect(result.location_name).toBe("Business");
    expect(result.street_address).toBe("Address Line 1");
    expect(result.city).toBe("Town");
    expect(result.region).toBe("County");
    expect(result.postal_code).toBe("Postcode");
    expect(result.iso_country_code).toBe("Country");
  });

  it("recognizes Canadian-specific region terms", () => {
    expect(client.computeAutomap(["Prov"]).region).toBe("Prov");
    expect(client.computeAutomap(["Province Code"]).region).toBe("Province Code");
    expect(client.computeAutomap(["Territory"]).region).toBe("Territory");
    expect(client.computeAutomap(["Province/Territory"]).region).toBe("Province/Territory");
  });

  it("recognizes UK-specific terms", () => {
    expect(client.computeAutomap(["County"]).region).toBe("County");
    expect(client.computeAutomap(["Postcode"]).postal_code).toBe("Postcode");
    expect(client.computeAutomap(["Eircode"]).postal_code).toBe("Eircode");
    expect(client.computeAutomap(["Village"]).city).toBe("Village");
    expect(client.computeAutomap(["Road"]).street_address).toBe("Road");
  });

  it("recognizes expanded ISO country variants", () => {
    expect(client.computeAutomap(["ISO"]).iso_country_code).toBe("ISO");
    expect(client.computeAutomap(["ISO-3166"]).iso_country_code).toBe("ISO-3166");
    expect(client.computeAutomap(["ISO Alpha 2"]).iso_country_code).toBe("ISO Alpha 2");
    expect(client.computeAutomap(["Country ISO"]).iso_country_code).toBe("Country ISO");
  });

  it("prefers first matching header when State and County both present (US case)", () => {
    // US data often has both "State" and "County" — State should win for region
    const result = client.computeAutomap(["State", "County"]);
    expect(result.region).toBe("State");
  });

  it("fuzzy-matches common typos", () => {
    expect(client.computeAutomap(["Adress"]).street_address).toBe("Adress");
    expect(client.computeAutomap(["Streat"]).street_address).toBe("Streat");
    expect(client.computeAutomap(["Latitde"]).latitude).toBe("Latitde");
    expect(client.computeAutomap(["Lattitude"]).latitude).toBe("Lattitude");
    expect(client.computeAutomap(["Longtude"]).longitude).toBe("Longtude");
    expect(client.computeAutomap(["Phonne"]).phone_number).toBe("Phonne");
    expect(client.computeAutomap(["Websit"]).website).toBe("Websit");
  });

  it("fuzzy threshold scales with length", () => {
    // Length < 5: exact only, no fuzzy
    expect(client.computeAutomap(["Nam"]).location_name).toBeUndefined();
    expect(client.computeAutomap(["Citi"]).city).toBeUndefined();
    // Length 5-7: allow 1 edit — "phonee" → "phone"
    expect(client.computeAutomap(["phonee"]).phone_number).toBe("phonee");
    // Length >= 8: allow 2 edits
    expect(client.computeAutomap(["latittude"]).latitude).toBe("latittude");
  });

  it("exact matches always win over fuzzy", () => {
    // "state" exactly matches built-in, shouldn't fuzzy-match anything
    const result = client.computeAutomap(["State"]);
    expect(result.region).toBe("State");
  });

  it("fuzzy does not match totally unrelated headers", () => {
    const result = client.computeAutomap(["Foobar", "QuantumFlux", "Revenue", "Margin"]);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("editDistance is a classical Levenshtein implementation", () => {
    expect(client.editDistance("kitten", "sitting")).toBe(3);
    expect(client.editDistance("", "abc")).toBe(3);
    expect(client.editDistance("abc", "")).toBe(3);
    expect(client.editDistance("same", "same")).toBe(0);
    expect(client.editDistance("abc", "abd")).toBe(1);
    expect(client.editDistance("address", "adress")).toBe(1);
  });
});

// ==========================================
// Client-server validation consistency
// ==========================================
describe("client-server validation consistency", () => {
  let gs;
  const HEADERS = ["Name", "Street", "City", "State", "Zip", "Lat", "Lng", "Country"];
  const allUnmapped = {
    location_name: "--",
    street_address: "--",
    city: "--",
    region: "--",
    postal_code: "--",
    latitude: "--",
    longitude: "--",
    iso_country_code: "--",
    store_id: "--",
    phone_number: "--",
    website: "--",
    naics_code: "--",
    mcc_code: "--",
  };

  beforeAll(async () => {
    const { loadCodeGS } = await import("./helpers.mjs");
    gs = loadCodeGS();
  });

  // Test each known minimum input set: client and server should agree
  const minimumSets = [
    { name: "lat+long", fields: { latitude: "Lat", longitude: "Lng" }, row: ["", "", "", "", "", "37.7", "-122.4", ""] },
    { name: "street+city+region+postal+country", fields: { street_address: "Street", city: "City", region: "State", postal_code: "Zip", iso_country_code: "Country" }, row: ["", "123 Main", "NYC", "NY", "10001", "", "", "US"] },
    { name: "street+region+postal+country", fields: { street_address: "Street", region: "State", postal_code: "Zip", iso_country_code: "Country" }, row: ["", "123 Main", "", "NY", "10001", "", "", "US"] },
    { name: "street+city+region+country", fields: { street_address: "Street", city: "City", region: "State", iso_country_code: "Country" }, row: ["", "123 Main", "NYC", "NY", "", "", "", "US"] },
  ];

  for (const { name, fields, row } of minimumSets) {
    it(`client and server both accept: ${name}`, () => {
      const clientMappings = { ...allUnmapped, ...fields };
      expect(client.minimumInputProvided(clientMappings)).toBe(true);

      const serverMappings = gs.transformColumnMappings(clientMappings, HEADERS);
      expect(gs.isValidRow(row, serverMappings).isValid).toBe(true);
    });
  }

  it("client and server both reject: name only", () => {
    const clientMappings = { ...allUnmapped, location_name: "Name" };
    expect(client.minimumInputProvided(clientMappings)).toBe(false);

    const serverMappings = gs.transformColumnMappings(clientMappings, HEADERS);
    expect(gs.isValidRow(["Shop", "", "", "", "", "", "", ""], serverMappings).isValid).toBe(false);
  });
});
