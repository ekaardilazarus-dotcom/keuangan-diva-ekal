// Google Apps Script untuk FinTrack
// Deploy sebagai Web App dengan akses: Anyone, even anonymous

var SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE'; // Ganti dengan ID spreadsheet Anda
var SHEET_NAMES = {
  transactions: 'Transactions',
  savingTargets: 'SavingTargets',
  reminders: 'Reminders',
  syncLog: 'SyncLog'
};

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var action = e.parameter.action;
  
  try {
    switch(action) {
      case 'test':
        return createResponse({success: true, message: 'FinTrack API is working!'});
        
      case 'saveData':
        return handleSaveData(e);
        
      case 'loadData':
        return handleLoadData();
        
      default:
        return createResponse({success: false, error: 'Invalid action'}, 400);
    }
  } catch (error) {
    return createResponse({success: false, error: error.toString()}, 500);
  }
}

function handleSaveData(e) {
  var data = JSON.parse(e.postData.contents);
  
  // Validasi API key jika ada
  var apiKey = e.parameter.apiKey;
  if (apiKey && apiKey !== 'YOUR_API_KEY') {
    return createResponse({success: false, error: 'Invalid API key'}, 401);
  }
  
  // Simpan data ke spreadsheet
  saveToSheet(SHEET_NAMES.transactions, data.transactions || []);
  saveToSheet(SHEET_NAMES.savingTargets, data.savingTargets || []);
  saveToSheet(SHEET_NAMES.reminders, data.reminders || []);
  
  // Log sinkronisasi
  logSync(data.timestamp, 'save', data.transactions?.length || 0);
  
  return createResponse({
    success: true,
    message: 'Data saved successfully',
    count: {
      transactions: data.transactions?.length || 0,
      savingTargets: data.savingTargets?.length || 0,
      reminders: data.reminders?.length || 0
    }
  });
}

function handleLoadData() {
  // Baca data dari spreadsheet
  var transactions = loadFromSheet(SHEET_NAMES.transactions);
  var savingTargets = loadFromSheet(SHEET_NAMES.savingTargets);
  var reminders = loadFromSheet(SHEET_NAMES.reminders);
  
  // Log sinkronisasi
  logSync(new Date().toISOString(), 'load', transactions.length);
  
  return createResponse({
    success: true,
    data: {
      transactions: transactions,
      savingTargets: savingTargets,
      reminders: reminders
    }
  });
}

function saveToSheet(sheetName, data) {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
  
  // Clear existing data
  sheet.clear();
  
  if (data.length === 0) return;
  
  // Create headers from object keys
  var headers = Object.keys(data[0]);
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // Add data rows
  var rows = data.map(function(item) {
    return headers.map(function(header) {
      return item[header] !== undefined ? item[header] : '';
    });
  });
  
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function loadFromSheet(sheetName) {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  var headers = data[0];
  var result = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var item = {};
    
    for (var j = 0; j < headers.length; j++) {
      var value = row[j];
      
      // Convert string numbers back to numbers
      if (!isNaN(value) && value.toString().trim() !== '') {
        value = Number(value);
      }
      
      // Convert string booleans
      if (value === 'true') value = true;
      if (value === 'false') value = false;
      
      // Convert string null/undefined
      if (value === 'null') value = null;
      if (value === 'undefined') value = undefined;
      
      item[headers[j]] = value;
    }
    
    result.push(item);
  }
  
  return result;
}

function logSync(timestamp, action, recordCount) {
  var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = spreadsheet.getSheetByName(SHEET_NAMES.syncLog) || spreadsheet.insertSheet(SHEET_NAMES.syncLog);
  
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 4).setValues([['Timestamp', 'Action', 'Record Count', 'IP Address']]);
  }
  
  var ip = ''; // Note: Apps Script doesn't easily get IP in Web Apps
  sheet.appendRow([timestamp, action, recordCount, ip]);
}

function createResponse(data, statusCode) {
  var output = JSON.stringify(data);
  return ContentService
    .createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON)
    .setStatusCode(statusCode || 200);
}

// Fungsi untuk setup spreadsheet awal
function setupSpreadsheet() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  SPREADSHEET_ID = spreadsheet.getId();
  
  // Buat sheet jika belum ada
  Object.values(SHEET_NAMES).forEach(function(sheetName) {
    if (!spreadsheet.getSheetByName(sheetName)) {
      spreadsheet.insertSheet(sheetName);
    }
  });
  
  Logger.log('Spreadsheet setup complete. ID: ' + SPREADSHEET_ID);
}
