// it will create the menu right after installation.
function onInstall(e) {
  onOpen(e);
}

function onOpen(e) {
  console.log('Hello from startup')
  var ui = SpreadsheetApp.getUi();
  var menu = ui.createAddonMenu();
  console.log("Created menu")
  menu.addItem("Generate Placekeys", "PlaceKey").addSeparator().addItem("Additional Information", "feedback");
  menu.addToUi();
  console.log("menu added to ui")
}

function feedback() {
  console.log('Hello from the feedback')
  var htmlOutput = HtmlService.createTemplateFromFile("Help").evaluate().setWidth(350).setHeight(350);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, "Placekey Help");
}

// This function checks if user save API Key or not/

function PlaceKey() {
  var userPr = PropertiesService.getUserProperties();
  var userKey = userPr.getProperty("Key");
  console.log('The user key is ', userKey)
  console.log('Hello from the log')
  if (!userKey) {
    var htmlOutput = HtmlService.createTemplateFromFile("setKey").evaluate().setWidth(500).setHeight(150);
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, "API Key");
  } else {
    var htmlOutput = HtmlService.createTemplateFromFile("mapColumns").evaluate().append('<input id="storedKey" value="" style="display:none">').setTitle("Placekey");
    SpreadsheetApp.getUi().showSidebar(htmlOutput);
    console.log('You should be seeing the menu now')
  }
}

// Set API Key

function setUserProperties(els) {
  console.log("Hello from setUserProperties")
  var userPr = PropertiesService.getUserProperties();
  var userKey = userPr.setProperty("Key", els);
  // Code below added to accomplish point 3
  var userKey = userPr.getProperty("Key");
  if (!userKey) {
    var htmlOutput = HtmlService.createTemplateFromFile("setKey").evaluate().setWidth(500).setHeight(150);
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, "API Key");
  } else {
    var htmlOutput = HtmlService.createTemplateFromFile("mapColumns").evaluate().append('<input id="storedKey" value="" style="display:none">').setTitle("Placekey");
    SpreadsheetApp.getUi().showSidebar(htmlOutput);
  }
}

// Displays the API Key window

function changeKey() {
  console.log("Hello from changeKey")
  var userPr = PropertiesService.getUserProperties();
  var userKey = userPr.getProperty("Key");
  var htmlOutput = HtmlService.createTemplateFromFile("setKey")
    .evaluate()
    .append('<input id="storedKey" value="' + userKey + '" style="display:none">')
    .setWidth(500)
    .setHeight(150);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, "API Key");
}

// Gets all sheets in current spreadsheet, It also check current sheet columns

function getSheets() {
  console.log("Hello from getSheets")
  var active = SpreadsheetApp.getActiveSheet().getName();
  var allSheets = SpreadsheetApp.getActiveSpreadsheet().getSheets();
  var sheetNames = [];
  for (var i = 0; i < allSheets.length; i++) {
    sheetNames.push(allSheets[i].getName());
  }

  try {
    var selected = SpreadsheetApp.getActiveSheet();
    var sheetId = selected.getSheetId();
    var cols = selected.getRange(1, 1, 1, selected.getLastColumn()).getDisplayValues();
    var mapData = getMapColumnsData(sheetId);
    return [active, sheetNames, { cols, mapData }];
  } catch (e) {
    return [active, sheetNames, { cols: false, mapData: [] }];
  }
}

// It's changing the active sheet if user selects another sheet as data source

function changeSheet(selectedSheet) {
  console.log("Hello from changeSheet")
  var selected = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(selectedSheet);
  SpreadsheetApp.setActiveSheet(selected);
  try {
    var cols = selected.getRange(1, 1, 1, selected.getLastColumn()).getDisplayValues();
    var sheetId = selected.getSheetId();
    var mapData = getMapColumnsData(sheetId);
    return { cols, mapData };
  } catch (e) {
    return { cols: false, mapData: [] };
  }
}

// get processing status
function getStatus(key) {
  console.log("Hello from getStatus")
  // let props = PropertiesService.getDocumentProperties();
  // let value = props.getProperty(key);
  // let total = props.getProperty(key + "total");

  return { key, ...getRunningStatus_(key) };
}

// It's generating Placekeys by requesting bulk

function generateKeys(config, uniqueKey) {
  console.log('CONFIG ', config)
  let {columnMappings, options, requestFields} = config

  console.log('COL MAPS ', columnMappings)
  console.log('OPTIONS ', options)
  console.log('FIELDS ', requestFields)

  const ADDRESS_MATCH = options.addressMatch
  const NAME_MATCH = options.nameMatch
  const OVERWRITE = options.overwrite
  const INSERT_ERROR = options.insertError
  const NO_INPUT_STRING = "--"
  const ERROR_KEY = "placekey_error"
  const EMPTY_ROW_ERROR_MESSAGE = "There were no values in the row."

  const fields = Object.fromEntries(["placekey", ERROR_KEY].concat(requestFields).map((field_name) => [field_name, {apiKey: field_name, displayName: field_name.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "), columnIndex: null}]))
  
      
  let now = new Date();
  let now_ = now;
  
  var ss = SpreadsheetApp.getActiveSheet();
  var sheetId = ss.getSheetId();
  //colsNum is somewhat misleading bc if the sheet has tons of blank columns on the end, the blanks are included in the count
  var colsNum = ss.getLastColumn();
  console.log('COLS NUMBER ', colsNum)
  /* 
  cols header is used to determine where to add the new columns if no columns named for the outputs already exist in the document.
  **The logic will break if a sheet has a column with no header in between columns with headers.**
  */
  var colsHeader = ss.getRange(1, 1, 1, colsNum).getDisplayValues()[0].filter(header=>header.length>0);
  

  console.log('COLS HEADER ', colsHeader)
  var colsId = [];
  var problematicRows = [];
  var key = ["location_name", "street_address", "city", "region", "postal_code", "latitude", "longitude", "iso_country_code"];

  // save address
  setMapColumnsData(sheetId, columnMappings);

  for(let [key, value] of Object.entries(columnMappings)){
    if(value===NO_INPUT_STRING){
      continue
    }
    columnMappings[key] = {
      columnName: columnMappings[key],
      //add 1 because Google Sheet columns are 1-indexed
      columnNumber: colsHeader.indexOf(value)+1,
      rowIndex: colsHeader.indexOf(value)
    }
  }

  console.log('COL MAPPINGS WITH COLUMN NUMBERS ', columnMappings)

  var rowNum = ss.getLastRow();
  console.log(`There are ${rowNum-1} rows in the document`)

  //If there's already a column in the document for all the fields, get it and save it, otherwise, append it to the end
  let appendedFields = 0
  for( let [key, value] of Object.entries(fields)){
    lowerCaseCols = colsHeader.map(name => name.toLowerCase())
    if(lowerCaseCols.includes(value.displayName.toLowerCase())){
      fields[key].columnIndex = lowerCaseCols.indexOf(value.displayName.toLowerCase())
    }
    else{
      fields[key].columnIndex = colsHeader.length + appendedFields
      appendedFields+=1
    }

  }

  console.log('FIELD DICT ', fields)

  console.log(`Before get Values time: ${new Date() - now}`)
  now_ = new Date();

  var allRowsValues = ss.getRange(2, 1, ss.getLastRow() - 1, ss.getLastColumn()).getDisplayValues();
  // console.log('ALL ROW VALUES ', allRowsValues)

  console.log(`get Values time(total): ${new Date() - now}`)
  console.log(`get Values time: ${new Date() - now_}`)
  now_ = new Date()

  const STEP = 100
  let batches = []
  //will all the valid row numbers 
  const mapRowToObject = (row) => {
    return {
        "location_name": columnMappings["location_name"] === NO_INPUT_STRING ? "": row[columnMappings["location_name"].rowIndex],
        "street_address": columnMappings["street_address"] === NO_INPUT_STRING ? "": row[columnMappings["street_address"].rowIndex],
        "city": columnMappings["city"] === NO_INPUT_STRING ? "": row[columnMappings["city"].rowIndex],
        "region": columnMappings["region"] === NO_INPUT_STRING ? "": row[columnMappings["region"].rowIndex],
        "postal_code": columnMappings["postal_code"] === NO_INPUT_STRING ? "": row[columnMappings["postal_code"].rowIndex],
        "latitude": columnMappings["latitude"] === NO_INPUT_STRING ? "": row[columnMappings["latitude"].rowIndex],
        "longitude": columnMappings["longitude"] === NO_INPUT_STRING ? "": row[columnMappings["longitude"].rowIndex],
        "iso_country_code": columnMappings["iso_country_code"]===NO_INPUT_STRING ? "US" : row[columnMappings["iso_country_code"].rowIndex],
        "place_metadata": {
            "store_id": columnMappings["store_id"] === NO_INPUT_STRING ? "": row[columnMappings["store_id"].rowIndex],
            "phone_number": columnMappings["phone_number"] === NO_INPUT_STRING ? "": row[columnMappings["phone_number"].rowIndex],
            "website": columnMappings["website"] === NO_INPUT_STRING ? "": row[columnMappings["website"].rowIndex],
            "naics_code": columnMappings["naics_code"] === NO_INPUT_STRING ? "": row[columnMappings["naics_code"].rowIndex],
            "mcc_code": columnMappings["mcc_code"] === NO_INPUT_STRING ? "": row[columnMappings["mcc_code"].rowIndex]
          }
      }
  }

  /*
  API will fail all requests if lat or long fields in any row contain strings.
  Lat values in theory should be between 90 and -90
  Long values in theory should be between 180 and -180
  However,this is not currently checked by the api it seems. Sending req with lat and lon as "10000" 
  returns successfully with a placekey
  */
  const hasValidLatLongValues = (rowObject, keysWithValues) => {
    for(let key of ["latitude", "longitude"]){
      if(keysWithValues.includes(key)){
        let asFloat = Number.parseFloat(rowObject[key])
        if(Number.isNaN(asFloat)){
          return false
        }
        /*
        Checks if the lat value is valid latitude. Commenting out for now bc request successfully returns
        */
        // if(key==="latitude" && (asFloat > 90 || asFloat < -90)){
        //   return false
        // }
        // if(key==="longitude" && (asFloat > 180 || asFloat < -180)){
        //   return false
        // }
      }
    }
    return true
    } 
  //determines if a row has enough inputs to be valid
  const isValidRow = (row) => {
    //return true
    const rowObj = mapRowToObject(row)
    console.log('ROW OBJ ', rowObj)
    const keysWithValues = Object.keys(rowObj).filter( key => rowObj[key].length > 0)
    // console.log('keysWithValues ', keysWithValues)
    if(keysWithValues.length===0){
      return {
        isValid: false,
        message: EMPTY_ROW_ERROR_MESSAGE
      }
    }

    const minimumInputs = [["latitude", "longitude"], ["street_address", "city", "region", "postal_code", "iso_country_code"], ["street_address", "region", "postal_code", "iso_country_code"],["street_address", "city", "region", "iso_country_code"]]
    
    
    //if lat and long are provided, they must be valid float values, even if other fields are provided
    if(!hasValidLatLongValues(rowObj, keysWithValues)){
      return {
        isValid: false,
        message: "An invalid number value was provided for latitude or longitude."
      }
    }
    
    for(let input of minimumInputs){
      let hasRequiredInputs = true
      for(let key of input){
        if(!keysWithValues.includes(key)){
          hasRequiredInputs = false
          break
        }
      }
      if(hasRequiredInputs){
        return {
          isValid: true,
          message: "The row is valid"
        }
      }
    }
    return {
      isValid: false,
      message: "Row did not meet minimum input requirements. Details can be found here: https://docs.placekey.io/documentation/placekey-api/input-parameters/minimum-inputs"
    }
  }

  //determine which rows are valid before sending to API so as to not use up daily limit with badly formatted rows
  let validRows = {}
  let errorRows = {}
  for(let i = 0; i < allRowsValues.length; i++){
    // console.log('ROW VALUES[i] ', allRowsValues[i])
    const {isValid, message} = isValidRow(allRowsValues[i])
     if(!isValid){
        //only save error messages for non-empty rows that the user might think should be processed
        if(INSERT_ERROR && message!==EMPTY_ROW_ERROR_MESSAGE){
          errorRows[i] = message
        }
        console.log(`Row ${i+1} is invalid. Message: ${message}`)
        continue
      }
    validRows[i] = allRowsValues[i]
  }


  //get the valid row indexes so that we can reinsert them in correct position after fetching api data
  let sortedValidRows = Object.keys(validRows).map(numString => Number.parseInt(numString))
  sortedValidRows.sort((a, b)=>a-b)

  let sortedInvalidRows = Object.keys(errorRows).map(numString => Number.parseInt(numString))
  sortedInvalidRows.sort((a, b)=>a-b)
  console.log('SORTED ERROR INDEXES ', sortedInvalidRows)

  let batchIndexes = []
  
  for(let i = 0; i<sortedValidRows.length;i+=STEP){
    let rowIndexes = sortedValidRows.slice(i, i+STEP)
    batchIndexes.push(rowIndexes)
    let batch = []
    
    for(let index of rowIndexes){
      let row = validRows[index]
      batch.push(mapRowToObject(row))
    }
    batches.push(batch)
  }

  now_ = new Date()

  // console.log(countryWiseRows);
  var totalPlaceKeys = 0;

  // processing status
  let currentRequestCount = 0;

  now_ = new Date()

  Logger.log = () => {}

  const requestArr = [];
  const additionalArr = [];

  console.log(`chunk time(total): ${new Date() - now}`)
  console.log(`chunk time: ${new Date() - now_}`)
  now_ = new Date()

  var userPr = PropertiesService.getUserProperties();
  var API_Key = userPr.getProperty("Key");
  console.log('API KEY ', API_Key)

  for(let i = 0; i < batches.length; i++){
    let batch = batches[i]
    // console.log('batch ', batch)
     let body = {
        queries: batch,
        options: {
          strict_address_match: ADDRESS_MATCH,
          strict_name_match: NAME_MATCH,
          fields: requestFields
        }
      }
    // console.log('REQUEST DATA ', body)

    var requestOptions = {
    'method' : 'post',
    'contentType': 'application/json',
    // Convert the JavaScript object to a JSON string.
    'payload' : JSON.stringify(body),
    'headers': {
      'apikey': API_Key,
      "user-agent": "placekey-googlesheets/0.0.9",
      "content-type": "application/json",
    },
    'muteHttpExceptions': true
  };
  let res = UrlFetchApp.fetch("https://api.placekey.io/v1/placekeys", requestOptions);

  
  if(res.getResponseCode() != 200){
    console.log('RES WITH ERROR STATUS CODE ', res.getResponseCode())
    console.log(res.getContentText())
    if(res.getResponseCode()===429){
      return "Number of requests exceeded the free tier limit of 10,000 requests/day."
    }
    if(res.getResponseCode()==400){
      return "Malformed input"
    }
    throw new Error('test')
  }

  let json = JSON.parse(res.getContentText());

  if(!json.length){
    console.log('No responses returned from the api, continuing to next batch if one exists...')
    continue
  }
  // console.log('JSON RESPONSE ', json)
  const returnedFields = Object.keys(json[0]).filter(field => field!=="query_id")
  //remove any fields we wanted to retrieve but were not returned
  for(let key of Object.keys(fields)){
          if(key!=="placekey_error" && !returnedFields.includes(key)){
            console.log(`The key ${key} is not present in the api response, dropping from configured fields...`)
            delete fields[key]
          }
        }

  // console.log('Batch indexes ', batchIndexes)
  
  const columnHeadersToAdd = Object.values(fields).filter(field => returnedFields.includes(field.apiKey)).map(field => field.displayName)


  for(let field of returnedFields){
      // console.log('field ', field)
      const fieldObj = fields[field]

      ss.getRange(1, fieldObj.columnIndex+1, 1, 1).setValue(fieldObj.displayName)
      for(let index=0; index<batchIndexes[i].length; index++){
        let rowNumber = Number.parseInt(batchIndexes[i][index])+2
        let valueToAdd = json[index][field]
        // console.log('Adding value ', valueToAdd, ' to row ', rowNumber, ' and column ', fieldObj.columnIndex+1)
        ss.getRange(rowNumber, fieldObj.columnIndex+1, 1, 1).setValue(valueToAdd)
      }
  }

  if(INSERT_ERROR){
     const fieldObj = fields[ERROR_KEY]
     ss.getRange(1, fieldObj.columnIndex+1, 1, 1).setValue(fieldObj.displayName)

     for(let index=0; index<sortedInvalidRows.length; index++){
        let rowNumber = Number.parseInt(sortedInvalidRows[index])+2
        let valueToAdd = errorRows[sortedInvalidRows[index]]
        console.log('Adding value ', valueToAdd, ' to row ', rowNumber, ' and column ', fieldObj.columnIndex+1)
        ss.getRange(rowNumber, fieldObj.columnIndex+1, 1, 1).setValue(valueToAdd)
      }
  }
  totalPlaceKeys+=batchIndexes[i].length

  if(totalPlaceKeys%1000===0){
    console.log('Waiting a minute to avoid hitting api limits...')
    Utilities.sleep(60000)
  }

  Utilities.sleep(1000);
  }

  console.log(`inserting time(total): ${new Date() - now}`)
  console.log(`inserting time: ${new Date() - now_}`)


  // props.deleteProperty(uniqueKey);
  // props.deleteProperty(uniqueKey + "total");

  //divide by return field length because incremented on per-column basis
  return totalPlaceKeys;
}

// Reset user Propertise, For test

function reset() {
  console.log("Hello from reset")
  var userPr = PropertiesService.getUserProperties();
  userPr.deleteAllProperties();
  resetMapColumnsData();
}

// For test
function testUser() {
  console.log("Hello from testUser")
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();

  return sheet.getName();
}

// Insert Sample data, Please fill or remove remainings.

function insertSample() {
  console.log("Hello from insertSample")
  var ss = SpreadsheetApp.getActiveSheet();
  var Name = ss.getName();
  ss.appendRow(["Name", "Street Address", "City", "State", "Zip code", "Latitude", "Longitude"]);
  ss.setFrozenRows(1);
  ss.appendRow(["Twin Peaks Petroleum", "598 Portola Dr", "San Francisco", "CA", "94131", "37.7371", "-122.44283"]);
  ss.appendRow(["", "", "", "", "", "37.7371", "-122.44283"]);
  ss.appendRow(["Beretta", "1199 Valencia St", "San Francisco", "CA", "94110", "", ""]);
  ss.appendRow(["Tasty Hand Pulled Noodle", "1 Doyers St", "New York", "ny", "10013", "", ""]);
  ss.appendRow(["", "1 Doyers St", "New York", "NY", "10013", "", ""]);

  // Please fill or remove remainings:

  // ss.appendRow(['Name', 'Street Address', 'City', 'State', 'Zip code', 'Latitude', 'Longitude'])
  // ss.appendRow(['Name', 'Street Address', 'City', 'State', 'Zip code', 'Latitude', 'Longitude'])
  // ss.appendRow(['Name', 'Street Address', 'City', 'State', 'Zip code', 'Latitude', 'Longitude'])
  // ss.appendRow(['Name', 'Street Address', 'City', 'State', 'Zip code', 'Latitude', 'Longitude'])

  PlaceKey();

  return { cols: false, mapData: [] };
}

// Alerts

function Alert(message) {
  console.log("hello from alert")
  SpreadsheetApp.getUi().alert(message);
}

// Template Functions
function include(filename) {
  console.log("hello from include")
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function refreshUpdateSheet() {
  console.log("hello from refreshUpdateSheet")
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var allSheets = ss.getSheets();
  var sheetName = ss.getActiveSheet().getName();
  var selected = ss.getSheetByName(sheetName);
  var sheetNames = [];
  for (var i = 0; i < allSheets.length; i++) {
    sheetNames.push(allSheets[i].getName());
  }

  try {
    var cols = selected.getRange(1, 1, 1, selected.getLastColumn()).getDisplayValues();
    var sheetId = selected.getSheetId();
    var mapData = getMapColumnsData(sheetId);
    return [sheetName, sheetNames, { cols, mapData }];
  } catch (e) {
    return [sheetName, sheetNames, { cols: false, mapData: [] }];
  }
  // return [allSheets, sheetName, cols]
}

const ADD_ON_NAME = "Placekey:";

// set mapColumns Data
function setMapColumnsData(sheetId, data) {
  console.log("hello from setMapColumnsData")
  const props = PropertiesService.getDocumentProperties();
  props.setProperty(ADD_ON_NAME + sheetId, JSON.stringify(data));
}

// get map Columns Data
function getMapColumnsData(sheetId) {
  console.log("hello from getMapColumnsData")
  const props = PropertiesService.getDocumentProperties();
  let data = props.getProperty(ADD_ON_NAME + sheetId);
  return JSON.parse(data);
}

// reset map Columns Data
function resetMapColumnsData() {
  console.log("hello from resetMapColumnsData")
  const props = PropertiesService.getDocumentProperties();
  props.getKeys().forEach((v) => {
    if (v.includes(ADD_ON_NAME)) {
      props.deleteProperty(v);
    }
  });
}

// print all document property
function printAllDocumentProperty() {
  console.log("hello from printAllDocumentProperty")
  const props = PropertiesService.getDocumentProperties();
  let allProps = props.getProperties();
  for (let key in allProps) {
    console.log(`${key} => ${allProps[key]}`);
  }
}

