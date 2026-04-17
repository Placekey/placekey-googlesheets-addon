// ==========================================
// Constants
// ==========================================
const ADD_ON_NAME = "Placekey:";
const NO_INPUT_STRING = "--";
const ERROR_KEY = "placekey_error";
const EMPTY_ROW_ERROR_MESSAGE = "There were no values in the row.";
const GEOCODE_FIELDS = ["geocode_latitude", "geocode_longitude", "geocode_lat_long", "geocode_precision"];
const MAIN_FIELDS = ["location_name", "street_address", "city", "region", "postal_code", "latitude", "longitude", "iso_country_code"];
const METADATA_FIELDS = ["store_id", "phone_number", "website", "naics_code", "mcc_code"];
const MINIMUM_INPUTS = [
  ["latitude", "longitude"],
  ["street_address", "city", "region", "postal_code", "iso_country_code"],
  ["street_address", "region", "postal_code", "iso_country_code"],
  ["street_address", "city", "region", "iso_country_code"],
];
const API_BATCH_SIZE = 100;
const API_URL = "https://api.placekey.io/v1/placekeys";
const USER_AGENT = "placekey-googlesheets/0.0.9";
const MAX_RETRIES = 3;
const RATE_LIMIT_MS = 1100;

// ==========================================
// Triggers
// ==========================================
function onInstall(_e) {
  onOpen(_e);
}

function onOpen(_e) {
  SpreadsheetApp.getUi().createAddonMenu().addItem("Generate Placekeys", "showPlaceKeyUI").addSeparator().addItem("Additional Information", "showHelp").addToUi();
}

// ==========================================
// API Key Management
// ==========================================
function getApiKey() {
  return PropertiesService.getUserProperties().getProperty("Key") || "";
}

function setApiKey(key) {
  if (typeof key !== "string" || key.trim().length === 0) {
    throw new Error("Please enter a valid API key.");
  }
  PropertiesService.getUserProperties().setProperty("Key", key.trim());
  if (getApiKey()) {
    showSidebar();
  } else {
    showApiKeyDialog();
  }
}

// ==========================================
// UI Display
// ==========================================
function showHelp() {
  const output = HtmlService.createTemplateFromFile("Help").evaluate().setWidth(350).setHeight(350);
  SpreadsheetApp.getUi().showModalDialog(output, "Placekey Help");
}

function showPlaceKeyUI() {
  if (getApiKey()) {
    showSidebar();
  } else {
    showApiKeyDialog();
  }
}

function changeKey() {
  showApiKeyDialog();
}

function showApiKeyDialog() {
  const output = HtmlService.createTemplateFromFile("setKey").evaluate().setWidth(500).setHeight(150);
  SpreadsheetApp.getUi().showModalDialog(output, "API Key");
}

function showSidebar() {
  const output = HtmlService.createTemplateFromFile("mapColumns").evaluate().setTitle("Placekey");
  SpreadsheetApp.getUi().showSidebar(output);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ==========================================
// Sheet Data
// ==========================================
function getActiveSheetInfo() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const cols = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues();
  const mapData = getMapColumnsData(sheet.getSheetId());
  return { cols, mapData };
}

function getSheets() {
  const active = SpreadsheetApp.getActiveSheet().getName();
  const sheetNames = SpreadsheetApp.getActiveSpreadsheet()
    .getSheets()
    .map((s) => s.getName());
  try {
    return [active, sheetNames, getActiveSheetInfo()];
  } catch (_e) {
    return [active, sheetNames, { cols: false, mapData: [] }];
  }
}

function changeSheet(selectedSheet) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(selectedSheet);
  SpreadsheetApp.setActiveSheet(sheet);
  try {
    const cols = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues();
    const mapData = getMapColumnsData(sheet.getSheetId());
    return { cols, mapData };
  } catch (_e) {
    return { cols: false, mapData: [] };
  }
}

function refreshUpdateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = ss.getActiveSheet().getName();
  const sheetNames = ss.getSheets().map((s) => s.getName());
  try {
    return [sheetName, sheetNames, getActiveSheetInfo()];
  } catch (_e) {
    return [sheetName, sheetNames, { cols: false, mapData: [] }];
  }
}

function insertSample() {
  const ss = SpreadsheetApp.getActiveSheet();
  const sampleData = [
    ["Name", "Street Address", "City", "State", "Zip code", "Latitude", "Longitude"],
    ["Twin Peaks Petroleum", "598 Portola Dr", "San Francisco", "CA", "94131", "37.7371", "-122.44283"],
    ["", "", "", "", "", "37.7371", "-122.44283"],
    ["Beretta", "1199 Valencia St", "San Francisco", "CA", "94110", "", ""],
    ["Tasty Hand Pulled Noodle", "1 Doyers St", "New York", "ny", "10013", "", ""],
    ["", "1 Doyers St", "New York", "NY", "10013", "", ""],
  ];
  ss.getRange(1, 1, sampleData.length, sampleData[0].length).setValues(sampleData);
  ss.setFrozenRows(1);
  showPlaceKeyUI();
  return { cols: false, mapData: [] };
}

function testUser() {
  return SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getName();
}

function reset() {
  PropertiesService.getUserProperties().deleteAllProperties();
  resetMapColumnsData();
}

// ==========================================
// Column Mapping Storage
// ==========================================
function setMapColumnsData(sheetId, data) {
  PropertiesService.getDocumentProperties().setProperty(ADD_ON_NAME + sheetId, JSON.stringify(data));
}

function getMapColumnsData(sheetId) {
  const data = PropertiesService.getDocumentProperties().getProperty(ADD_ON_NAME + sheetId);
  try {
    return JSON.parse(data);
  } catch (_e) {
    return null;
  }
}

function resetMapColumnsData() {
  const props = PropertiesService.getDocumentProperties();
  for (const key of props.getKeys()) {
    if (key.includes(ADD_ON_NAME)) {
      props.deleteProperty(key);
    }
  }
}

// ==========================================
// Status Management
// ==========================================
function getStatusKey(key) {
  return key + "status";
}

function getStatus(key) {
  return PropertiesService.getDocumentProperties().getProperty(getStatusKey(key));
}

function setStatus(props, uniqueKey, message) {
  props.setProperty(getStatusKey(uniqueKey), message);
}

// ==========================================
// Row Validation
// ==========================================
function mapRowToObject(row, columnMappings) {
  const result = {};
  for (const field of MAIN_FIELDS) {
    if (columnMappings[field] === NO_INPUT_STRING) {
      result[field] = field === "iso_country_code" ? "US" : "";
    } else {
      result[field] = row[columnMappings[field].rowIndex];
    }
  }
  result.place_metadata = {};
  for (const field of METADATA_FIELDS) {
    result.place_metadata[field] = columnMappings[field] === NO_INPUT_STRING ? "" : row[columnMappings[field].rowIndex];
  }
  return result;
}

function hasValidLatLongValues(rowObject, keysWithValues) {
  for (const key of ["latitude", "longitude"]) {
    if (keysWithValues.includes(key) && Number.isNaN(Number.parseFloat(rowObject[key]))) {
      return false;
    }
  }
  return true;
}

function isValidRow(row, columnMappings) {
  const rowObj = mapRowToObject(row, columnMappings);
  let keysWithValues = Object.keys(rowObj).filter((key) => key !== "place_metadata" && rowObj[key].length > 0);

  if (keysWithValues.length === 0 || (keysWithValues.length === 1 && keysWithValues[0] === "iso_country_code")) {
    return { isValid: false, message: EMPTY_ROW_ERROR_MESSAGE, row: rowObj };
  }

  if (keysWithValues.includes("latitude") && keysWithValues.includes("longitude") && !hasValidLatLongValues(rowObj, keysWithValues)) {
    if (keysWithValues.length === 2) {
      return {
        isValid: false,
        message: "The value provided for latitude or longitude was invalid.",
        row: rowObj,
      };
    }
    delete rowObj.latitude;
    delete rowObj.longitude;
    keysWithValues = keysWithValues.filter((k) => k !== "latitude" && k !== "longitude");
  }

  for (const requiredSet of MINIMUM_INPUTS) {
    if (requiredSet.every((key) => keysWithValues.includes(key))) {
      return { isValid: true, message: "The row is valid", row: rowObj };
    }
  }

  return {
    isValid: false,
    message: "Row did not meet minimum input requirements. Details: https://docs.placekey.io/documentation/placekey-api/input-parameters/minimum-inputs",
    row: rowObj,
  };
}

function validateAllRows(allRowsValues, columnMappings, insertError) {
  const validRows = {};
  const errorRows = {};

  for (let i = 0; i < allRowsValues.length; i++) {
    const { isValid, message, row } = isValidRow(allRowsValues[i], columnMappings);
    if (!isValid) {
      if (insertError && message !== EMPTY_ROW_ERROR_MESSAGE) {
        errorRows[i] = message;
      }
      continue;
    }
    validRows[i] = row;
  }

  return {
    validRows,
    errorRows,
    sortedValidIndexes: Object.keys(validRows)
      .map(Number)
      .sort((a, b) => a - b),
    sortedInvalidIndexes: Object.keys(errorRows)
      .map(Number)
      .sort((a, b) => a - b),
  };
}

// ==========================================
// API Communication
// ==========================================
function callPlacekeyApi(batch, options, requestFields, apiKey) {
  const payload = {
    queries: batch,
    options: {
      strict_address_match: options.addressMatch,
      strict_name_match: options.nameMatch,
      fields: requestFields,
    },
  };

  const fetchOptions = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    headers: {
      apikey: apiKey,
      "user-agent": USER_AGENT,
      "content-type": "application/json",
    },
    muteHttpExceptions: true,
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const res = UrlFetchApp.fetch(API_URL, fetchOptions);
    const code = res.getResponseCode();

    if (code === 200) {
      try {
        return JSON.parse(res.getContentText());
      } catch (_e) {
        throw new Error("The API returned an invalid response. Please try again.");
      }
    }

    if (code === 429) {
      throw new Error("Rate limit exceeded. Visit https://www.placekey.io/pricing to upgrade.");
    }

    if (code === 400) {
      throw new Error("The API returned an error because at least one row in this batch is malformed.");
    }

    if (code >= 500 && attempt < MAX_RETRIES) {
      Utilities.sleep(1000 * attempt);
      continue;
    }

    throw new Error(`The API failed with status code ${code}.`);
  }

  throw new Error(`The API failed after ${MAX_RETRIES} retries.`);
}

// ==========================================
// Column Preparation
// ==========================================
function transformColumnMappings(columnMappings, colsHeader) {
  const transformed = {};
  for (const [fieldKey, value] of Object.entries(columnMappings)) {
    if (value === NO_INPUT_STRING) {
      transformed[fieldKey] = NO_INPUT_STRING;
    } else {
      transformed[fieldKey] = {
        columnName: value,
        columnNumber: colsHeader.indexOf(value) + 1,
        rowIndex: colsHeader.indexOf(value),
      };
    }
  }
  return transformed;
}

function prepareOutputFields(fieldNames, colsHeader) {
  const lowerCaseCols = colsHeader.map((name) => name.toLowerCase());
  const fields = {};
  let appendedCount = 0;

  for (const fieldName of fieldNames) {
    if (fieldName === "geocode") continue;
    const displayName = fieldName
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    const existingIndex = lowerCaseCols.indexOf(displayName.toLowerCase());

    fields[fieldName] = {
      apiKey: fieldName,
      displayName,
      columnIndex: existingIndex >= 0 ? existingIndex : colsHeader.length + appendedCount++,
    };
  }

  return fields;
}

// ==========================================
// Result Writing (batch optimized)
// ==========================================
function writeHeaders(ss, fields) {
  for (const fieldObj of Object.values(fields)) {
    ss.getRange(1, fieldObj.columnIndex + 1).setValue(fieldObj.displayName);
  }
}

function writeFieldResults(ss, colIndex, resultMap) {
  const rowIndexes = Object.keys(resultMap)
    .map(Number)
    .sort((a, b) => a - b);
  if (rowIndexes.length === 0) return;

  // Find contiguous ranges and batch-write each one
  let rangeStart = rowIndexes[0];
  let values = [[resultMap[rowIndexes[0]]]];

  for (let i = 1; i < rowIndexes.length; i++) {
    if (rowIndexes[i] === rowIndexes[i - 1] + 1) {
      values.push([resultMap[rowIndexes[i]]]);
    } else {
      ss.getRange(rangeStart + 2, colIndex, values.length, 1).setValues(values);
      rangeStart = rowIndexes[i];
      values = [[resultMap[rowIndexes[i]]]];
    }
  }
  ss.getRange(rangeStart + 2, colIndex, values.length, 1).setValues(values);
}

// ==========================================
// Main Orchestrator
// ==========================================
function generateKeys(config, uniqueKey) {
  const { columnMappings, options, requestFields } = config;
  const props = PropertiesService.getDocumentProperties();
  const INSERT_ERROR = options.insertError;

  // Expand geocode into sub-fields
  const expandedFields = [...requestFields];
  if (expandedFields.includes("geocode")) {
    expandedFields.push(...GEOCODE_FIELDS);
  }

  const baseFields = INSERT_ERROR ? ["placekey", ERROR_KEY] : ["placekey"];
  const allFieldNames = baseFields.concat(expandedFields);

  // Sheet setup
  const ss = SpreadsheetApp.getActiveSheet();
  const sheetId = ss.getSheetId();
  const colsHeader = ss
    .getRange(1, 1, 1, ss.getLastColumn())
    .getDisplayValues()[0]
    .filter((h) => h.length > 0);
  const totalRows = ss.getLastRow();

  // Save raw column mappings (copy before transforming)
  setMapColumnsData(sheetId, { ...columnMappings });
  const transformed = transformColumnMappings(columnMappings, colsHeader);

  // Read all data rows
  setStatus(props, uniqueKey, `Loading ${totalRows - 1} rows...`);
  const allRowsValues = ss.getRange(2, 1, totalRows - 1, ss.getLastColumn()).getDisplayValues();

  // Validate rows
  const { validRows, errorRows, sortedValidIndexes, sortedInvalidIndexes } = validateAllRows(allRowsValues, transformed, INSERT_ERROR);

  setStatus(props, uniqueKey, `Finished loading ${totalRows - 1} rows. ${sortedValidIndexes.length}/${totalRows - 1} rows are valid.`);

  // Create batches of valid rows
  const batches = [];
  for (let i = 0; i < sortedValidIndexes.length; i += API_BATCH_SIZE) {
    const indexes = sortedValidIndexes.slice(i, i + API_BATCH_SIZE);
    batches.push({ indexes, rows: indexes.map((idx) => validRows[idx]) });
  }

  // Prepare output fields
  const fields = prepareOutputFields(allFieldNames, colsHeader);

  // Accumulate results: fieldName -> { rowIndex: value }
  const results = {};
  for (const name of Object.keys(fields)) {
    results[name] = {};
  }

  // Process API batches
  const apiKey = getApiKey();
  let totalPlaceKeys = 0;
  let fieldsFinalized = false;

  for (let i = 0; i < batches.length; i++) {
    const { indexes, rows } = batches[i];
    const processed = Math.min((i + 1) * API_BATCH_SIZE, sortedValidIndexes.length);
    setStatus(props, uniqueKey, `Fetching Placekeys for ${processed}/${sortedValidIndexes.length} valid rows...`);

    const timeHitApi = Date.now();

    let json;
    try {
      json = callPlacekeyApi(rows, options, requestFields, apiKey);
    } catch (err) {
      setStatus(props, uniqueKey, err.message);
      throw err;
    }

    if (!json || !json.length) continue;

    // After first response, drop fields not returned by the API
    if (!fieldsFinalized) {
      const returnedFields = Object.keys(json[0]).filter((f) => f !== "query_id");
      for (const fieldKey of Object.keys(fields)) {
        if (fieldKey === ERROR_KEY || GEOCODE_FIELDS.includes(fieldKey)) continue;
        if (!returnedFields.includes(fieldKey)) {
          delete fields[fieldKey];
          delete results[fieldKey];
        }
      }
      writeHeaders(ss, fields);
      fieldsFinalized = true;
    }

    // Accumulate batch results
    for (let j = 0; j < indexes.length; j++) {
      if (!json[j]) continue;
      const rowIndex = indexes[j];

      for (const [field, value] of Object.entries(json[j])) {
        if (field === "query_id") continue;

        if (field === "geocode" && value) {
          if (results.geocode_latitude) results.geocode_latitude[rowIndex] = value.location.lat;
          if (results.geocode_longitude) results.geocode_longitude[rowIndex] = value.location.lng;
          if (results.geocode_lat_long) {
            results.geocode_lat_long[rowIndex] = `(${value.location.lat}, ${value.location.lng})`;
          }
          if (results.geocode_precision) results.geocode_precision[rowIndex] = value.location_type;
        } else if (results[field] !== undefined) {
          results[field][rowIndex] = value;
        }
      }
    }

    totalPlaceKeys += indexes.length;

    // Rate limiting between batches
    const elapsed = Date.now() - timeHitApi;
    if (elapsed < RATE_LIMIT_MS && i < batches.length - 1) {
      Utilities.sleep(RATE_LIMIT_MS - elapsed);
    }
  }

  // Write error column header if no API batches ran
  if (!fieldsFinalized && INSERT_ERROR && fields[ERROR_KEY]) {
    ss.getRange(1, fields[ERROR_KEY].columnIndex + 1).setValue(fields[ERROR_KEY].displayName);
  }

  // Collect error rows
  if (INSERT_ERROR && results[ERROR_KEY]) {
    for (const rowIndex of sortedInvalidIndexes) {
      results[ERROR_KEY][rowIndex] = errorRows[rowIndex];
    }
  }

  // Batch-write all results to sheet
  for (const [fieldName, fieldObj] of Object.entries(fields)) {
    if (results[fieldName] && Object.keys(results[fieldName]).length > 0) {
      writeFieldResults(ss, fieldObj.columnIndex + 1, results[fieldName]);
    }
  }

  setStatus(props, uniqueKey, `Done! Generated ${totalPlaceKeys} Placekeys.`);
  return totalPlaceKeys;
}
