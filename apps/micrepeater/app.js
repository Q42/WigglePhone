window.AudioContext = window.AudioContext || window.webkitAudioContext;

var audioContext = null;
var isPlaying = false;
var sourceNode = null;
var analyser = null;
var theBuffer = null;
var DEBUGCANVAS = null;
var mediaStreamSource = null;
var detectorElem,
canvasElem,
waveCanvas,
pitchElem,
noteElem,
detuneElem,
detuneAmount;

window.onload = function() {
  audioContext = new AudioContext();
  MAX_SIZE = Math.max(4,Math.floor(audioContext.sampleRate/5000));	// corresponds to a 5kHz signal

  detectorElem = document.getElementById( "detector" );
  canvasElem = document.getElementById( "output" );
  DEBUGCANVAS = document.getElementById( "waveform" );
  if (DEBUGCANVAS) {
    waveCanvas = DEBUGCANVAS.getContext("2d");
    waveCanvas.strokeStyle = "black";
    waveCanvas.lineWidth = 1;
  }
  pitchElem = document.getElementById( "pitch" );
  noteElem = document.getElementById( "note" );
  detuneElem = document.getElementById( "detune" );
  detuneAmount = document.getElementById( "detune_amt" );
}

function error() {
  alert('Stream generation failed.');
}

function getUserMedia(dictionary, callback) {
  try {
    navigator.getUserMedia =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia;
    navigator.getUserMedia(dictionary, callback, error);
  } catch (e) {
    alert('getUserMedia threw exception :' + e);
  }
}

function gotStream(stream) {
  // Create an AudioNode from the stream.
  mediaStreamSource = audioContext.createMediaStreamSource(stream);

  // Connect it to the destination.
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  mediaStreamSource.connect( analyser );
  updatePitch();
}

function toggleLiveInput() {
  getUserMedia(
    {
      "audio": {
        "mandatory": {
          "googEchoCancellation": "false",
          "googAutoGainControl": "false",
          "googNoiseSuppression": "false",
          "googHighpassFilter": "false"
        },
        "optional": []
      },
    }, gotStream
  );
}

var rafID = null;
var tracks = null;
var buflen = 1024;
var buf = new Float32Array( buflen );

var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function noteFromPitch( frequency ) {
  var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
  return Math.round( noteNum ) + 69;
}

function frequencyFromNoteNumber( note ) {
  return 440 * Math.pow(2,(note-69)/12);
}

function centsOffFromPitch( frequency, note ) {
  return Math.floor( 1200 * Math.log( frequency / frequencyFromNoteNumber( note ))/Math.log(2) );
}

// this is a float version of the algorithm below - but it's not currently used.

function autoCorrelate( buf, sampleRate ) {
  var MIN_SAMPLES = 40;	// corresponds to an 1100Hz signal
  var MAX_SAMPLES = 400; // corresponds to a 110Hz signal
  var SIZE = buf.length;
  var best_offset = -1;
  var best_correlation = 0;
  var rms = 0;

  for (var i=0;i<buf.length;i++)
    rms += buf[i]*buf[i];
  rms = Math.sqrt(rms/buf.length);
  // waveCanvas.strokeStyle = "blue";
  // waveCanvas.beginPath();
  // waveCanvas.moveTo(0,128);

  var prev = 0;
  var find = false;
  for (var offset = 0; offset <= MAX_SAMPLES; offset += 2) {
    var correlation = 0;
    var magnitude = 0;

    var i0 = Math.round(offset / 2);
    for (var i = i0; i < SIZE - i0; i++) {
      var b0 = buf[i - i0];
      var b1 = buf[i + i0];
      correlation += b0 * b1;
      magnitude += b0 * b0 + b1 * b1;
    }
    correlation = 2 * correlation / magnitude;
    if (!find && prev < 0 && correlation > 0 && !best_correlation) {
      find = true;
    }
    if (find && prev > 0 && correlation < 0)
      break;
    if (find && correlation > best_correlation) {
      best_correlation = correlation;
      best_offset = offset;
    }
    prev = correlation;
    // waveCanvas.lineTo(offset-MIN_SAMPLES,128+(correlation*128));
  }
  // waveCanvas.stroke();
  // waveCanvas.strokeStyle = "blue";
  // waveCanvas.beginPath();
  // waveCanvas.moveTo(best_offset - MIN_SAMPLES,0);
  // waveCanvas.lineTo(best_offset - MIN_SAMPLES,256);
  // waveCanvas.stroke();
  if ((best_correlation > 0.9)) {
    // console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")");
    return sampleRate/best_offset;
  }
  return -1;
}

var hist = [];
var lastNote;
var socket;
function updatePitch( time ) {
  var cycles = new Array;
  analyser.getFloatTimeDomainData( buf );
  // TODO: Paint confidence meter on canvasElem here.

  if (DEBUGCANVAS) {  // This draws the current waveform, useful for debugging
    waveCanvas.clearRect(0,0,512,256);
    waveCanvas.strokeStyle = "red";
    waveCanvas.beginPath();
    waveCanvas.moveTo(0,0);
    waveCanvas.lineTo(0,256);
    waveCanvas.moveTo(128,0);
    waveCanvas.lineTo(128,256);
    waveCanvas.moveTo(256,0);
    waveCanvas.lineTo(256,256);
    waveCanvas.moveTo(384,0);
    waveCanvas.lineTo(384,256);
    waveCanvas.moveTo(512,0);
    waveCanvas.lineTo(512,256);
    waveCanvas.stroke();
    waveCanvas.strokeStyle = "black";
    waveCanvas.beginPath();
    waveCanvas.moveTo(0,buf[0]);
    for (var i=1;i<512;i++) {
      waveCanvas.lineTo(i,128+(buf[i]*128));
    }
    waveCanvas.stroke();
  }

  var ac = autoCorrelate( buf, audioContext.sampleRate );
  var val = ac > -1 ? noteFromPitch(ac) % 12 : -1;

  hist.unshift(val);
  var count = 0;
  var SAMPLES = 10;
  for (var i = 0; i < SAMPLES; i++)
    if (hist[i] == val) count++;
  if (count / SAMPLES > .6) {
    if (lastNote != val) {
      console.log(noteStrings[val]||"--");
      if (!socket)
        socket = io("http://10.41.1.70:9001")
      if (val > -1)
        socket.emit('url', '/xylofoon/' + ((val + 7)%12))
      if (val == -1) {
        detectorElem.className = "vague";
        pitchElem.innerText = "--";
        noteElem.innerText = "-";
        detuneElem.className = "";
        detuneAmount.innerText = "--";
      } else {
        detectorElem.className = "confident";
        noteElem.innerHTML = noteStrings[val];
        detuneElem.className = "";
        detuneAmount.innerHTML = "--";
      }
    }
    lastNote = val;
  }

  /*if (!window.requestAnimationFrame)
  window.requestAnimationFrame = window.webkitRequestAnimationFrame;
  rafID = window.requestAnimationFrame( updatePitch );*/
  setTimeout(updatePitch, 0)
}

toggleLiveInput()
