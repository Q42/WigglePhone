var http = require('http');
var q = require('q');
var sonos = require('./sonos_additions.js').sonos;
var _ = require('underscore');
var xml2js = require('xml2js');

var deferred = q.defer();

// Group keuken: RINCON_000E58C0C59A01400:2 / 10.42.13.74

var device = new sonos.Sonos('10.42.35.22');
device.currentTrackWithPlaylistData().then(function(track){
	console.log(track);
	console.log(track.artist + ' - ' + track.title, track.position);
});

getFirstDevice().then(function(dev) {
	getSonosGroups(dev).then(function(groups) {
		console.log(groups);
	});
});	


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