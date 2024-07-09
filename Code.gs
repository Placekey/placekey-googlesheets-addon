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

function generateKeys(address, uniqueKey, requestFields=[]) {
  const ADDRESS_MATCH = 8
  const NAME_MATCH = 9
  const OVERWRITE = 10
  const INSERT_ERROR = 11
// Object.fromEntries( a_list.map( x => [key_maker(x), value_maker(x)]) );
  const fields = Object.fromEntries(["placekey"].concat(requestFields).map((field_name) => [field_name, {apiKey: field_name, displayName: field_name.split("_").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "), columnIndex: null}]))
  console.log('FIELD DICT ', fields)
        // address.push(false); //9, nameMatch
        // address.push(true); //10, overwrite
        // address.push(insertError); // 11, insertError
  let now = new Date();
  let now_ = now;
  console.log('ADDRESS ', address);
  var ss = SpreadsheetApp.getActiveSheet();
  var sheetId = ss.getSheetId();
  var colsNum = ss.getLastColumn();
  console.log('COLS NUMBER ', colsNum)
  var colsHeader = ss.getRange(1, 1, 1, colsNum).getDisplayValues();
  console.log('COLS HEADER ', colsHeader)
  var colsId = [];
  var problematicRows = [];
  var key = ["location_name", "street_address", "city", "region", "postal_code", "latitude", "longitude", "iso_country_code"];

  // save address
  setMapColumnsData(sheetId, address);

  // Map user selected address columns with sheet columns
  for (var i = 0; i < address.length - 2; i++) {
    for (var j = 0; j < colsNum; j++) {
      if (address[i] == colsHeader[0][j]) {
        colsId.push(j);
        break;
      }
      if (address[i] == "--") {
        colsId.push("--");
        break;
      }
    }
  }
  Logger.log(colsId);
  var rowNum = ss.getLastRow();
  console.log(`There are ${rowNum-1} rows in the document`)

  // Check if there is already a Placekey Column
  // var PlacekeyColumnId = 0;

  for( const [key, value] of Object.entries(fields)){
    lowerCaseCols = colsHeader[0].map(name => name.toLowerCase())
    if(lowerCaseCols.includes(value.displayName.toLowerCase())){
      fields[key].columnIndex = lowerCaseCols.indexOf(value.displayName.toLowerCase())
    }
  }


  // const columnIds = Object.fromEntries(["placekey"].concat(fields).map( x => [key_maker(x), value_maker(x)]) )
  // for (var j = 0; j < colsNum; j++) {
  //   if (colsHeader[0][j] == "Placekey") {
  //     PlacekeyColumnId = j;
  //     break;
  //   }
  // }

  console.log(`Before get Values time: ${new Date() - now}`)
  now_ = new Date();

  var allRowsValues = ss.getRange(2, 1, ss.getLastRow() - 1, ss.getLastColumn()).getDisplayValues();
  console.log('ALL ROW VALUES ', allRowsValues)

  console.log(`get Values time(total): ${new Date() - now}`)
  console.log(`get Values time: ${new Date() - now_}`)
  now_ = new Date()

  const countryWiseRows = {};

  // filter by country
  allRowsValues.forEach((v, i) => {
    let rowValues = [...v];
    let countryColumn_ = colsId[7];
    if (countryColumn_ == "--") {
      rowValues.push("");
      countryColumn_ = rowValues.length - 1;
      if (i == allRowsValues.length - 1) colsId[7] = countryColumn_;
    }

    // console.log(rowValues);
    // console.log(colsId);

    let countryColumn = rowValues[countryColumn_];
    if (!countryColumn) {
      countryColumn = "US";
      rowValues[countryColumn_] = countryColumn;
    }

    if (!countryWiseRows[countryColumn]) countryWiseRows[countryColumn] = [];

    // add rowIndex in last column
    countryWiseRows[countryColumn].push([...rowValues, i]);
  });

  console.log(`contryWise time(total): ${new Date() - now}`)
  console.log(`contryWise time: ${new Date() - now_}`)
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

  for (let country in countryWiseRows) {
    var rows = countryWiseRows[country];

    // Check if there are more than 10 records on the sheet and prepare chunks

    var chunks = [];

    let rowNum = rows.length + 1;

    var divided = rowNum / 10;
    var floorDivided = Math.ceil(divided);
    for (var j = 0; j < floorDivided; j++) {
      if (j + 1 == floorDivided) {
        // information in chunks for each item contains: [where it starts, where it ends, how many in chunk]

        chunks[j] = [j * 10, j * 10 + (rowNum - (floorDivided - 1) * 10) - 1, rowNum - (floorDivided - 1) * 10 - 1];
      } else {
        chunks[j] = [j * 10, j * 10 + 10, 10];
      }
    }

    console.log('CHUNKS ', chunks)

    // Logger.log(chunks);

    // start looking at chunks of rows

    for (var v = 0; v < chunks.length; v++) {
      console.log('start ', chunks[v][0]);
      console.log('end ', chunks[v][1]);

      var data = null;
      var data = {
        queries: [],
        options: {
          strict_address_match: address[ADDRESS_MATCH],
          strict_name_match: address[NAME_MATCH],
          fields: requestFields
        },
      };
      var problematicRows = [];
      var y = 0;
      var start = chunks[v][0];
      var end = chunks[v][1];
      var eachRowResponse = [];
      var errors = [];
      var parsed = null;

      // Utilities.sleep(1000);
      var countProblem = -1;

      // processing specific chunk and building queries for each row

      for (var k = chunks[v][0]; k < chunks[v][1]; k++) {
        countProblem++;
        // If there are empty cells in a row, that's problematic, Bulk API will not process any query if there is one problematic.
        // therfore, we will check and exclude those rows before requesting for Placekeys.
        // console.log(rows[k], k);
        // Logger.log(rows[k][colsId[0]], rows[k][colsId[1]], rows[k][colsId[2]], rows[k][colsId[3]], rows[k][colsId[5]], rows[k][colsId[6]]);
        if ((rows[k][colsId[1]] == "" || rows[k][colsId[3]] == "" || rows[k][colsId[1]] == null || rows[k][colsId[3]] == null) && (rows[k][colsId[5]] == "" || rows[k][colsId[6]] == "" || rows[k][colsId[5]] == null || rows[k][colsId[6]] == null) && (rows[k][colsId[1]] == "" || rows[k][colsId[2]] == "" || rows[k][colsId[4]] == "" || rows[k][colsId[1]] == null || rows[k][colsId[2]] == null || rows[k][colsId[4]] == null)) {
          problematicRows[k] = countProblem;

          continue;
        }
        data.queries[y] = {};

        // continue bulding queries, some values need to be placed as integer

        for (var n = 0; n < colsId.length; n++) {
          // Add null value for location name and state if it's unselected.
          if ((colsId[n] == "--" && n == 0) || (colsId[n] == "--" && n == 3)) {
            data.queries[y][key[n]] = "";
          }
          if (rows[k][colsId[n]] != "" && colsId[n] != "--") {
            data.queries[y][key[n]] = {};

            if (key[n] == "latitude" || key[n] == "longitude") {
              data.queries[y][key[n]] = parseFloat(rows[k][colsId[n]]);
            } else {
              data.queries[y][key[n]] = rows[k][colsId[n]];
            }
          }
        }
        // if (rows[k][colsId[7]] == null || rows[k][colsId[7]] == '') {

        //   data.queries[y]["iso_country_code"] = "US";

        // }

        data.queries[y]["query_id"] = k + "1";
        y = y + 1;
      }
      console.log('DATA ', data.options);

      // set status
      currentRequestCount += data.queries.length;

      // props.setProperty(uniqueKey, currentRequestCount);

      // Finish building queries ^^^^^^^^
      // start requesting for Placekeys

      requestArr.push(data);
      additionalArr.push({
        address,
        chunksDiff: chunks[v][1] - chunks[v][0],
        problematicRows,
        start, 
        rows,
        
      })
    }
  }

  console.log(`chunk time(total): ${new Date() - now}`)
  console.log(`chunk time: ${new Date() - now_}`)
  now_ = new Date()

  // return;

  var userPr = PropertiesService.getUserProperties();
  var API_Key = userPr.getProperty("Key");

  console.log('REQUEST DATA ', requestArr[0].queries)

  let url = "https://us-central1-turnkey-slice-405415.cloudfunctions.net/placeKeyRequest";

  let options = {
    method: "POST",
      muteHttpExceptions: true,
      contentType: "application/json",
      payload: JSON.stringify({
        root: "https://api.placekey.io/v1/placekeys",
        method: "POST",
        apikey: API_Key,
        "user-agent": "placekey-googlesheets/0.0.9",
        data: requestArr,
        key: uniqueKey
      }),
  };

  let res = UrlFetchApp.fetch(url, options);

  if(res.getResponseCode() != 200){
    console.log(res.getContentText());
    throw new Error("GCF Err")
  }

  console.log(`gcf time(total): ${new Date() - now}`)
  console.log(`gcf time: ${new Date() - now_}`)
  now_ = new Date()

  let json = JSON.parse(res.getContentText()).result;
  
  // //drop all response fields that that we wanted to return but weren't
  // for(let field of Object.keys(fields)){
  //   if(!Object.keys(json[0].data[0]))
  // }

  console.log('JSON ', json[0].data)

  let finalResults = [];
  let finalErrors = [];

  let finalResultCol, finalErrorCol;

  for (let responseStart = 0; responseStart < json.length; responseStart++) {
    let response = json[responseStart];

    var parsed = response.data ;
    var eachRowResponse = [];
    var errors = [];
    //var totalPlaceKeys = 0;
    if(response.status != 200)
      console.log("parsed response" + JSON.stringify(response));

    const {address, chunksDiff, problematicRows, start, rows} = additionalArr[responseStart];
  

    // All batch error replacment

    if (response.status == 400) {
      for (var i = 0; i < chunksDiff; i++) {
        if (1 == 1) {
          if (address[INSERT_ERROR] == false) {
            eachRowResponse[i] = ["Invalid address"];
          } else {
            eachRowResponse.splice(i, 0, [""]);
            errors[i] = ["Invalid address"];
          }
        } else {
          totalPlaceKeys = totalPlaceKeys + 1;

          if (address[INSERT_ERROR]  == false) {
            eachRowResponse[i] = ["Invalid address"];
          } else {
            eachRowResponse[i] = ["Invalid address"];

            errors.splice(i, 0, [""]);
          }
        }
      }
    }

    if (response.status == 429) {
      for (var i = 0; i < chunksDiff; i++) {
        if (1 == 1) {
          if (address[INSERT_ERROR]  == false) {
            eachRowResponse[i] = [parsed?.["message"] ?? "API Error"];
          } else {
            eachRowResponse.splice(i, 0, [""]);
            errors[i] = [parsed?.["message"] ?? "API Error"];
          }
        } else {
          totalPlaceKeys = totalPlaceKeys + 1;

          if (address[INSERT_ERROR]  == false) {
            eachRowResponse[i] = [parsed?.["message"] ?? "API Error"];
          } else {
            eachRowResponse[i] = [parsed?.["message"] ?? "API Error"];

            errors.splice(i, 0, [""]);
          }
        }
      }
    }
    //^^^^^^^^^^^^^^^^^^^^^^^^^^^
    if(parsed.length){
      
      for(let key of Object.keys(fields)){
          if(!Object.keys(parsed[0]).filter(key => key!=="query_id").includes(key)){
            console.log(`The key ${key} is not present in the api response, dropping from configured fields...`)
            delete fields[key]
          }
        }
      
      console.log("PARSED ", parsed)
      
      for (var i = 0; i < parsed.length; i++) {
        if (parsed[i]["placekey"] == null) {
          if (address[INSERT_ERROR]  == false) {
            eachRowResponse[i] = [parsed[i]["error"]];
          } else {
            eachRowResponse.splice(i, 0, [""]);
            errors[i] = [parsed[i]["error"]];
          }
        } else {
          totalPlaceKeys = totalPlaceKeys + 1;
          let rowResponse = []
          if (address[INSERT_ERROR]  == false) {
            let returnedFields = Object.keys(parsed[i]).filter(key => key!=="query_id")
            for(let j = 0;  j < returnedFields.length;j++){
              key = returnedFields[j]
              fields[key]["api_response_col"] = j
              rowResponse.push(parsed[i][key])
            }
            
            // eachRowResponse[i] = [parsed[i]["placekey"], parsed[i]["confidence_score"], parsed[i]["gers"]];
            console.log('rowResponse ', rowResponse)
            eachRowResponse[i] = rowResponse
          } else {
            eachRowResponse[i] = [parsed[i]["placekey"]];

            errors.splice(i, 0, [""]);
          }
        }
      }
      console.log('eachRowResponse ', eachRowResponse)
    }

    // Logger.log(`problematicRows: ${JSON.stringify(problematicRows)}`);
    // Logger.log("row response: " + eachRowResponse);
    // Logger.log("error: " + errors);

    // We insert problematic rows to final result

    for (var i = 0; i < problematicRows.length; i++) {
      if (problematicRows[i] == null) {
        continue;
      }
      if (address[INSERT_ERROR]  == false) {
        eachRowResponse.splice(problematicRows[i], 0, ["Incomplete address"]);
      } else {
        errors.splice(problematicRows[i], 0, ["Incomplete address"]);
        eachRowResponse.splice(problematicRows[i], 0, [""]);
      }
    }
    // Logger.log("row response: " + eachRowResponse);
    // Logger.log("error: " + errors);

    // If there is not we create one column and insert result.
    if (fields["placekey"].columnId === null || address[OVERWRITE] == false) {
      // var ss = SpreadsheetApp.getActiveSheet();

      try {
        console.log('INSIDE THE TRY')
        // Logger.log(chunks[v][0] + 2);
        // Logger.log(chunks[v][1]);
        // Logger.log(colsNum);

        eachRowResponse.forEach((v, i) => {
          console.log('V: ', v, ' i: ', i)
          let rowNum_ = start + i;
          let rowNum = rows[rowNum_][rows[rowNum_].length - 1];

          finalResultCol = colsNum + 1;
          finalResults[rowNum] = v;
          if (address[INSERT_ERROR]  == true) {
            finalErrorCol = colsNum + 2;
            finalErrors[rowNum] = [errors[i]];
          }
        });
      } catch (e) {
        console.log('INSIDE THE CATCH')
        console.log(e);
        // SpreadsheetApp.getUi().alert(e);

        eachRowResponse.forEach((v, i) => {
          let rowNum_ = start + i;
          if(rows[rowNum_] == undefined){
            console.error({rows, rowNum_, start, i})
          }
          let rowNum = rows[rowNum_][rows[rowNum_].length - 1];

          finalResultCol = colsNum + 1;
          finalResults[rowNum] = [parsed["message"]];
          if (address[INSERT_ERROR]  == true) {
            finalErrorCol = colsNum + 2;
            finalErrors[rowNum] = [parsed["message"]]
          }
        });
      }
    } else {
      try {
        console.log('INSIDE THE TRY WHEN COLUMN EXISTS')
        eachRowResponse.forEach((v, i) => {
          let rowNum_ = start + i;
          let rowNum = rows[rowNum_][rows[rowNum_].length - 1];

          // if (address[INSERT_ERROR]  == false) {
          //   ss.getRange(rowNum + 2, fields["placekey"].columnId + 1).setValue(v);
          // } else {
          //   ss.getRange(rowNum + 2, fields["placekey"].columnId + 1).setValue(v);
          //   ss.getRange(rowNum + 2, fields["placekey"].columnId + 2).setValue(errors[i]);
          // }

          finalResultCol = fields["placekey"].columnId + 1;
          finalResults[rowNum] = v;
          if (address[INSERT_ERROR]  == true) {
            finalErrorCol = fields["placekey"].columnId + 2;
            finalErrors[rowNum] = [errors[i]];
          }
        });
      } catch (e) {
        console.log('INSIDE THE CATCH WHEN COL EXISTS')
        console.log(e);
        eachRowResponse.forEach((v, i) => {
          let rowNum_ = start + i;
          let rowNum = rows[rowNum_][rows[rowNum_].length - 1];

          // if (address[INSERT_ERROR]  == false) {
          //   ss.getRange(rowNum + 2, fields["placekey"].columnId + 1).setValue(parsed["message"]);
          // } else {
          //   ss.getRange(rowNum + 2, fields["placekey"].columnId + 2).setValue(parsed["message"]);
          // }

          finalResultCol = fields["placekey"].columnId + 1;
          finalResults[rowNum] = [""];
          if (address[INSERT_ERROR]  == true) {
            finalErrorCol = fields["placekey"].columnId + 2;
            finalErrors[rowNum] = [parsed["message"]];
          }
        });
      }
    }

  }
  
  
  const columnHeadersToAdd = []
  for(let i = 0; i < Object.keys(fields).length; i++){
    columnHeadersToAdd.push(Object.values(fields).filter(field => field.api_response_col===i)[0].displayName)
  }
  // console.log('columnHeadersToAdd ', columnHeadersToAdd)
  // ss.getRange(1, ss.getLastColumn()+1, 1, columnHeadersToAdd.length).setValues([columnHeadersToAdd])
  // ss.getRange(2, ss.getLastColumn(), finalResults.length, columnHeadersToAdd.length).setValues(finalResults);
  // if () {
  //     );
  // }

  console.log('FINAL RES ', finalResults)

/*
getRange(row, column, numRows, numColumns)
row	- Integer	The starting row index of the range; row indexing starts with 1.
column - Integer	The starting column index of the range; column indexing starts with 1.
numRows - Integer	The number of rows to return.
numColumns - Integer	The number of columns to return.

get the range starting from the second row,
*/ 
  // finalResults = [ [ '227-223@5vg-82n-pgk', 'HIGH',null ] ,
  //  [ '226-222@5vg-7gx-5pv', 'HIGH', null ],
  //  [ '22c-222@627-wc7-6kz',
  //     'HIGH',
  //     '08f2a1072c276c8c0390f18659fa98b2' ],
  //  [ '22c@627-wc7-6kz', 'HIGH', null ]  ]
  console.log('finalResultCol ', finalResultCol)
  console.log('finalResults ', finalResults)
  console.log('columnHeadersToAdd ', columnHeadersToAdd)
  const resultsWithHeaders = [columnHeadersToAdd].concat(finalResults)
  console.log('resultsWithHeaders ', resultsWithHeaders)
  ss.getRange(1, ss.getLastColumn()+1, resultsWithHeaders.length, columnHeadersToAdd.length).setValues(resultsWithHeaders);
  if(finalErrorCol){
    ss.getRange(1, finalErrorCol, finalErrors.length + 1, 1).setValues([["Error"], ...finalErrors]);
  }

  console.log(`inserting time(total): ${new Date() - now}`)
  console.log(`inserting time: ${new Date() - now_}`)


  // props.deleteProperty(uniqueKey);
  // props.deleteProperty(uniqueKey + "total");

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