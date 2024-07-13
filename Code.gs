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
    console.log(userKey)
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
  
  // get processing status
  function getStatus(key) {
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
 
    const fields = Object.fromEntries(["placekey"].concat(requestFields).map((field_name) => [field_name, {apiKey: field_name, displayName: field_name.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "), columnIndex: null}]))
    
        
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

    //determines if a row has enough inputs to be valid
    const isValidRow = (row) => {
      const rowObj = mapRowToObject(row)
      // console.log('ROW OBJ ', rowObj)
      const keysWithValues = Object.keys(rowObj).filter( key => rowObj[key].length > 0)
      // console.log('keysWithValues ', keysWithValues)
      if(keysWithValues.length<2){
        return false
      }

      const minimumInputs = [["latitude", "longitude"], ["street_address", "city", "region", "postal_code", "iso_country_code"], ["street_address", "region", "postal_code", "iso_country_code"],["street_address", "city", "region", "iso_country_code"]]
      
      
      for(let input of minimumInputs){
        let hasRequiredInputs = true
        for(let key of input){
          if(!keysWithValues.includes(key)){
            hasRequiredInputs = false
            break
          }
        }
        if(hasRequiredInputs){
          return true
        }
      }
      return false
    }

    //determine which rows are valid before sending to API so as to not use up daily limit with badly formatted rows
    let validRows = {}
    for(let i = 0; i < allRowsValues.length; i++){
      // console.log('ROW VALUES[i] ', allRowsValues[i])
       if(!isValidRow(allRowsValues[i])){
          console.log(`Row ${i+1} is invalid because it does not contain the minimum inputs. Skipping...`)
          continue
        }
      validRows[i] = allRowsValues[i]
    }


    //get the valid row indexes so that we can reinsert them in correct position after fetching api data
    let sortedValidRows = Object.keys(validRows).sort()
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
  
    // let props = PropertiesService.getDocumentProperties();
    // props.setProperty(uniqueKey, currentRequestCount);
    // props.setProperty(uniqueKey + "total", allRowsValues.length);
    // initRunningStatus_(uniqueKey, allRowsValues.length);
  
    // console.log(`firstore time(total): ${new Date() - now}`)
    // console.log(`firestore time: ${new Date() - now_}`)
    now_ = new Date()
  
    Logger.log = () => {}
  
    const requestArr = [];
    const additionalArr = [];
  
    // for (let country in countryWiseRows) {
    //   var rows = countryWiseRows[country];
  
    //   // Check if there are more than 10 records on the sheet and prepare chunks
  
    //   var chunks = [];
  
    //   let rowNum = rows.length + 1;
  
    //   var divided = rowNum / 100;
    //   var floorDivided = Math.ceil(divided);
    //   for (var j = 0; j < floorDivided; j++) {
    //     if (j + 1 == floorDivided) {
    //       // information in chunks for each item contains: [where it starts, where it ends, how many in chunk]
  
    //       chunks[j] = [j * 100, j * 100 + (rowNum - (floorDivided - 1) * 10) - 1, rowNum - (floorDivided - 1) * 10 - 1];
    //     } else {
    //       chunks[j] = [j * 10, j * 10 + 10, 10];
    //     }
    //   }
  
    //   console.log('CHUNKS ', chunks)
  
    //   // Logger.log(chunks);
  
    //   // start looking at chunks of rows
  
    //   for (var v = 0; v < chunks.length; v++) {
    //     console.log('start ', chunks[v][0]);
    //     console.log('end ', chunks[v][1]);
  
    //     var data = null;
    //     var data = {
    //       queries: [],
    //       options: {
    //         strict_address_match: ADDRESS_MATCH,
    //         strict_name_match: NAME_MATCH,
    //         fields: requestFields
    //       },
    //     };
    //     var problematicRows = [];
    //     var y = 0;
    //     var start = chunks[v][0];
    //     var end = chunks[v][1];
    //     var eachRowResponse = [];
    //     var errors = [];
    //     var parsed = null;
  
    //     // Utilities.sleep(1000);
    //     var countProblem = -1;
  
    //     // processing specific chunk and building queries for each row
  
    //     for (var k = chunks[v][0]; k < chunks[v][1]; k++) {
    //       countProblem++;
    //       // If there are empty cells in a row, that's problematic, Bulk API will not process any query if there is one problematic.
    //       // therfore, we will check and exclude those rows before requesting for Placekeys.
    //       // console.log(rows[k], k);
    //       // Logger.log(rows[k][colsId[0]], rows[k][colsId[1]], rows[k][colsId[2]], rows[k][colsId[3]], rows[k][colsId[5]], rows[k][colsId[6]]);
    //       if ((rows[k][colsId[1]] == "" || rows[k][colsId[3]] == "" || rows[k][colsId[1]] == null || rows[k][colsId[3]] == null) && (rows[k][colsId[5]] == "" || rows[k][colsId[6]] == "" || rows[k][colsId[5]] == null || rows[k][colsId[6]] == null) && (rows[k][colsId[1]] == "" || rows[k][colsId[2]] == "" || rows[k][colsId[4]] == "" || rows[k][colsId[1]] == null || rows[k][colsId[2]] == null || rows[k][colsId[4]] == null)) {
    //         problematicRows[k] = countProblem;
  
    //         continue;
    //       }
    //       data.queries[y] = {};
  
    //       // continue bulding queries, some values need to be placed as integer
  
    //       for (var n = 0; n < colsId.length; n++) {
    //         // Add null value for location name and state if it's unselected.
    //         if ((colsId[n] == "--" && n == 0) || (colsId[n] == "--" && n == 3)) {
    //           data.queries[y][key[n]] = "";
    //         }
    //         if (rows[k][colsId[n]] != "" && colsId[n] != "--") {
    //           data.queries[y][key[n]] = {};
  
    //           if (key[n] == "latitude" || key[n] == "longitude") {
    //             data.queries[y][key[n]] = parseFloat(rows[k][colsId[n]]);
    //           } else {
    //             data.queries[y][key[n]] = rows[k][colsId[n]];
    //           }
    //         }
    //       }
    //       // if (rows[k][colsId[7]] == null || rows[k][colsId[7]] == '') {
  
    //       //   data.queries[y]["iso_country_code"] = "US";
  
    //       // }
  
    //       data.queries[y]["query_id"] = k + "1";
    //       y = y + 1;
    //     }
    //     console.log('DATA ', data.options);
  
    //     // set status
    //     currentRequestCount += data.queries.length;
  
    //     // props.setProperty(uniqueKey, currentRequestCount);
  
    //     // Finish building queries ^^^^^^^^
    //     // start requesting for Placekeys
  
    //     requestArr.push(data);
    //     additionalArr.push({
    //       address,
    //       chunksDiff: chunks[v][1] - chunks[v][0],
    //       problematicRows,
    //       start, 
    //       rows,
          
    //     })
    //   }
    // }
  
    console.log(`chunk time(total): ${new Date() - now}`)
    console.log(`chunk time: ${new Date() - now_}`)
    now_ = new Date()
  
    // return;
  
    var userPr = PropertiesService.getUserProperties();
    var API_Key = userPr.getProperty("Key");
    console.log('API KEY ', API_Key)
  
    
    
   
  
    const URL = "https://us-central1-turnkey-slice-405415.cloudfunctions.net/placeKeyRequest";
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
      console.log('REQUEST DATA ', body)
 
      var requestOptions = {
      'method' : 'post',
      'contentType': 'application/json',
      // Convert the JavaScript object to a JSON string.
      'payload' : JSON.stringify(body),
      'headers': {
        'apikey': API_Key,
        "user-agent": "placekey-googlesheets/0.0.9",
        "content-type": "application/json",
      }
    };
    let res = UrlFetchApp.fetch("https://api.placekey.io/v1/placekeys", requestOptions);

    
    if(res.getResponseCode() != 200){
      throw new Error(res.getContentText())
    }

    let json = JSON.parse(res.getContentText());

    if(!json.length){
      console.log('No responses returned from the api, continuing to next batch if one exists...')
      continue
    }
    const returnedFields = Object.keys(json[0]).filter(field => field!=="query_id")
    //remove any fields we wanted to retrieve but were not returned
    for(let key of Object.keys(fields)){
            if(!returnedFields.filter(key => key!=="query_id").includes(key)){
              console.log(`The key ${key} is not present in the api response, dropping from configured fields...`)
              delete fields[key]
            }
          }
    // console.log('finalResults ', finalResults)
    console.log('Batch indexes ', batchIndexes)
    
    const columnHeadersToAdd = Object.values(fields).filter(field => returnedFields.includes(field.apiKey)).map(field => field.displayName)


    for(let field of returnedFields){
        // console.log('field ', field)
        const fieldObj = fields[field]
  
        ss.getRange(1, fieldObj.columnIndex+1, 1, 1).setValue(fieldObj.displayName)
        for(let index=0; index<batchIndexes[i].length; index++){
          let rowNumber = Number.parseInt(batchIndexes[i][index])+2
          let valueToAdd = json[index][field]
          console.log('Adding value ', valueToAdd, ' to row ', rowNumber, ' and column ', fieldObj.columnIndex+1)
          ss.getRange(rowNumber, fieldObj.columnIndex+1, 1, 1).setValue(valueToAdd)
        }
    }
    totalPlaceKeys+=batchIndexes[i].length
  
    Utilities.sleep(1000);
    }
  
    
    
  
  //   if(res.getResponseCode() != 200){
  //     console.log(res.getContentText());
  //     throw new Error("GCF Err")
  //   }
  
  //   console.log(`gcf time(total): ${new Date() - now}`)
  //   console.log(`gcf time: ${new Date() - now_}`)
  //   now_ = new Date()
  
  //   let json = JSON.parse(res.getContentText()).result;
    
  //   // //drop all response fields that that we wanted to return but weren't
  //   // for(let field of Object.keys(fields)){
  //   //   if(!Object.keys(json[0].data[0]))
  //   // }
  
  //   console.log('JSON ', json[0].data)
  
  //   let finalResults = [];
  //   let finalErrors = [];
  
  //   let finalResultCol, finalErrorCol;
  
  //   for (let responseStart = 0; responseStart < json.length; responseStart++) {
  //     let response = json[responseStart];
  
  //     var parsed = response.data ;
  //     var eachRowResponse = [];
  //     var errors = [];
  //     //var totalPlaceKeys = 0;
  //     if(response.status != 200)
  //       console.log("parsed response" + JSON.stringify(response));
  
  //     const {address, chunksDiff, problematicRows, start, rows} = additionalArr[responseStart];
    
  
  //     // All batch error replacment
  
  //     if (response.status == 400) {
  //       for (var i = 0; i < chunksDiff; i++) {
  //         if (1 == 1) {
  //           if (INSERT_ERROR == false) {
  //             eachRowResponse[i] = ["Invalid address"];
  //           } else {
  //             eachRowResponse.splice(i, 0, [""]);
  //             errors[i] = ["Invalid address"];
  //           }
  //         } else {
  //           totalPlaceKeys = totalPlaceKeys + 1;
  
  //           if (INSERT_ERROR  == false) {
  //             eachRowResponse[i] = ["Invalid address"];
  //           } else {
  //             eachRowResponse[i] = ["Invalid address"];
  
  //             errors.splice(i, 0, [""]);
  //           }
  //         }
  //       }
  //     }
  
  //     if (response.status == 429) {
  //       for (var i = 0; i < chunksDiff; i++) {
  //         if (1 == 1) {
  //           if (INSERT_ERROR  == false) {
  //             eachRowResponse[i] = [parsed?.["message"] ?? "API Error"];
  //           } else {
  //             eachRowResponse.splice(i, 0, [""]);
  //             errors[i] = [parsed?.["message"] ?? "API Error"];
  //           }
  //         } else {
  //           totalPlaceKeys = totalPlaceKeys + 1;
  
  //           if (INSERT_ERROR  == false) {
  //             eachRowResponse[i] = [parsed?.["message"] ?? "API Error"];
  //           } else {
  //             eachRowResponse[i] = [parsed?.["message"] ?? "API Error"];
  
  //             errors.splice(i, 0, [""]);
  //           }
  //         }
  //       }
  //     }
  //     //^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //     if(parsed.length){
        
  //       for(let key of Object.keys(fields)){
  //           if(!Object.keys(parsed[0]).filter(key => key!=="query_id").includes(key)){
  //             console.log(`The key ${key} is not present in the api response, dropping from configured fields...`)
  //             delete fields[key]
  //           }
  //         }
        
  //       console.log("PARSED ", parsed)
        
  //       for (var i = 0; i < parsed.length; i++) {
  //         if (parsed[i]["placekey"] == null) {
  //           if (INSERT_ERROR  == false) {
  //             eachRowResponse[i] = [parsed[i]["error"]];
  //           } else {
  //             eachRowResponse.splice(i, 0, [""]);
  //             errors[i] = [parsed[i]["error"]];
  //           }
  //         } else {
  //           totalPlaceKeys = totalPlaceKeys + 1;
  //           let rowResponse = []
  //           if (INSERT_ERROR  == false) {
  //             let returnedFields = Object.keys(parsed[i]).filter(key => key!=="query_id")
  //             for(let j = 0;  j < returnedFields.length;j++){
  //               key = returnedFields[j]
  //               fields[key]["api_response_col"] = j
  //               rowResponse.push(parsed[i][key])
  //             }
              
  //             // eachRowResponse[i] = [parsed[i]["placekey"], parsed[i]["confidence_score"], parsed[i]["gers"]];
  //             console.log('rowResponse ', rowResponse)
  //             eachRowResponse[i] = rowResponse
  //           } else {
  //             eachRowResponse[i] = [parsed[i]["placekey"]];
  
  //             errors.splice(i, 0, [""]);
  //           }
  //         }
  //       }
  //       console.log('eachRowResponse ', eachRowResponse)
  //     }
  
  //     // Logger.log(`problematicRows: ${JSON.stringify(problematicRows)}`);
  //     // Logger.log("row response: " + eachRowResponse);
  //     // Logger.log("error: " + errors);
  
  //     // We insert problematic rows to final result
  
  //     for (var i = 0; i < problematicRows.length; i++) {
  //       if (problematicRows[i] == null) {
  //         continue;
  //       }
  //       if (INSERT_ERROR  == false) {
  //         eachRowResponse.splice(problematicRows[i], 0, ["Incomplete address"]);
  //       } else {
  //         errors.splice(problematicRows[i], 0, ["Incomplete address"]);
  //         eachRowResponse.splice(problematicRows[i], 0, [""]);
  //       }
  //     }
  //     // Logger.log("row response: " + eachRowResponse);
  //     // Logger.log("error: " + errors);
  
  //     // If there is not we create one column and insert result.
  //     if (fields["placekey"].columnId === null || OVERWRITE === false) {
  //       // var ss = SpreadsheetApp.getActiveSheet();
  
  //       try {
  //         console.log('INSIDE THE TRY')
  //         // Logger.log(chunks[v][0] + 2);
  //         // Logger.log(chunks[v][1]);
  //         // Logger.log(colsNum);
  
  //         eachRowResponse.forEach((v, i) => {
  //           console.log('V: ', v, ' i: ', i)
  //           let rowNum_ = start + i;
  //           let rowNum = rows[rowNum_][rows[rowNum_].length - 1];
  
  //           finalResultCol = colsNum + 1;
  //           finalResults[rowNum] = v;
  //           if (INSERT_ERROR  == true) {
  //             finalErrorCol = colsNum + 2;
  //             finalErrors[rowNum] = [errors[i]];
  //           }
  //         });
  //       } catch (e) {
  //         console.log('INSIDE THE CATCH')
  //         console.log(e);
  //         // SpreadsheetApp.getUi().alert(e);
  
  //         eachRowResponse.forEach((v, i) => {
  //           let rowNum_ = start + i;
  //           if(rows[rowNum_] == undefined){
  //             console.error({rows, rowNum_, start, i})
  //           }
  //           let rowNum = rows[rowNum_][rows[rowNum_].length - 1];
  
  //           finalResultCol = colsNum + 1;
  //           finalResults[rowNum] = [parsed["message"]];
  //           if (INSERT_ERROR  == true) {
  //             finalErrorCol = colsNum + 2;
  //             finalErrors[rowNum] = [parsed["message"]]
  //           }
  //         });
  //       }
  //     } else {
  //       try {
  //         console.log('INSIDE THE TRY WHEN COLUMN EXISTS')
  //         eachRowResponse.forEach((v, i) => {
  //           let rowNum_ = start + i;
  //           let rowNum = rows[rowNum_][rows[rowNum_].length - 1];
  
  //           // if (INSERT_ERROR  == false) {
  //           //   ss.getRange(rowNum + 2, fields["placekey"].columnId + 1).setValue(v);
  //           // } else {
  //           //   ss.getRange(rowNum + 2, fields["placekey"].columnId + 1).setValue(v);
  //           //   ss.getRange(rowNum + 2, fields["placekey"].columnId + 2).setValue(errors[i]);
  //           // }
  
  //           finalResultCol = fields["placekey"].columnId + 1;
  //           finalResults[rowNum] = v;
  //           if (INSERT_ERROR  == true) {
  //             finalErrorCol = fields["placekey"].columnId + 2;
  //             finalErrors[rowNum] = [errors[i]];
  //           }
  //         });
  //       } catch (e) {
  //         console.log('INSIDE THE CATCH WHEN COL EXISTS')
  //         console.log(e);
  //         eachRowResponse.forEach((v, i) => {
  //           let rowNum_ = start + i;
  //           let rowNum = rows[rowNum_][rows[rowNum_].length - 1];
  
  //           // if (INSERT_ERROR  == false) {
  //           //   ss.getRange(rowNum + 2, fields["placekey"].columnId + 1).setValue(parsed["message"]);
  //           // } else {
  //           //   ss.getRange(rowNum + 2, fields["placekey"].columnId + 2).setValue(parsed["message"]);
  //           // }
  
  //           finalResultCol = fields["placekey"].columnId + 1;
  //           finalResults[rowNum] = [""];
  //           if (INSERT_ERROR  == true) {
  //             finalErrorCol = fields["placekey"].columnId + 2;
  //             finalErrors[rowNum] = [parsed["message"]];
  //           }
  //         });
  //       }
  //     }
  
  //   }
    
    
  //   const columnHeadersToAdd = []
  //   for(let i = 0; i < Object.keys(fields).length; i++){
  //     columnHeadersToAdd.push(Object.values(fields).filter(field => field.api_response_col===i)[0].displayName)
  //   }
  //   // console.log('columnHeadersToAdd ', columnHeadersToAdd)
  //   // ss.getRange(1, ss.getLastColumn()+1, 1, columnHeadersToAdd.length).setValues([columnHeadersToAdd])
  //   // ss.getRange(2, ss.getLastColumn(), finalResults.length, columnHeadersToAdd.length).setValues(finalResults);
  //   // if () {
  //   //     );
  //   // }
  
  //   console.log('FINAL RES ', finalResults)
  
  // /*
  // getRange(row, column, numRows, numColumns)
  // row	- Integer	The starting row index of the range; row indexing starts with 1.
  // column - Integer	The starting column index of the range; column indexing starts with 1.
  // numRows - Integer	The number of rows to return.
  // numColumns - Integer	The number of columns to return.
  
  // get the range starting from the second row,
  // */ 
  //   // finalResults = [ [ '227-223@5vg-82n-pgk', 'HIGH',null ] ,
  //   //  [ '226-222@5vg-7gx-5pv', 'HIGH', null ],
  //   //  [ '22c-222@627-wc7-6kz',
  //   //     'HIGH',
  //   //     '08f2a1072c276c8c0390f18659fa98b2' ],
  //   //  [ '22c@627-wc7-6kz', 'HIGH', null ]  ]
  //   console.log('finalResultCol ', finalResultCol)
  //   console.log('finalResults ', finalResults)
  //   console.log('columnHeadersToAdd ', columnHeadersToAdd)
  //   const resultsWithHeaders = [columnHeadersToAdd].concat(finalResults)
  //   console.log('resultsWithHeaders ', resultsWithHeaders)
  //   ss.getRange(1, ss.getLastColumn()+1, resultsWithHeaders.length, columnHeadersToAdd.length).setValues(resultsWithHeaders);
  //   if(finalErrorCol){
  //     ss.getRange(1, finalErrorCol, finalErrors.length + 1, 1).setValues([["Error"], ...finalErrors]);
  //   }
  
    console.log(`inserting time(total): ${new Date() - now}`)
    console.log(`inserting time: ${new Date() - now_}`)
  
  
    // props.deleteProperty(uniqueKey);
    // props.deleteProperty(uniqueKey + "total");

    //divide by return field length because incremented on per-column basis
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
  
  