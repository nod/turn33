var Bot = require('ttapi');
var cfg = require('./config');

var bot = new Bot(cfg.Auth, cfg.UserId, cfg.RoomId);
var amDj = false;


var cmd_bop = function(data) {
  bot.vote('up')
};
cmd_bop.help = 'vote for a song and dance';

var cmd_dj = function(data) {
  if (! amDj) {
    bot.addDj();
    bot.speak('dj ON');
  } else {
    bot.remDj();
    bot.speak('dj OFF');
  }
  amDj = !amDj;
}
cmd_dj.help = 'toggle bot dj mode';

var cmd_skip = function(data) {
  bot.skip();
  bot.speak('skipping song. As if I care...');
};
cmd_skip.help = 'skip song if bot is djing'

var cmd_help = function(data) {
  for (var c in cmds) {
    bot.speak(c + ': ' + cmds[c].help);
  }
};
cmd_help.help = 'this cruft';

var cmds = {
  bop: cmd_bop,
  dj: cmd_dj,
  skip: cmd_skip,
  help: cmd_help
}

bot.on('speak', function (data) {
  for (var c in cmds) {
    var re = new RegExp('^\/' + c + '$');
    if (data.text.match(re)) {
      cmds[c](data);
      break;
    }
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


