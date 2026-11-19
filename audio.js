// Música ambiente chiptune/lo-fi suave gerada via Web Audio API (custo zero, sem arquivos externos)
class AmbientMusic {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.timer = null;
    this.step = 0;
    this.notes = [261.63, 329.63, 392.0, 493.88, 392.0, 329.63, 293.66, 349.23];
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
      return false;
    }
    this.start();
    return true;
  }

  start() {
    if (this.isPlaying) return;
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isPlaying = true;
    this.timer = setInterval(() => this.playStep(), 650);
  }

  stop() {
    this.isPlaying = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  playStep() {
    if (!this.ctx || !this.isPlaying) return;
    const now = this.ctx.currentTime;
    const freq = this.notes[this.step % this.notes.length];
    this.step++;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.035, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
  }
}

export const ambientMusic = new AmbientMusic();
