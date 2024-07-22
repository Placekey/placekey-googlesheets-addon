// it will create the menu right after installation.
function onInstall(e) {
    onOpen(e);
  }
  
  function onOpen(e) {
    var ui = SpreadsheetApp.getUi();
    var menu = ui.createAddonMenu();
    menu.addItem("Generate Placekeys", "PlaceKey").addSeparator().addItem("Additional Information", "feedback");
    menu.addToUi();
  }
  
  function feedback() {
    var htmlOutput = HtmlService.createTemplateFromFile("Help").evaluate().setWidth(350).setHeight(350);
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, "Placekey Help");
  }
  
  // This function checks if user save API Key or not/
  
  function PlaceKey() {
    var userPr = PropertiesService.getUserProperties();
    var userKey = userPr.getProperty("Key");
    if (!userKey) {
      var htmlOutput = HtmlService.createTemplateFromFile("setKey").evaluate().setWidth(500).setHeight(150);
      SpreadsheetApp.getUi().showModalDialog(htmlOutput, "API Key");
    } else {
      var htmlOutput = HtmlService.createTemplateFromFile("mapColumns").evaluate().append('<input id="storedKey" value="" style="display:none">').setTitle("Placekey");
      SpreadsheetApp.getUi().showSidebar(htmlOutput);
    }
  }
  
  // Set API Key
  
  function setUserProperties(els) {
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

  const getStatusKey = (key) => key+"status"
  // get processing status
  function getStatus(key) {
    let props = PropertiesService.getDocumentProperties();
    let status = props.getProperty(getStatusKey(key));
    return status;
  }
  
  // It's generating Placekeys by requesting bulk
  
  function generateKeys(config, uniqueKey) {
    console.log('NEW VERSION GENERATING KEYS')
    console.log('CONFIG ', config)

    let {columnMappings, options, requestFields} = config
    let props = PropertiesService.getDocumentProperties();

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
    const geocodeFields = ["geocode_latitude", "geocode_longitude", "geocode_lat_long", "geocode_precision"]
    const baseFields = INSERT_ERROR ? ["placekey", ERROR_KEY] : ["placekey"]

    if(requestFields.includes("geocode")){
      for(let field of geocodeFields){
        requestFields.push(field)
      }
    }
 
    const fields = Object.fromEntries(baseFields.concat(requestFields).map((field_name) => [field_name, {apiKey: field_name, displayName: field_name.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "), columnIndex: null}]))
    
        
    let now = new Date();
    let now_ = now;
    
    var ss = SpreadsheetApp.getActiveSheet();
    var sheetId = ss.getSheetId();
    //colsNum is somewhat misleading bc if the sheet has tons of blank columns on the end, the blanks are included in the count
    var colsNum = ss.getLastColumn();
  
    /* 
    cols header is used to determine where to add the new columns if no columns named for the outputs already exist in the document.
    **The logic will break if a sheet has a column with no header in between columns with headers.**
    */
    var colsHeader = ss.getRange(1, 1, 1, colsNum).getDisplayValues()[0].filter(header=>header.length>0);
    
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

    var rowNum = ss.getLastRow();
    console.log(`There are ${rowNum-1} rows in the document`)
    
  
    //If there's already a column in the document for all the fields, get it and save it, otherwise, append it to the end
    let appendedFields = 0
    for( let [key, value] of Object.entries(fields)){
      if(key==="geocode"){
        continue
      }
      lowerCaseCols = colsHeader.map(name => name.toLowerCase())
      if(lowerCaseCols.includes(value.displayName.toLowerCase())){
        fields[key].columnIndex = lowerCaseCols.indexOf(value.displayName.toLowerCase())
      }
      else{
        fields[key].columnIndex = colsHeader.length + appendedFields
        appendedFields+=1
      }

    }
  
    console.log(`Before get Values time: ${new Date() - now}`)
    now_ = new Date();
  
    var allRowsValues = ss.getRange(2, 1, ss.getLastRow() - 1, ss.getLastColumn()).getDisplayValues();
  
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
      const rowObj = mapRowToObject(row)

      let keysWithValues = Object.keys(rowObj).filter( key => rowObj[key].length > 0)
      
      /*
      if no keys are provided or only the country is provided, the row is considered empty (we add default value of 'US' to row if no country provided)
      */
      if(keysWithValues.length===0 || (keysWithValues.length===1 && keysWithValues[0]==="iso_country_code")){
        return {
          isValid: false,
          message: EMPTY_ROW_ERROR_MESSAGE,
          row: rowObj
        }
      }

      const minimumInputs = [["latitude", "longitude"], ["street_address", "city", "region", "postal_code", "iso_country_code"], ["street_address", "region", "postal_code", "iso_country_code"],["street_address", "city", "region", "iso_country_code"]]
      
      
      /*
      if only lat and long are provided, they must be valid. If more values are provided and lat long aren't valid,
       drop them from the row, because they'll cause the row to fail if input into the api
      */
      if(keysWithValues.includes("latitude") && keysWithValues.includes("longitude") && !hasValidLatLongValues(rowObj, keysWithValues)){
        if(keysWithValues.length==2){
          return {
            isValid: false,
            message: "The value provided for latitude or longitude was invalid.",
            row: rowObj
          }
        }

        delete rowObj["latitude"]
        delete rowObj["longitude"]
        
        keysWithValues = keysWithValues.filter( key => key!=="latitude" && key!=="longitude")
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
            message: "The row is valid",
            row: rowObj
          }
        }
      }
      return {
        isValid: false,
        message: "Row did not meet minimum input requirements. Details can be found here: https://docs.placekey.io/documentation/placekey-api/input-parameters/minimum-inputs",
        row: rowObj 
      }
    }

    //determine which rows are valid before sending to API so as to not use up daily limit with badly formatted rows
    let validRows = {}
    let errorRows = {}
    props.setProperty(getStatusKey(uniqueKey), `Loading ${rowNum-1} rows from the document...`);
    for(let i = 0; i < allRowsValues.length; i++){
      const {isValid, message, row } = isValidRow(allRowsValues[i])
       if(!isValid){
          //only save error messages for non-empty rows that the user might think should be processed
          if(INSERT_ERROR && message!==EMPTY_ROW_ERROR_MESSAGE){
            errorRows[i] = message
          }
          console.log(`Row ${i+1} is invalid. Message: ${message}`)
          continue
        }
      validRows[i] = row
    }

    props.setProperty(getStatusKey(uniqueKey), `Finshed loading ${rowNum-1} rows. ${Object.keys(validRows).length}/${rowNum-1} rows are valid.`);


    //get the valid row indexes so that we can reinsert them in correct position after fetching api data
    let sortedValidRows = Object.keys(validRows).map(numString => Number.parseInt(numString))
    sortedValidRows.sort((a, b)=>a-b)

    let sortedInvalidRows = Object.keys(errorRows).map(numString => Number.parseInt(numString))
    sortedInvalidRows.sort((a, b)=>a-b)

    let batchIndexes = []
    
    for(let i = 0; i<sortedValidRows.length;i+=STEP){
      let rowIndexes = sortedValidRows.slice(i, i+STEP)
      batchIndexes.push(rowIndexes)
      let batch = []
      
      for(let index of rowIndexes){
        batch.push(validRows[index])
      }
      batches.push(batch)
    }

    now_ = new Date()
  
    var totalPlaceKeys = 0;
  

  
    now_ = new Date()
  
    Logger.log = () => {}
  
    const requestArr = [];
    const additionalArr = [];
  
    console.log(`chunk time(total): ${new Date() - now}`)
    console.log(`chunk time: ${new Date() - now_}`)
    now_ = new Date()
  
    var userPr = PropertiesService.getUserProperties();
    var API_Key = userPr.getProperty("Key");
  
    for(let i = 0; i < batches.length; i++){
      let batch = batches[i]
      props.setProperty(getStatusKey(uniqueKey), `Fetching Placekeys for ${batch.length+(i*STEP)}/${sortedValidRows.length} valid rows...`);
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
    let timeHitApi = new Date()
    let res = UrlFetchApp.fetch("https://api.placekey.io/v1/placekeys", requestOptions);
   
    if(res.getResponseCode() != 200){
      let message = "Something went wrong. Please try again."
      if(res.getResponseCode()===429){
        message = `Rate limit exceeded. See <a  href="https://www.placekey.io/pricing" target="_blank">here</a> to upgrade.`
      }
      else if(res.getResponseCode()==400){
        message = `The API returned an error because at least one row between ${sortedValidRows[i*STEP]+2} and ${sortedValidRows[(i*STEP)+batch.length-1]+2} is malformed.`
      }
      else{
        message = `The api failed with an unrecognized status code of ${res.getResponseCode()}`
      }
      props.setProperty(getStatusKey(uniqueKey), message);
      console.error("Failed request response: ", res.getContentText())
      throw new Error(message)
    }

    let json = JSON.parse(res.getContentText());

    if(!json.length){
      console.log('No responses returned from the api, continuing to next batch if one exists...')
      continue
    }
    
    const returnedFields = Object.keys(json[0]).filter(field => field!=="query_id")
   
    //remove any fields we wanted to retrieve but were not returned
    for(let key of Object.keys(fields)){
            if(key!=="placekey_error" && !geocodeFields.includes(key) && !returnedFields.includes(key)){
              console.log(`The key ${key} is not present in the api response, dropping from configured fields...`)
              delete fields[key]
            }
          }


    for(let field of returnedFields){
        const fieldObj = fields[field]
        
        if(field==="geocode"){
            for(let geoField of geocodeFields){
              ss.getRange(1, fields[geoField].columnIndex+1, 1, 1).setValue(fields[geoField].displayName)
            }
        }
        else{
          ss.getRange(1, fieldObj.columnIndex+1, 1, 1).setValue(fieldObj.displayName)
        }
        
        for(let index=0; index<batchIndexes[i].length; index++){
          let rowNumber = Number.parseInt(batchIndexes[i][index])+2
          let valueToAdd = json[index][field]
  
          if(field==="geocode"){
            for(let geoField of geocodeFields){
              let range = ss.getRange(rowNumber, fields[geoField].columnIndex+1, 1, 1)
              switch(geoField){
              case "geocode_latitude":
                range.setValue(valueToAdd.location.lat);
                continue;
              case "geocode_longitude":
                range.setValue(valueToAdd.location.lng)
                continue;
              case "geocode_lat_long":
                range.setValue(`(${valueToAdd.location.lat}, ${valueToAdd.location.lng})`)
                continue;
              case "geocode_precision":
                range.setValue(valueToAdd.location_type)
                continue;
            }
          }
         }
         else {
          ss.getRange(rowNumber, fieldObj.columnIndex+1, 1, 1).setValue(valueToAdd)
         }
         
        }
    }

    if(INSERT_ERROR){
       const fieldObj = fields[ERROR_KEY]
       ss.getRange(1, fieldObj.columnIndex+1, 1, 1).setValue(fieldObj.displayName)

       for(let index=0; index<sortedInvalidRows.length; index++){
          let rowNumber = Number.parseInt(sortedInvalidRows[index])+2
          let valueToAdd = errorRows[sortedInvalidRows[index]]
          // console.log('Adding value ', valueToAdd, ' to row ', rowNumber, ' and column ', fieldObj.columnIndex+1)
          ss.getRange(rowNumber, fieldObj.columnIndex+1, 1, 1).setValue(valueToAdd)
        }
    }
    totalPlaceKeys+=batchIndexes[i].length

    let msSinceRequestMade = new Date()-timeHitApi
    //only wait if it hasn't been a second since the last request was made
    if(msSinceRequestMade < 1000){
      let timeToWait = 1000-msSinceRequestMade
      Utilities.sleep(timeToWait);
      console.log('Waiting ', timeToWait, ' ms before making next request')
    }
    console.log(`Finished uploading valid rows ${i*STEP} - ${(i+1)*STEP}. Iterating...`)
    }

    console.log(`It took ${new Date() - now_} s to insert ${sortedValidRows.length} responses into the document`)
  
    console.log(`inserting time(total): ${new Date() - now}`)
    console.log(`inserting time: ${new Date() - now_}`)

    //divide by return field length because incremented on per-column basis
    props.setProperty(getStatusKey(uniqueKey), `Done! Generated ${totalPlaceKeys} Placekeys.`);
    return totalPlaceKeys;
  }
  
  // Reset user Propertise, For test
  
  function reset() {
    var userPr = PropertiesService.getUserProperties();
    userPr.deleteAllProperties();
    resetMapColumnsData();
  }
  
  // For test
  function testUser() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
  
    return sheet.getName();
  }
  
  // Insert Sample data, Please fill or remove remainings.
  
  function insertSample() {
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
    SpreadsheetApp.getUi().alert(message);
  }
  
  // Template Functions
  function include(filename) {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  }
  
  function refreshUpdateSheet() {
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
    const props = PropertiesService.getDocumentProperties();
    props.setProperty(ADD_ON_NAME + sheetId, JSON.stringify(data));
  }
  
  // get map Columns Data
  function getMapColumnsData(sheetId) {
    const props = PropertiesService.getDocumentProperties();
    let data = props.getProperty(ADD_ON_NAME + sheetId);
    return JSON.parse(data);
  }
  
  // reset map Columns Data
  function resetMapColumnsData() {
    const props = PropertiesService.getDocumentProperties();
    props.getKeys().forEach((v) => {
      if (v.includes(ADD_ON_NAME)) {
        props.deleteProperty(v);
      }
    });
  }
  
  // print all document property
  function printAllDocumentProperty() {
    const props = PropertiesService.getDocumentProperties();
    let allProps = props.getProperties();
    for (let key in allProps) {
      console.log(`${key} => ${allProps[key]}`);
    }
  }
  
  