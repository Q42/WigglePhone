var MIDI = require('./midi.js');
var io = require('socket.io-client');

var wigglephoneServer = 'http://10.42.35.16:9001';

console.log("initializing midiplayer.js");

MIDI.loadPlugin({});

var socket;
var midiUrl = process.argv[2] || './jason_derulo-wiggle_feat_snoop_dogg.mid';
console.log(midiUrl);
MIDI.Player.loadFile(midiUrl, function() {
	console.log("connecting socket")
	socket = io(wigglephoneServer);
	socket.on('connect', function() {
		console.log("starting player");
		MIDI.Player.start();
	})
});

MIDI.Player.addListener(function(data) { // set it to your own function!
	var now = data.now; // where we are now
	var end = data.end; // time when song ends
	var channel = data.channel; // channel note is playing on
	var message = data.message; // 128 is noteOff, 144 is noteOn
	var note = data.note; // the note
	var velocity = data.velocity; // the velocity of the note
	// then do whatever you want with the information!

	// ignore drums
	if (channel == 10) return;
	// noteOff
	if (message == 128) return;
	// hiermee zorgen we ervoor dat zachte tonen niet afgespeeld worden
	// if (velocity < 64) return;

	console.log(channel);
	// if ([3, 6].indexOf(channel) == -1) return;



	var noot = note % 12;
	console.log(channel, noot);
	var url = '/xylofoon/' + noot;

	// http.get(wigglephoneServer + url);
	socket.emit('url', url);
	console.log("fired request: " + url, +new Date());
});
