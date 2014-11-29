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

var channels = JSON.parse("[" + (process.argv[3] || "0,1,2,3,4,5,6,7,8,9,11,12,13,14,15") + "]")

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
	var url = '/xylofoon/' + noot;
	socket.emit('url', url);
});
