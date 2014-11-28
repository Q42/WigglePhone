/*
The MIT License (MIT)

Copyright (c) 2014 Chris Wilson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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
  waveCanvas.strokeStyle = "blue";
  waveCanvas.beginPath();
  waveCanvas.moveTo(0,128);

  for (var offset = MIN_SAMPLES; offset <= MAX_SAMPLES; offset += 2) {
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
    var fact = correlation / best_correlation;
    var dist = Math.abs(fact - Math.round(fact));
    if (correlation > 0.95 && correlation > best_correlation && (!best_correlation || dist > 0.05)) {
      best_correlation = correlation;
      best_offset = offset;
    }
    waveCanvas.lineTo(offset-MIN_SAMPLES,128+(correlation*128));
  }
  waveCanvas.stroke();
  waveCanvas.strokeStyle = "blue";
  waveCanvas.beginPath();
  waveCanvas.moveTo(best_offset - MIN_SAMPLES,0);
  waveCanvas.lineTo(best_offset - MIN_SAMPLES,256);
  waveCanvas.stroke();
  if ((best_correlation > 0.9)) {
    console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")");
    return sampleRate/best_offset;
  }
  return -1;
}


var MIN_SAMPLES = 5;  // will be initialized when AudioContext is created.

function autoCorrelateInt( buf, sampleRate ) {
  var SIZE = buf.length;
  var MAX_SAMPLES = Math.floor(SIZE/2);
  var best_offset = -1;
  var best_correlation = 0;
  var rms = 0;
  var foundGoodCorrelation = false;
  var correlations = new Array(MAX_SAMPLES);

  for (var i=0;i<SIZE;i++) {
    var val = buf[i];
    rms += val*val;
  }
  rms = Math.sqrt(rms/SIZE);
  if (rms<0.02) // not enough signal
  return -1;

  var lastCorrelation=1;
  for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
    var correlation = 0;

    for (var i=0; i<MAX_SAMPLES; i++) {
      correlation += Math.abs((buf[i])-(buf[i+offset]));
    }
    correlation = 1 - (correlation/MAX_SAMPLES);
    correlations[offset] = correlation; // store it, for the tweaking we need to do below.
    if ((correlation>0.01) && (correlation > lastCorrelation)) {
      foundGoodCorrelation = true;
      if (correlation > best_correlation) {
        best_correlation = correlation;
        best_offset = offset;
      }
    } /*else if (foundGoodCorrelation) {
      // short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
      // Now we need to tweak the offset - by interpolating between the values to the left and right of the
      // best offset, and shifting it a bit.  This is complex, and HACKY in this code (happy to take PRs!) -
      // we need to do a curve fit on correlations[] around best_offset in order to better determine precise
      // (anti-aliased) offset.

      // we know best_offset >=1,
      // since foundGoodCorrelation cannot go to true until the second pass (offset=1), and
      // we can't drop into this clause until the following pass (else if).
      var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];
      return sampleRate/(best_offset+(8*shift));
    }
    lastCorrelation = correlation;*/
  }
  if (best_correlation > 0.01) {
    // console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
    return sampleRate/best_offset;
  }
  return -1;
  //	var best_frequency = sampleRate/best_offset;
}

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

  if (ac == -1) {
    detectorElem.className = "vague";
    pitchElem.innerText = "--";
    noteElem.innerText = "-";
    detuneElem.className = "";
    detuneAmount.innerText = "--";
  } else {
    detectorElem.className = "confident";
    pitch = ac;
    pitchElem.innerText = Math.round( pitch ) ;
    var note =  noteFromPitch( pitch );
    noteElem.innerHTML = noteStrings[note%12];
    var detune = centsOffFromPitch( pitch, note );
    if (detune == 0 ) {
      detuneElem.className = "";
      detuneAmount.innerHTML = "--";
    } else {
      if (detune < 0)
      detuneElem.className = "flat";
      else
      detuneElem.className = "sharp";
      detuneAmount.innerHTML = Math.abs( detune );
    }
  }

  if (!window.requestAnimationFrame)
  window.requestAnimationFrame = window.webkitRequestAnimationFrame;
  rafID = window.requestAnimationFrame( updatePitch );
}

toggleLiveInput()