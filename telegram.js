const axios = require('axios');
const config = require('./config');

module.exports = async function sendTelegram(message) {
  const url = `https://api.telegram.org/bot${config.telegram.token}/sendMessage`;
  return axios.post(url, {
    chat_id: config.telegram.chatId,
    text: message
  });
};