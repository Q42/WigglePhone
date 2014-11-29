Vue.filter('limit', function (value, limit) {
  if(isNaN(limit)) {
    limit = this[limit];
  }

  return value.slice(0, limit);
});

var notes = ['F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E'];

var sequencer = new Vue({
  el: 'body',
  data: {
    notes: Array.apply(null, new Array(notes.length)).map(function(val, i) {
      return {
        name: notes[i],
        steps: Array.apply(null, new Array(64)).map(function() { return {checked: false}; })
      };
    }),
    steps: 16,
    stepsMin: 4,
    stepsMax: 64,
    stepsStep: 4,
    bpm: 120,
    bpmMin: 1,
    bpmMax: 999,
    currentStep: 0,
    url: 'http://10.42.35.16:9001',
    socket: null,
    myoSocket: null,
    myoID: null,
    interval: null
  },
  watch: {
    bpm: function() {
      this.bpm = Math.min(Math.max(this.bpm, this.bpmMin), this.bpmMax);

      if(this.interval) {
        this.stop();
        this.start();
      }
    },
    steps: function() {
      this.steps = Math.min(Math.max(this.steps, this.stepsMin), this.stepsMax);
    }
  },
  methods: {
    init: function() {
      this.myoSocket = new WebSocket('ws://127.0.0.1:10138/myo/2');
      this.myoSocket.onmessage = this.processMyoMessage;
    },
    start: function() {
      if(this.interval) {
        return;
      }

      interval = 1000 / this.bpm * 60 / 4;
      return (this.interval = setInterval(this.doStep, interval));
    },
    stop: function() {
      if(!this.interval) {
        return false;
      }

      clearInterval(this.interval);
      this.interval = null;
      return true;
    },
    toggle: function() {
      console.log('toggle');
      if(!this.interval) {
        this.start();
      }
      else {
        this.stop();
      }
    },
    doStep: function() {
      this.currentStep = this.currentStep < this.steps - 1 ? this.currentStep + 1 : 0;
      this.playNotes();
    },
    playNotes: function() {
      for(var index in this.notes) {
        if(this.notes[index].steps[this.currentStep].checked) {
          if(!this.socket) {
            this.socket = io(this.url);
          }

          this.socket.emit('url', '/xylofoon/' + index);
        }
      }
    },
    processMyoMessage: function(message) {
      var json = JSON.parse(message.data);

      if (json[0] != 'event') {
        return console.log(message.data);
      }

      var data = json[1];

      if (data.type == 'connected') {
        this.myoID = data.myo;
      }

      if (data.type != 'orientation') {
        console.log(data);
      }

      if(data.type == 'pose') {
        this.processMyoPose(data);
      }
    },
    processMyoPose: function(data) {
      if(data.pose  == 'fingers_spread') {
        this.start();
      }

      if(data.pose  == 'fist') {
        this.stop();
      }
    }
  }
});

sequencer.init();
