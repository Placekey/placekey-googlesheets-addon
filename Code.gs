// it will create the menu right after installation.
function onInstall(e) {
  onOpen(e);
}

function onOpen(e) {
  var ui = SpreadsheetApp.getUi()
  var menu = ui.createAddonMenu();
  menu.addItem('Generate Placekeys', 'PlaceKey').addSeparator()
    .addItem('Additional Information', 'feedback');
  menu.addToUi();
}


function feedback() {
  var htmlOutput = HtmlService.createTemplateFromFile('Help').evaluate()
    .setWidth(350)
    .setHeight(350);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'Placekey Help');
}

// This function checks if user save API Key or not/

function PlaceKey() {
  var userPr = PropertiesService.getUserProperties();
  var userKey = userPr.getProperty('Key');
  if (!userKey) {
    var htmlOutput = HtmlService.createTemplateFromFile('setKey').evaluate()
      .setWidth(500)
      .setHeight(150);
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'API Key');
  } else {
    var htmlOutput = HtmlService.createTemplateFromFile('mapColumns').evaluate().append('<input id="storedKey" value="" style="display:none">')
      .setTitle('Placekey');
    SpreadsheetApp.getUi().showSidebar(htmlOutput);
  }
}

// Set API Key

function setUserProperties(els) {
  var userPr = PropertiesService.getUserProperties();
  var userKey = userPr.setProperty('Key', els)
  // Code below added to accomplish point 3
  var userKey = userPr.getProperty('Key');
  if (!userKey) {
    var htmlOutput = HtmlService.createTemplateFromFile('setKey').evaluate()
      .setWidth(500)
      .setHeight(150);
    SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'API Key');
  } else {
    var htmlOutput = HtmlService.createTemplateFromFile('mapColumns').evaluate().append('<input id="storedKey" value="" style="display:none">')
      .setTitle('Placekey');
    SpreadsheetApp.getUi().showSidebar(htmlOutput);
  }

}

// Displays the API Key window

function changeKey() {
  var userPr = PropertiesService.getUserProperties();
  var userKey = userPr.getProperty('Key');
  var htmlOutput = HtmlService.createTemplateFromFile('setKey').evaluate().append('<input id="storedKey" value="' + userKey + '" style="display:none">')
    .setWidth(500)
    .setHeight(150);
  SpreadsheetApp.getUi().showModalDialog(htmlOutput, 'API Key');


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
    var cols = selected.getRange(1, 1, 1, selected.getLastColumn()).getDisplayValues();
    return [active, sheetNames, cols]
  } catch (e) {
    return [active, sheetNames, false]
  }
}

// It's changing the active sheet if user selects another sheet as data source

function changeSheet(selectedSheet) {
  var selected = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(selectedSheet);
  SpreadsheetApp.setActiveSheet(selected);
  try {
    var cols = selected.getRange(1, 1, 1, selected.getLastColumn()).getDisplayValues();
    return cols
  } catch (e) {
    return false
  }
}

// It's generating Placekeys by requesting bulk

function generateKeys(address) {
  Logger.log(address)
  var ss = SpreadsheetApp.getActiveSheet();
  var colsNum = ss.getLastColumn();
  var colsHeader = ss.getRange(1, 1, 1, colsNum).getDisplayValues();
  var colsId = [];
  var problematicRows = [];
  var key = ["location_name", "street_address", "city", "region", "postal_code", "latitude", "longitude", "iso_country_code"];

  // Map user selected address columns with sheet columns

  for (var i = 0; i < address.length - 2; i++) {
    for (var j = 0; j < colsNum; j++) {
      if (address[i] == colsHeader[0][j]) {
        colsId.push(j);
        break
      }
      if (address[i] == '--') {
        colsId.push('--');
        break
      }
    }
  }
  Logger.log(colsId);
  var rowNum = ss.getLastRow();


  // Check if there is already a Placekey Column
  var PlacekeyColumnId = 0;
  for (var j = 0; j < colsNum; j++) {

    if (colsHeader[0][j] == 'Placekey') {
      PlacekeyColumnId = j;
      break
    }
  }


  var rows = ss.getRange(2, 1, ss.getLastRow() - 1, ss.getLastColumn()).getDisplayValues();

  // Check if there are more than 90 records on the sheet and prepare chunks

  var chunks = []

  var divided = rowNum / 90;
  var floorDivided = Math.ceil(divided);
  for (var j = 0; j < floorDivided; j++) {
    if (j + 1 == floorDivided) {

      // information in chunks for each item contains: [where it starts, where it ends, how many in chunk]

      chunks[j] = [j * 90, (j * 90) + (rowNum - (floorDivided - 1) * 90) - 1, (rowNum - (floorDivided - 1) * 90) - 1];

    } else {
      chunks[j] = [j * 90, j * 90 + 90, 90];
    }
  }

  Logger.log(chunks)
  var totalPlaceKeys = 0;

  // start looking at chunks of rows

  for (var v = 0; v < chunks.length; v++) {
    Logger.log(chunks[v][0])
    Logger.log(chunks[v][1])

    var data = null;
    var data = {
      "queries": [],
      "options": {
        "strict_address_match": address[8],
        "strict_name_match": address[9]
      }
    };
    var problematicRows = [];
    var y = 0;
    var start = chunks[v][0];
    var end = chunks[v][1];
    var eachRowResponse = [];
    var errors = [];
    var parsed = null;

    Utilities.sleep(1000)
    var countProblem = -1;

    // processing specific chunk and building queries for each row

    for (var k = chunks[v][0]; k < chunks[v][1]; k++) {
      countProblem++
      // If there are empty cells in a row, that's problematic, Bulk API will not process any query if there is one problematic.
      // therfore, we will check and exclude those rows before requesting for Placekeys.
      Logger.log(rows[k][colsId[0]], rows[k][colsId[1]], rows[k][colsId[2]], rows[k][colsId[3]], rows[k][colsId[5]], rows[k][colsId[6]])
      if ((rows[k][colsId[1]] == '' || rows[k][colsId[3]] == '' ||
        rows[k][colsId[1]] == null || rows[k][colsId[3]] == null) &&
        (rows[k][colsId[5]] == '' || rows[k][colsId[6]] == '' || rows[k][colsId[5]] == null || rows[k][colsId[6]] == null) &&
        (rows[k][colsId[1]] == '' || rows[k][colsId[2]] == '' || rows[k][colsId[4]] == '' || rows[k][colsId[1]] == null || rows[k][colsId[2]] == null || rows[k][colsId[4]] == null)
      ) {
        problematicRows[k] = countProblem;

        continue
      }
      data.queries[y] = {};

      // continue bulding queries, some values need to be placed as integer

      for (var n = 0; n < colsId.length; n++) {
        if (rows[k][colsId[n]] != '' && colsId[n] != '--') {

          data.queries[y][key[n]] = {};

          if (key[n] == "latitude" || key[n] == "longitude") {

            data.queries[y][key[n]] = parseFloat(rows[k][colsId[n]])
          } else {
            data.queries[y][key[n]] = rows[k][colsId[n]]
          }
        }
      }
      if (rows[k][colsId[7]] == null || rows[k][colsId[7]] == '') {

        data.queries[y]["iso_country_code"] = "US";

      }


      data.queries[y]["query_id"] = k + "1";
      y = y + 1
    }
    Logger.log(data);

    // Finish building queries ^^^^^^^^
    // start requesting for Placekeys

    var userPr = PropertiesService.getUserProperties();
    var API_Key = userPr.getProperty('Key');
    var root = "https://api.placekey.io/v1/placekeys";
    var params = {
      method: "POST",
      muteHttpExceptions: true,
      contentType: "application/json",
      headers: {
        apikey: API_Key,
        "user-agent": "placekey-googlesheets/0.0.9"
      },
      payload: JSON.stringify(data)
    };
    var response = UrlFetchApp.fetch(root, params);

    Logger.log(response)
    var parsed = JSON.parse(response)
    var eachRowResponse = [];
    var errors = [];
    //var totalPlaceKeys = 0;
    Logger.log('parsed response' + response)
    Logger.log('code response' + response.getResponseCode())

    try {
      if (response.getResponseCode() == 429) {
        v = v - 1;
        Utilities.sleep(5000);
        continue
      }
    } catch (e) { }

    // All batch error replacment

    if (response.getResponseCode() == 400) {
      for (var i = 0; i < chunks[v][1] - chunks[v][0]; i++) {
        if (1 == 1) {
          if (address[11] == false) {
            eachRowResponse[i] = ['Invalid address'];
          } else {

            eachRowResponse.splice(
              i,
              0, [''],
            )
            errors[i] = ['Invalid address'];
          }

        } else {
          totalPlaceKeys = totalPlaceKeys + 1

          if (address[11] == false) {
            eachRowResponse[i] = ['Invalid address']

          } else {
            eachRowResponse[i] = ['Invalid address']

            errors.splice(
              i,
              0, [''],
            )
          }

        }

      }
    }
    //^^^^^^^^^^^^^^^^^^^^^^^^^^^
    for (var i = 0; i < parsed.length; i++) {
      if (parsed[i]["placekey"] == null) {
        if (address[11] == false) {
          eachRowResponse[i] = [parsed[i]["error"]];
        } else {

          eachRowResponse.splice(
            i,
            0, [''],
          )
          errors[i] = [parsed[i]["error"]]
        }

      } else {
        totalPlaceKeys = totalPlaceKeys + 1

        if (address[11] == false) {
          eachRowResponse[i] = [parsed[i]["placekey"]]

        } else {
          eachRowResponse[i] = [parsed[i]["placekey"]]

          errors.splice(
            i,
            0, [''],
          )
        }

      }

    }

    Logger.log(problematicRows)
    Logger.log("row response: " + eachRowResponse)
    Logger.log("error: " + errors)


    // We insert problematic rows to final result

    for (var i = 0; i < problematicRows.length; i++) {
      if (problematicRows[i] == null) {
        continue
      }
      if (address[11] == false) {
        eachRowResponse.splice(
          problematicRows[i],
          0, ['Incomplete address'],
        )
      } else {
        errors.splice(
          problematicRows[i],
          0, ['Incomplete address'],
        )
        eachRowResponse.splice(
          problematicRows[i],
          0, [''],
        )

      }

    }
    Logger.log("row response: " + eachRowResponse)
    Logger.log("error: " + errors)


    // If there is not we create one column and insert result.

    if (PlacekeyColumnId == 0 || address[10] == false) {

      try {
        Logger.log(chunks[v][0] + 2)
        Logger.log(chunks[v][1])
        Logger.log(colsNum)
        var ss = SpreadsheetApp.getActiveSheet();
        var range = ss.getRange(start + 2, colsNum + 1, chunks[v][2], 1);
        range.setValues(eachRowResponse);
        if (address[11] == true) {
          ss.getRange(1, colsNum + 2).setValue('Errors')
          ss.getRange(chunks[v][0] + 2, colsNum + 2, chunks[v][2], 1).setValues(errors)
        }
      } catch (e) {
        // SpreadsheetApp.getUi().alert(e);

        if (address[11] == false) {
          ss.getRange(chunks[v][0] + 2, colsNum + 1, chunks[v][2] + 2, 1).setValue(parsed["message"])

        } else {

          ss.getRange(chunks[v][0] + 2, colsNum + 2, chunks[v][2] + 2, 1).setValue(parsed["message"])

        }

      }

    } else {
      try {
        if (address[11] == false) {
          ss.getRange(chunks[v][0] + 2, PlacekeyColumnId + 1, chunks[v][2], 1).setValues(eachRowResponse)
        } else {
          ss.getRange(chunks[v][0] + 2, PlacekeyColumnId + 1, chunks[v][2], 1).setValues(eachRowResponse)
          ss.getRange(chunks[v][0] + 2, PlacekeyColumnId + 2, chunks[v][2], 1).setValues(errors)
        }
      } catch (e) {
        //  totalPlaceKeys = 0;
        if (address[11] == false) {
          ss.getRange(chunks[v][0] + 2, PlacekeyColumnId + 1, chunks[v][2], 1).setValue(parsed["message"])

        } else {
          ss.getRange(chunks[v][0] + 2, PlacekeyColumnId + 2, chunks[v][2], 1).setValue(parsed["message"])


        }
      }
    }

  }


  if (PlacekeyColumnId == 0 || address[10] == false) {
    ss.getRange(1, colsNum + 1).setValue('Placekey')
  }

  return totalPlaceKeys
}

// Reset user Propertise, For test

function reset() {
  var userPr = PropertiesService.getUserProperties();
  userPr.deleteAllProperties();
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
  ss.appendRow(['Name', 'Street Address', 'City', 'State', 'Zip code', 'Latitude', 'Longitude'])
  ss.setFrozenRows(1)
  ss.appendRow(['Twin Peaks Petroleum', '598 Portola Dr', 'San Francisco', 'CA', '94131', '37.7371', '-122.44283'])
  ss.appendRow(['', '', '', '', '', '37.7371', '-122.44283'])
  ss.appendRow(['Beretta', '1199 Valencia St', 'San Francisco', 'CA', '94110', '', ''])
  ss.appendRow(['Tasty Hand Pulled Noodle', '1 Doyers St', 'New York', 'ny', '10013', '', ''])
  ss.appendRow(['', '1 Doyers St', 'New York', 'NY', '10013', '', ''])

  // Please fill or remove remainings:

  // ss.appendRow(['Name', 'Street Address', 'City', 'State', 'Zip code', 'Latitude', 'Longitude'])
  // ss.appendRow(['Name', 'Street Address', 'City', 'State', 'Zip code', 'Latitude', 'Longitude'])
  // ss.appendRow(['Name', 'Street Address', 'City', 'State', 'Zip code', 'Latitude', 'Longitude'])
  // ss.appendRow(['Name', 'Street Address', 'City', 'State', 'Zip code', 'Latitude', 'Longitude'])

  PlaceKey()

}

// Alerts

function Alert(message) {
  SpreadsheetApp.getUi().alert(message);
}

// Template Functions
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
    .getContent();
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
    return [sheetName, sheetNames, cols]
  } catch (e) {
    return [sheetName, sheetNames, false]
  }
 // return [allSheets, sheetName, cols]
}
