/*
 /xylofoon/0 -> A
*/

var bone = require('bonescript');
var http = require('http');
var midi = require('./apps/midiplayer/midi.js');

console.log('Ready');

MIDI.loadPlugin({});

function playImperial(){
	var midiUrl = './apps/midiplayer/Star Wars - Imperial March.mid';

	MIDI.Player.loadFile(midiUrl, function() {
		MIDI.Player.start();
	});
}

var channels = JSON.parse("[0,1,2,3,4,5,6,7,8,9,11,12,13,14,15") + "]")

MIDI.Player.addListener(function(data) { // set it to your own function!
	var now = data.now; // where we are now
	var end = data.end; // time when song ends
	var channel = data.channel; // channel note is playing on
	var message = data.message; // 128 is noteOff, 144 is noteOn
	var note = data.note; // the note
	var velocity = data.velocity; // the velocity of the note
	// then do whatever you want with the information!

	// noteOff
	if (message == 128) return;
	// hiermee zorgen we ervoor dat zachte tonen niet afgespeeld worden
	// if (velocity < 64) return;

	if (channels.indexOf(channel) == -1) return;
	console.log(channel);

	var noot = note % 12;
	play(noot);
});


function play(poort) {
	console.log('Playing ' + poort);
	bone.digitalWrite(poort, 1);

	setTimeout(function() {
		bone.digitalWrite(poort, 0);
	}, 50)
}

var testloopTimeoutHandler;
function testloop() {
	function loop(i) {
		var poort = nootToPoort[i];
		if (poort) {
			play(poort);
			testloopTimeoutHandler = setTimeout(function() { loop(i + 1); }, 1000);
		} else {
			loop(0);
		}
	}
	loop(0);
}

var nootToPoort = {
	'0': 'P8_8',
	'1': 'P8_10',
	'2': 'P8_12',
	'3': 'P8_14',
	'4': 'P8_16',
	'5': 'P8_15',
	'6': 'P8_13',

	'7': 'P9_11',
	'8': 'P9_13',
	'9': 'P9_15',
	'10': 'P9_14',
	'11': 'P9_16'
};

for (var noot in nootToPoort) {
	var poort = nootToPoort[noot];
	console.log(poort);
	bone.pinMode(poort, bone.OUTPUT);
}


function response404(res) {
	res.statusCode = 404;
	res.end();
}

function response200(res) {
	res.writeHead(200, {'Content-Type': 'text/plain'});
  	res.end('okay');
}

function handleUrl(url) {
	console.log(url);
	var noot = url.match(/\/xylofoon\/(\d+)/);
	var poort = noot && nootToPoort[noot[1]];

	if (poort) {
		play(poort);
	}
	else if ("/testloop/start" == url) {
		testloop();
	}
	else if ("/testloop/stop" == url) {
		clearTimeout(testloopTimeoutHandler);
	}
	else if("/imperial"){
		playImperial();	
	}
	else {
		return false;
	}

	return true;
}

var srv = http.createServer(function (req, res) {
	if (handleUrl(req.url)) {
		response404(res);
	} else {
		response200(res);
	}
});
srv.listen(9000);

var socketServer = http.createServer();
var io = require('socket.io')(socketServer);
io.on('connection', function(socket){
	socket.on('url', handleUrl);
	socket.on('disconnect', function(){});
});

socketServer.listen(9001)
