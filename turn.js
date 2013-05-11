
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/turnbot');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () { });

// ---------------
// models
// ---------------

var SongSchema = new mongoose.Schema({
  title: String,
  turn_id: String,
  artist: String,
  album: String,
  voter_hist: { },
  genre: String,
});

SongSchema.statics.from_api = function(data, cb) {
  // first, look for the existence of the song
  Song.findOne( {turn_id: data._id }, function(err, song) {
    if (!song) {
      // better be error, we don't want anything
      var s = new Song();
      console.log(data.metadata);
      s.title = data.metadata.song;
      s.artist = data.metadata.artist;
      s.album = data.metadata.album;
      s.turn_id = data._id;
      s.voter_hist = { };
      s.genre = data.metadata.genre;
      return s.save(cb);
    } else {
      return cb(false, song);
    }
  });
};

SongSchema.methods.vote = function(data) {
  // race condition here!
  for (var i in data) {
    var v = data[i];
    if (!v[0] || bot.userId == v[0])
      continue; // sometimes, they goof and send empty data and no bot votes
    var val = current_song.voter_hist[v[0]];
    if (! val) val = 0; // ensure int
    var adjust = 1;
    if (v[1] === 'down') {
      adjust = -1;
    }
    current_song.voter_hist[v[0]] = val + adjust;
    current_song.markModified('voter_hist');
  }
  current_song.save();
}

var Song = mongoose.model('Song', SongSchema);

var DJSchema = new mongoose.Schema({
  name: String,
  turn_id: String
});

DJSchema.statics.from_api = function(data, cb) {
  DJ.findOne( {turn_id: data._id }, function(err, dj) {
    if (!dj) {
      var dj = new DJ();
      var altered = true;
    } else altered = false;
    // sure ther'es some introspective way to do this better...
    if (dj.name !== data.metadata.name) {
      dj.name = data.metadata.name;
      altered = true; }
    if (dj.turn_id !== data._id) {
      dj.turn_id = data._id;
      altered = true;
    }
    if (altered) dj.save(cb);
    else cb(false, dj);
  });
};

var DJ = mongoose.model('DJ', DJSchema);

// --------------------
// end models
// --------------------

var Bot = require('ttapi');
var cfg = require('./config');

var bot = new Bot(cfg.Auth, cfg.UserId, cfg.RoomId);
var amDj = false;
var skip_mine_if_djing = true;

var current_song = null;

// --------------------
// commands
// --------------------

var cmd_bop = function(data) {
  bot.vote('up')
};
cmd_bop.help = 'vote for a song and dance';

var cmd_boo = function(data) {
  bot.vote('down')
};
cmd_boo.help = 'downvote the song';

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

var cmd_autoskip = function(data) {
  skip_mine_if_djing = !skip_mine_if_djing;
  bot.speak('autoskip now set to  ' + skip_mine_if_djing);
}
cmd_autoskip.help = 'toggle bot autoskipping his songs if djing';

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
  autoskip: cmd_autoskip,
  bop: cmd_bop,
  boo: cmd_boo,
  dj: cmd_dj,
  skip: cmd_skip,
  help: cmd_help
}

// -------------------
// events
// -------------------

bot.on('speak', function (data) {
  for (var c in cmds) {
    var re = new RegExp('^[/.]' + c + '$');
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
  } else {
    if (skip_mine_if_djing) bot.skip();
  }
});


bot.on('registered', function (data) {
  var name = data.user[0].name;
  var command = data.command;
  bot.becomeFan(data.user[0].userid);
});

var set_current_song = function(err, song) {
  if (!err) current_song = song;
}

bot.on('newsong', function(data) {
  console.log('newsong: ', data);
  Song.from_api(data.room.metadata.current_song, set_current_song);
});

bot.on('update_votes', function (data) {
  if (current_song) {
    // we have a window when joining of not knowing the current song...
    console.log(
      'Someone has voted on',  current_song.title, ' by ', current_song.artist
    );
    console.log('current_song: ', current_song);
    current_song.vote(data.room.metadata.votelog);
  }
});

