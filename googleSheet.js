const { google } = require('googleapis');
const config = require('./config');

let sheets;

async function initSheet() {
  const auth = new google.auth.GoogleAuth({
    keyFile: config.google.credentialsPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const client = await auth.getClient();
  sheets = google.sheets({ version: 'v4', auth: client });

  return sheets.spreadsheets.values;
}

async function appendRow(sheet, row) {
  return sheet.append({
    spreadsheetId: config.google.sheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [row] }
  });
}

module.exports = { initSheet, appendRow };