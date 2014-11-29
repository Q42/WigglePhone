var http = require('http');
var io = require('socket.io-client');
var _ = require('underscore');

var wigglephoneServer = 'http://10.42.35.16:9001';

var apikey = 'LWY7HSC8T3CHQYU4S';

var dateStart = +new Date;

function getJson(url, callback) {
	http.get(url, function(res) {
	  var json = '';
	  res.on('data', function (chunk) {
	    json += chunk;
	    try {
	    	var parsedJson = JSON.parse(json);
	    	callback(parsedJson);
	    }
	    catch (e) {
	    }
	    
	  });
	}).on('error', function(e) {
	  console.log("Got error: " + e.message);
	});	
}

var socket;
function conncectSocket(callback) {
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

function searchTrack(artist, track, callback) {
	getJson('http://developer.echonest.com/api/v4/song/search?api_key=' + apikey + '&format=json&results=1&artist=' + encodeURIComponent(artist) + '&title=' + encodeURIComponent(track) + '&bucket=id:spotify-WW&bucket=tracks&bucket=audio_summary', function(res) {
		try {
			callback(res.response.songs[0].tracks[0].id);
		} catch (e) {
			console.log("can't find track ", res.response, res.response.songs[0].audio_summary);
		}
	});
}

console.log('search artist and song', process.argv[2], process.argv[3], process.argv[4]);
searchTrack(process.argv[2], process.argv[3], function(trackId) {
	
	conncectSocket(function() {
		playSong(trackId, process.argv[4]);
	});
});


function playSong(trackId, startAt) {
	console.log("playing track " + trackId  + " on starting pos " + (startAt || 0))
	var trackUrl = 'http://developer.echonest.com/api/v4/track/profile?api_key=' + apikey + '&format=json&id=' + trackId + '&bucket=audio_summary';
	getJson(trackUrl, function(track) {
		console.log('found track', track.response.track);
		getJson(track.response.track.audio_summary.analysis_url, function(analysis) {
			console.log('Found analysis');
			// console.log(analysis.track);
			
		 	var segments = analysis.segments.map(function(seg) {
				return {
					start: seg.start, 
					duration: seg.duration, 
					pitches: seg.pitches.map(function(pitch, i){ return pitch >= 0.5 ? i : null })
										.filter(function(pitch){ return pitch != null })
				};
			});
		
			function play(segmentIndex) {
				var segment = segments[segmentIndex];
				console.log('playing', segment.start);
				segment.pitches
					.map(function(pitch) { console.log(pitch); return '/xylofoon/' + pitchMap[pitch]; })
					.forEach(function(url) { socket.emit('url', url); });

				if (segmentIndex < segments.length) {
					setTimeout(function() { play(segmentIndex + 1); }, segment.duration * 1000);
				} else {
					console.log("track afgelopen");
				}
				
			}

			if (startAt) {
				var deltaTime = (+new Date - dateStart) / 1000;
				startAt =  parseInt(startAt) + deltaTime;

				var mappedSegments = _.map(segments, function(it, i){
					return {i: i, start: it.start};
				});

				var firstSegment = _.find(mappedSegments, function(seg) { 
					return seg.start >= startAt; 
				});

				var deltaPlayingTime = firstSegment.start - startAt;
				setTimeout(function(){
					play(firstSegment.i);
				}, deltaPlayingTime * 1000)

				console.log('firstSegment', firstSegment,  'startAt', startAt);
			} else {
				play(0);
			}
		});
	});
}