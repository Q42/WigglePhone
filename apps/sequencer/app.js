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
    bpm: 120,
    currentStep: 0,
    url: 'http://10.42.35.16:9001',
    socket: null,
    interval: null
  },
  watch: {
    'bpm': function() {
      this.stop();
      this.start();
    }
  },
  methods: {
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
    }
  }
});
