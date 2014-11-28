/*
 /xylofoon/0 -> A
*/

var bone = require('bonescript');
var http = require('http');

console.log('Ready');

function play(poort) {
	console.log('Playing ' + poort);
	bone.digitalWrite(poort, 1);

	setTimeout(function() {
		bone.digitalWrite(poort, 0);
	}, 50)
}

var nootToPoort = {
	'0': 'P8_12',
	'1': 0
};

for (var noot in nootToPoort) {
	var poort = nootToPoort[noot];
	b.pinMode(poort, b.OUTPUT);
}


function nootNotRecognized(res) {
	res.statusCode = 404;
	res.end();
}

var srv = http.createServer(function (req, res) {
  
  var noot = req.url.match(/\/xylofoon\/(\d+)/);
	var poort = noot && nootToPoort(noot[1]);

  if (poort) {
  	play(poort);
		res.writeHead(200, {'Content-Type': 'text/plain'});
  	res.end('okay');	
  }
  else {
  	nootNotRecognized(res);
  }

});