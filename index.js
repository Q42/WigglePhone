var b = require('bonescript');

var output = 'P8_12';

console.log('Ready');

b.pinMode(output, b.OUTPUT);

// b.digitalWrite(output, 1);
var previous = false;

setInterval(function(){
	
	b.digitalWrite(output, 1);

	setTimeout(function() {
		console.log(previous ? 1 : 0);
		b.digitalWrite(output, 0);
		
	}, 50)


}, 1000);

console.log('Done');