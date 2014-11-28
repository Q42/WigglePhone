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
	'0': 'P8_12',
	'1': 'P8_14',
	'2': 'P8_16'
};

for (var noot in nootToPoort) {
	var poort = nootToPoort[noot];
	bone.pinMode(poort, bone.OUTPUT);
}


function nootNotRecognized(res) {
	res.statusCode = 404;
	res.end();
}

var srv = http.createServer(function (req, res) {
  
  var noot = req.url.match(/\/xylofoon\/(\d+)/);
  var poort = noot && nootToPoort[noot[1]];

  if (poort) {
  	play(poort);
		res.writeHead(200, {'Content-Type': 'text/plain'});
  	res.end('okay');	
  }
  else if ("/testloop/start" == req.url) {
  	testloop();
  }
  else if ("/testloop/stop" == req.url) {
  	clearTimeout(testloopTimeoutHandler);
  }
  else {
  	nootNotRecognized(res);
  }

});

srv.listen(9000);
