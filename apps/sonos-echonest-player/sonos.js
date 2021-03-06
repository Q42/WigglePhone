var http = require('http');
var q = require('q');
var sonos = require('./sonos_additions.js').sonos;
var _ = require('underscore');
var xml2js = require('xml2js');
var readline = require('readline');

// Group keuken: RINCON_000E58C0C59A01400:2 / 10.42.13.74

// var device = new sonos.Sonos('10.42.35.22');
// device.currentTrackWithPlaylistData().then(function(track){
// 	console.log(track);
// 	console.log(track.artist + ' - ' + track.title, track.position);
// });

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pollCurrentTrackAndPlayTime(callback){
	var getGroupsPromise = getFirstDevice().then(getSonosGroups);
	var selectedGroupPromise = getGroupsPromise.then(selectGroup);
	selectedGroupPromise.then(function(device){

		function loop() {
			device.currentTrackWithPlaylistData().then(function(track){
				console.log('sonos', track.position);
				callback(track.artist, track.title, track.position, +new Date);
			});

			setTimeout(loop, 500);
		}
		loop();

	});
}

module.exports = pollCurrentTrackAndPlayTime;

function selectGroup(groups){
	var deferred = q.defer();
	if(groups.length == 1)
		deferred.resolve(new sonos.Sonos(groups[0].host));
	else {
		_.each(groups, function(group, i){
			console.log(i + '. ' + group.devices.join(", "));
		});		

		function askSelectGroup(){
			rl.question("\nSelect a group: ", function(answer){
				var index = parseInt(answer);
				if(index >= 0 && index < groups.length){
					// console.log(groups[index].host);
					deferred.resolve(new sonos.Sonos(groups[index].host));
				} else {
					console.log("Invalid input");
					askSelectGroup();
				}
			});
		}
		askSelectGroup();
	}
	return deferred.promise;
}


function getSonosGroups(dev){
	var deferred = q.defer();
	var options = {
		host: dev.host,
		path: "/status/topology",
		port: dev.port,
		methode: "GET"
	};
	http.get(options, function(res) {
	  var body = '';

	  res.on('data', function(chunk) {
	      body += chunk;
	  });
	  res.on('end', function() {
			var groups = new Array();

	  	new xml2js.Parser().parseString(body, function(err, xml) {
	    	_.each(xml["ZPSupportInfo"]["ZonePlayers"][0].ZonePlayer, function(item, index) {
    			var url = item["$"].coordinator ? item["$"].location.replace("/xml/device_description.xml", "").replace("http://", "") : "";
    			var host = url != "" ? url.split(":")[0] : "";
    			var port = url != "" ? url.split(":")[1] : "";

    			function getGroup(id){
    				return _.find(groups, function(group){ return id == group.id; })
    			}

    			if(!getGroup(item["$"].group)) {
	    			groups.push({ id: item["$"].group, devices: [item._], host: host, port: port });
    			}
	    		else {
	    			getGroup(item["$"].group).devices.push(item._);
	    		}
	    	});
	    });
	    groups = _.sortBy(groups, function(group) {
	    	return group.id;
	    })
	    deferred.resolve(groups);
	  });	
	})
	return deferred.promise;
}


function getFirstDevice(){
	var deferred = q.defer();
	sonos.search(function(dev){
		deferred.resolve(dev);

	})
	return deferred.promise;
}