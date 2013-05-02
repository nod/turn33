var Bot = require('ttapi');
var cfg = require('./config');

var bot = new Bot(cfg.Auth, cfg.UserId, cfg.RoomId);
var amDj = false;

bot.on('speak', function (data) {

  if (data.text.match(/^\/bop$/)) {
    bot.vote('up');
  }

  if (data.text.match(/^\/dj$/)) {
    if (! amDj) { console.log('adding as dj'); bot.addDj();}
    else { console.log('removing dj'); bot.remDj(); }
    amDj = !amDj;
    bot.speak('ok.  dj=' + amDj);
  }

  if (data.text.match(/^\/skip$/)) {
    bot.skip();
    bot.speak('skipping song. As if I care...');
  }

  if (data.text.match(/^\/help$/)) {
    bot.speak('help (this), dj (turn dj for bot on or off), bop (vote up), skip (skip own song if djing)');
  }
});


bot.on('newsong', function (data) {
  if (data.room.metadata.current_dj != bot.userId) {
    if (Math.random() > .3) {
      var sleep_time = Math.random() * 30000;
      console.log('sleeping ' + sleep_time + 'ms then voting up');
      setTimeout(
        function() {
          bot.bop();
          bot.speak('I like this song too!');
        },
        sleep_time
      );
    } else {
      bot.speak('Not a fan.');
    }
  }
});


bot.on('registered', function (data) {
  var name = data.user[0].name;
  var command = data.command;
  bot.becomeFan(data.user[0].userid);
});


