/**
This is telegram bot for looking for films
Author: Dilshod Turobov
Contact: deebov@yandex.com
10.04.2018
**/
const TelegaBot = require('node-telegram-bot-api'),
  mongoose = require('mongoose'),
  geolib = require('geolib'),
  _ = require('lodash'),
  database = require('./database.json'),
  config = require('./config'),
  keyboard = require('./keyboard'),
  kb = require('./keyboard-buttons');

// Connecting database
mongoose.
  connect(config.DB_URL).
  then(() => console.log('MongoDB has been connected')).
  catch(err => console.log(err));

// Connecting models
require('./models/film.model');
require('./models/cinema.model');
require('./models/user.model');

const Film = mongoose.model('films');
const Cinema = mongoose.model('cinemas');
const User = mongoose.model('users');

// Setting action types
const ACTION_TYPE = {
  TOGGLE_FAV_FILM: 'tff',
  SHOW_CINEMAS: 'shc',
  SHOW_CINEMAS_ON_MAP: 'shconm',
  SHOW_FILMS: 'shf'
}

// Setting data
// database.films.forEach(f => new Film(f).save());
// database.cinemas.forEach(c => new Cinema(c).save());


const bot = new TelegaBot(
  config.TOKEN,
{
  polling: true
});

bot.on( 'message', msg =>
{
  // Chat Identifier
  const chatId = msg.chat.id;
  // User Identifier
  const userId = msg.from.id

  switch ( msg.text ) {
    case kb.home.films:
      bot.sendMessage(
        chatId,
        'Выберите жанр:',
      {
        reply_markup: { keyboard: keyboard.films }
      })
      break;
    case kb.home.favourite:
      showFavFilms( chatId, userId )
      break;
    case kb.home.cinemas:
      bot.sendMessage(
        chatId,
        'Отправить местоположение',
      {
        reply_markup: {
          keyboard: keyboard.cinemas
        }
      })
      break;
    case kb.films.action:
      sendFilmByQuery(chatId,{type: 'action'});
      break;
    case kb.films.comedy:
      sendFilmByQuery(chatId,{type: 'comedy'});
      break;
    case kb.films.random:
      sendFilmByQuery(chatId,{});
      break;
    case kb.back:
      bot.sendMessage( chatId, 'Назад', {
        reply_markup: { keyboard: keyboard.home }
      })
      break;
  }
  if (msg.location) {
    getDistance( chatId, msg.location );
  }
});




// On start
bot.onText( /\/start/, msg =>
{
  // Chat Identifier
  const chatId = msg.chat.id;
  // Outgoing message text
  const text = `Здравствуйте, ${msg.from.first_name}`;

  bot.sendMessage(
    chatId,
    text,
  {
    reply_markup:{
      keyboard: keyboard.home
    }
  })
})

// On incoming film UUID
bot.onText(/\/f(.+)/, ( msg, match ) =>
{

  // Chat Identifier
  const chatId = msg.chat.id;
  // Film UUID
  const filmUUID = match[1];

  Promise.all([
    Film.findOne({uuid: filmUUID}),
    User.findOne({telegramId: msg.from.id})
  ]).
    then(([film, user]) => {

    let isFav = false;

    if(user) {
      isFav = user.films.indexOf(film.uuid) !== -1
    }
    // Inline keyboard text
    const favText = isFav ? 'Удалить из избранного' : 'Добавить в избранное';
    // Film Info
    const caption = `<b>Название:</b> ${film.name}\n<b>Год:</b> ${film.year}\n<b>Рейтинг:</b> ${film.rate}\n<b>Время:</b> ${film.length}\n<b>Страна:</b> ${film.country}`;

    // Message options
    const option = {
      parse_mode: 'HTML',
      caption,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: favText,
              callback_data: JSON.stringify({
                type: ACTION_TYPE.TOGGLE_FAV_FILM,
                filmUUID: film.uuid,
                isFav: isFav
              })
            },
            {
              text: 'Показать кинотеатры',
              callback_data: JSON.stringify({
                type: ACTION_TYPE.SHOW_CINEMAS,
                cinemasUUID: film.cinemas
              })
            }
          ],
          [
            {
              text: `Кинопоиск ${film.name}`,
              url: film.link
            }
          ]
        ]
      }
    }
    bot.sendPhoto(chatId, film.picture, option);
  })
  Film.findOne({uuid: filmUUID}).
    then(film => {}).
    catch(err => {
      console.log(err);
    })
})

// On incoming cinema UUID
bot.onText(/\/c(.+)/, ( msg, match ) =>
{
  // Chat Idenfier
  const chatId = msg.chat.id;
  // Cinema UUID
  const cinemaUUID = match[1];

  Cinema.
    findOne({uuid: cinemaUUID}).
    then(cinema => {
      // Cinema Info
      const html = `Кинотеатр <b>${cinema.name}</b>`;
      // Message options
      const option = {
        parse_mode: 'HTMl',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: 'Перейти на сайт кинотеатра',
                url: cinema.url
              },
              {
                text: 'Показать на карте',
                callback_data: JSON.stringify({
                  type: ACTION_TYPE.SHOW_CINEMAS_ON_MAP,
                  latitude: cinema.location.latitude,
                  longitude: cinema.location.longitude
                })
              }
            ],
            [
              {
                text: 'Показать фильмы',
                callback_data: JSON.stringify({
                  type: ACTION_TYPE.SHOW_FILMS,
                  filmsUUID: cinema.films
                })
              }
            ]
          ]
        }
      }
      bot.sendMessage( chatId, html, option )
    }).
    catch(err => {
      console.log(err);
    })

})

// On inline calling bot
bot.on('inline_query', query => {

  Film.
    find({}).
    then(films => {
      const result = films.map(f => {
        // Inline message content
        const caption = `<b>Название:</b> ${f.name}\n<b>Год:</b> ${f.year}\n<b>Рейтинг:</b> ${f.rate}\n<b>Время:</b> ${f.length}\n<b>Страна:</b> ${f.country}`;

        return {
          id: f.uuid,
          type: 'photo',
          photo_url: f.picture,
          thumb_url: f.picture,
          caption,
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: `Кинопоиск: ${f.name}`,
                  url: f.link
                }
              ]
            ]
          }
        }
      })
      bot.answerInlineQuery(query.id, result, {
        cache_time: 0
      });
    })

})

// On callback data
bot.on('callback_query', query => {

  // User Identifier
  const userId = query.from.id
  let data = null;
  try {
    data = JSON.parse(query.data);
  } catch (e) {
    throw new Error('Query is not an object');
  }

  const { type } = data;

  switch ( type ) {
    case ACTION_TYPE.TOGGLE_FAV_FILM:
      toggleFavFilm(userId, query.id, data)
      break;
    case ACTION_TYPE.SHOW_FILMS:
      sendFilmByQuery(userId, {uuid: {'$in': data.filmsUUID}});
      break;
    case ACTION_TYPE.SHOW_CINEMAS:
      showCinemas(userId, {uuid: {'$in': data.cinemasUUID}});
      break;
    case ACTION_TYPE.SHOW_CINEMAS_ON_MAP:
      const { latitude, longitude } = data;
      bot.sendLocation(userId, latitude, longitude);
      break;
  }
})

function sendFilmByQuery(chatId,query)
{
  Film.
  find(query).
  then(films => {

    // Films list
    const html = films.map((film,i) => {
      return `<b>${i + 1}</b> ${film.name} - /f${film.uuid}`;
    }).
    join('\n');

    sendHtml(chatId,html,'films');

  }).
  catch(err => {
    console.log(err);
  })
}

function sendHtml(chatId,html,kbname)
{
  // Message options
  const options = {
    parse_mode: 'HTML'
  };
  if(kbname){
    options['reply_markup'] = {
      keyboard: keyboard[kbname]
    }
  }
  bot.sendMessage(chatId,html,options);
}

function getDistance( chatId, location )
{

  Cinema.
  find({}).
    then(cinemas => {

      cinemas.forEach(c => {
        c.distance = geolib.getDistance( location, c.location );
      });

      cinemas = _.sortBy( cinemas, 'distance' );
      // Cinemas list
      const html = cinemas.map(( c, i ) =>
        `<b>${ i + 1 }</b> ${c.name}. <em>Расстояние: </em><strong>${c.distance / 1000}</strong> км. /c${c.uuid}`
      ).
      join('\n');

      sendHtml( chatId, html, 'home');
    })

}

function toggleFavFilm(userId, queryId, {filmUUID, isFav})
{

  // Alert textx
  const answerText = isFav ? 'Удалено из избранного' : 'Добавлено в избранное';
  let userPromise;
  User.findOne({telegramId: userId}).
    then(user => {
      if(user) {
        if(isFav) {
          user.films = user.films.filter(fUUID => fUUID !== filmUUID);
        }
        else {
          user.films.push(filmUUID);
        }
        userPromise = user;
      }
      else {
        userPromise = new User({
          telegramId: userId,
          films: [filmUUID]
        })
      }

      userPromise.
        save().
        then( _ => {
          bot.answerCallbackQuery({
            callback_query_id: queryId,
            text: answerText
          })
        })
    })

}

function showFavFilms( chatId,userId ) {
  User.findOne({telegramId: userId}).
    then(user => {
      if(user) {
        Film.find({uuid: {'$in': user.films}}).
          then(films => {
            let html;

            if (films.length) {
              html = films.map((f,i) => {
                return `<b>${i + 1}</b>. ${f.name}. /f${f.uuid}`
              }).
              join('\n');
            } else {
              html = 'Вы пока ничего не добавили';
            }
            sendHtml(chatId, html, 'home');
          })
      }
      else {
        sendHtml(chatId, 'Вы пока ничего не добавили');
      }

    })

}

function showCinemas(userId, query) {

  Cinema.
    find(query).
    then(cinemas => {

      // Cinemas list
      const html = cinemas.map((c, i) => {
        return `<b>${i + 1}.</b> ${c.name}. /c${c.uuid}`;
      }).
      join('\n');

      sendHtml(userId, html, 'home');
    })

}
