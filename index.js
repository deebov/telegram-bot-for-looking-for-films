const TelegaBot = require('node-telegram-bot-api'),
  mongoose = require('mongoose'),
  database = require('./database.json'),
  helper = require('./helper'),
  config = require('./config'),
  keyboard = require('./keyboard'),
  kb = require('./keyboard-buttons');


mongoose.Promise = global.Promise;
mongoose.connect(config.DB_URL, {
  useMongoClient: true
})
  .then(() => console.log('MongoDB has been connected'))
  .catch(err => console.log(err));
require('./models/film.model');
const Film = mongoose.model('films');
database.films.forEach(f => new Film(f).save());

const bot = new TelegaBot( config.TOKEN, {
  polling: true
});

bot.on( 'message', msg => {

  const chatId = msg.chat.id;

  switch ( msg.text ) {
    case kb.home.films:
      bot.sendMessage( chatId, 'Выберите жанр:', {
        reply_markup: { keyboard: keyboard.films }
      })
      break;
    case kb.home.favourite:
      break;
    case kb.home.cinemas:
      break;
    case kb.back:
      bot.sendMessage( chatId, 'Назад', {
        reply_markup: { keyboard: keyboard.home }
      })
      break;
  }
});

bot.onText( /\/start/, msg => {
  const text = `Здравствуйте, ${msg.from.first_name}`;
  bot.sendMessage( msg.chat.id, text, {
    reply_markup:{
      keyboard: keyboard.home
    }
  })
})
