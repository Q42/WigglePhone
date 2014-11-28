var notes = ['F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E'];
var steps = 16;

var sequencer = new Vue({
  el: 'body',
  data: {
    notes: Array.apply(null, new Array(notes.length)).map(function(val, i) {
      return {
        name: notes[i],
        steps: Array.apply(null, new Array(steps)).map(function() { return {checked: false}; })
      };
    }),
    bpm: 120,
    step: 0,
    url: 'http://10.42.35.16:9001',
    socket: null,
    interval: null
  },
  methods: {
    start: function() {
      if(this.interval) {
        return;
      }

      interval = 1000 / this.bpm * 60 / 4;
      console.log(interval);
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
      this.step = this.step < 15 ? this.step + 1 : 0;
      this.playNotes();
    },
    playNotes: function() {
      for(var index in this.notes) {
        if(this.notes[index].steps[this.step].checked) {
          if(!this.socket) {
            this.socket = io(this.url);
          }

          this.socket.emit('url', '/xylofoon/' + index);
        }
      }
    }
  }
});
