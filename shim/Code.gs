// Thin shim — all logic lives in the Placekey library.
// This file is pushed to the bound container script of the template sheet.
// When users copy the template, they get this shim; it calls into the library
// by version, so library pushes propagate to new copies automatically.

function onInstall(e) {
  Placekey.onInstall(e);
}

function onOpen(e) {
  Placekey.onOpen(e);
}

// Menu targets (referenced by string in Placekey.onOpen)
function showPlaceKeyUI() {
  Placekey.showPlaceKeyUI();
}

function showHelp() {
  Placekey.showHelp();
}

// google.script.run targets from HTML sidebars/dialogs
function getApiKey() {
  return Placekey.getApiKey();
}

function setApiKey(key) {
  return Placekey.setApiKey(key);
}

function changeKey() {
  Placekey.changeKey();
}

function getSheets() {
  return Placekey.getSheets();
}

function changeSheet(selectedSheet) {
  return Placekey.changeSheet(selectedSheet);
}

function refreshUpdateSheet() {
  return Placekey.refreshUpdateSheet();
}

function insertSample() {
  return Placekey.insertSample();
}

function testUser() {
  return Placekey.testUser();
}

function generateKeys(config, uniqueKey) {
  return Placekey.generateKeys(config, uniqueKey);
}

function getStatus(key) {
  return Placekey.getStatus(key);
}
