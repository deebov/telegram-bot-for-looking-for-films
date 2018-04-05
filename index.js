const TelegaBot = require('node-telegram-bot-api'),
  helpers = require('./helpers');
  TOKEN = '461731945:AAGTwT73_mwd1Pdc8nH_3ApTzv79nrhwyAY';

const bot = new TelegaBot(TOKEN, {
  polling: true,
  interval: 300,
  autoStart: true,
  params: {
    timeout: 10
  }
});

bot.on('message', msg => {
  if(msg.text.toLowerCase() === 'hi'){
    bot.sendMessage(msg.chat.id, `Hi ${msg.from.first_name} ! Sosi xuy!`);
  } else {
    bot.sendMessage(msg.chat.id, helpers(msg));
  }
});
