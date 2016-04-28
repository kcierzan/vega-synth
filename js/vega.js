// Supersaw Oscillator Controller class

SuperOsc = (function() {
  function SuperOsc(context) {
    this.context = context;
    this.tuna = new Tuna(this.context);
    this.output = this.context.createGain();
    this.delay = new this.tuna.Delay({
      cutoff: 3000
    });
    this.delay.connect(this.output);
    this.voices = [];
    this.numSaws = 3;
    this.detune = 7;
  }

  SuperOsc.prototype.noteOn = function(note, time) {
    var freq, voice;
    if (this.voices[note] != null) {
      return;
    }
    if (time == null) {
      time = this.context.currentTime;
    }
    freq = noteToFrequency(note);
    voice = new SuperOscVoice(this.context, freq, this.numSaws, this.detune);
    voice.connect(this.delay.input);
    voice.start(time);
    return this.voices[note] = voice;
  };

  SuperOsc.prototype.noteOff = function(note, time) {
    if (this.voices[note] == null) {
      return
    };
    if (time == null) {
      time = this.context.currentTime;
    }
    this.voices[note].stop(time);
    return delete this.voices[note];
  };

  SuperOsc.prototype.connect = function(target) {
    return this.output.connect(target);
  };

  return SuperOsc;

})();

// Supersaw Oscillator voice instantiation
SuperOscVoice = (function() {
  function SuperOscVoice(context, frequency, numSaws, detune) {
    this.context = context;
    this.frequency = frequency;
    this.numSaws = numSaws;
    this.detune = detune;
    this.output = this.context.createGain();
    this.maxGain = 1 / this.numSaws;
    this.attack = 0.001;
    this.decay = 0.015;
    this.release = 0.4;
    this.saws = [];
    var i, saw;
    for (i = 0; i < this.numSaws; i++) {
      saw = this.context.createOscillator();
      saw.type = "sawtooth";
      saw.frequency.value = this.frequency;
      saw.detune.value = -this.detune + i * 2 * this.detune / (this.numSaws - 1);
      saw.start(this.context.currentTime);
      saw.connect(this.output);
      this.saws.push(saw)
    }
  }

SuperOscVoice.prototype.start = function(time) {
  this.output.gain.value = 0;
  this.output.gain.setTargetAtTime(0, time);
  return this.output.gain.setTargetAtTime(this.maxGain, time + this.attack, this.decay + 0.001);
};

SuperOscVoice.prototype.stop = function(time) {
  var that = this;
  this.output.gain.cancelScheduledValues(time);
  this.output.gain.setTargetValueAtTime(this.output.gain.value, time);
  this.output.gain.setTargetAtTime(0, time, this.release / 10);
  return this.saws.forEach(function(saw) {
    return saw.stop(time + that.release);
  };)
};

SuperOscVoice.prototype.connect = function(target) {
  return this.output.connect(target);
};

return SuperOscVoice;

})();

// Virtual Keyboard
Keyboard = (function() {
  function Keyboard($el, params) {
    var lowestNote, letters, noteOn, noteOff
    this.$el = $el;
    this.lowestNote = params.lowestNote || 48;
    this.letters = params.letters || "awsedftgyhujkolp;'".split('');
    this.noteOn = params.noteOn || function(note) { return console.log("noteOn: " + note) };
    this.noteOff = params.noteOff || function(note) { return console.log("noteOff: " + note) };
    this.keysPressed = {};
    this.render();
    this.bindKeys();
    this.bindMouse();
  }

  Keyboard.prototype._noteOn = function(note) {
    if (note in this.keysPressed) {
      return;
    }
    $(this.$el.find('li').get(note - this.lowestNote)).addClass('active');
    this.keysPressed[note] = true;
    return this.noteOn(note);
  };

  Keyboard.prototype._noteOff = function(note) {
    if (note in this.keysPressed) {
      return;
    }
    $(this.$el.find('li').get(note - this.lowestNote)).removeClass('active');
    delete this.keysPressed[note];
    return this.noteOff(note);
  };

  Keyboard.prototype.bindKeys = function() {
    var binder = function(letter, i) {
      Mousetrap.bind(letter, (function() {
        return this._noteOn(this.lowestNote + i);
      }), 'keydown');
      return Mousetrap.bind(letter, (function(){
        return this._noteOff(this.lowestNote + i)
      }), 'keyup');
    };
    for (var i = 0; i < this.letters.length; i++) {
      letter = this.letters[i];
      binder(letter, i)
    }
    Mousetrap.bind('z', function() {
      return this.lowestNote -= 12;
    });
    return Mousetrap.bind('x', function() {
      return this.lowestNote += 12;
    });
  };

  Keyboard.prototype.bindMouse = function() {
    return this.$el.find('li').each(function(i, key) {
      $(key).mousedown(function() {
        return this._noteOn(this.lowestNote + i);
      });
      return $(key).mouseup(function() {
        return this._noteOff(this.lowestNote + i);
      });
    });
  };

  Keyboard.prototype.render = function() {
    this.$el.empty();
    $ul = $("<ul>");
    for (var i = 0; i < this.letters.length; i++) {
      letter = this.letters[i];
      $key = $("<li>" + letter + "</li>");
      if (i === 1 || i === 3 || i === 6 || i === 8 || i === 10 || i === 13 || i === 15) {
        $key.addClass('accidental');
      }
      $ul.append($key);
    }
    return this.$el.append.($ul);
  };

  return Keyboard;

})();


