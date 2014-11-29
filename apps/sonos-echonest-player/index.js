var io = require('socket.io-client');
var _ = require('underscore');

var wigglephoneServer = 'http://10.42.35.16:9001';

var pollCurrentTrackAndPlayTime = require('./sonos.js');
var analyzeSegments = require('./echonest.js');

var socket;
function connectSocket(callback) {
	socket = io(wigglephoneServer);
	socket.on('connect', function() {
		console.log("socket connected");
		callback();
	});
}
var pitchMap = [
	'7', // C
	'8', // C#
	'9', // D
	'10',// D#
	'11',// E
	'0', // F
	'1', // F#
	'2', // G
	'3', // G#
	'4', // A
	'5', // A#
	'6'  // B
];


var currentArtist, 
	currentSong, 
	currentTime;

function calculateStartPosition(sonosTime, measuredOn) {
	var deltaTime = (+new Date - measuredOn) / 1000;
	return parseInt(sonosTime) + deltaTime;
}

var playToh, currentSegment;
function play(segments, sonosTime, measuredOn) {
	function playByIndex(segmentIndex) {
		var segment = currentSegment = segments[segmentIndex];
		if (!segment) return;
		console.log('echonest', segment.start);
		segment.pitches
			.map(function(pitch) { return '/xylofoon/' + pitchMap[pitch]; })
			.forEach(function(url) { socket.emit('url', url); });

		if (segmentIndex < segments.length) {
			playToh = setTimeout(function() { playByIndex(segmentIndex + 1); }, segment.duration * 1000);
		} else {
			console.log("track afgelopen");
		}
	}	

	var startAt = calculateStartPosition(sonosTime, measuredOn);

	var mappedSegments = _.map(segments, function(it, i){
		return { i: i, start: it.start };
	});

	var firstSegment = _.find(mappedSegments, function(seg) { 
		return seg.start >= startAt; 
	});

	if (!currentSegment || 
		(parseInt(firstSegment.start) - startAt > 1) ||
		(startAt - parseInt(firstSegment.start) > 1)) {

		var deltaPlayingTime = firstSegment.start - startAt;
		console.log("afwijking te groot: ", firstSegment.start, startAt);
		clearTimeout(playToh);
		playToh = setTimeout(function(){
			playByIndex(firstSegment.i);
		}, deltaPlayingTime * 1000);
	}
}

var currentSegments;
function findSegments(artist, song, callback) {
	if (artist == currentArtist && song == currentSong) {
		callback(currentSegments);
	}
	else {
		analyzeSegments(artist, song, function(segments) {
			currentArtist = artist;
			currentSong = song;
			currentSegments = segments;
			callback(currentSegments);
		});
	}
}


connectSocket(function() {
	pollCurrentTrackAndPlayTime(function(artist, song, sonosTime, measuredOn) {
		findSegments(artist, song, function(segments) {
			play(segments, sonosTime, measuredOn);
		});
	});
});












