var http = require('http');
var _ = require('underscore');

var apikey = 'LWY7HSC8T3CHQYU4S';

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

function searchTrack(artist, song, callback, cantFind) {
	getJson('http://developer.echonest.com/api/v4/song/search?api_key=' + apikey + '&format=json&results=1&artist=' + encodeURIComponent(artist) + '&title=' + encodeURIComponent(song) + '&bucket=id:spotify-WW&bucket=tracks&bucket=audio_summary', function(res) {
		try {
			callback(res.response.songs[0].tracks[0].id);
		} catch (e) {
			console.log("can't find track ", res.response, res.response.songs[0].audio_summary);
			cantFind();
		}
	});
}

var cantFindArtistAndSong = []; //zodat we de api limits niet overschrijden.
function analyzeSegments(artist, song, callback) {
	if (cantFindArtistAndSong.indexOf(artist + '---' + song) != -1) {
		console.log("aborting song doesn't exist in echo db ", artist, song);
		return;
	}
	
	function findSegments(trackId) {
		var trackUrl = 'http://developer.echonest.com/api/v4/track/profile?api_key=' + apikey + '&format=json&id=' + trackId + '&bucket=audio_summary';
		getJson(trackUrl, function(track) {
			//console.log('found track', track.response.track);
			getJson(track.response.track.audio_summary.analysis_url, function(analysis) {
				
			 	var segments = analysis.segments.map(function(seg) {
					return {
						start: seg.start, 
						duration: seg.duration, 
						pitches: seg.pitches.map(function(pitch, i){ return pitch >= 0.8 ? i : null })
											.filter(function(pitch){ return pitch != null })
					};
				});
			
				callback(segments);
			});
		});
	}

	searchTrack(artist, song, function(trackId) {
		findSegments(trackId, callback);
	}, function() {
		cantFindArtistAndSong.push(artist + '---' + song);
	});
}

module.exports = analyzeSegments;


