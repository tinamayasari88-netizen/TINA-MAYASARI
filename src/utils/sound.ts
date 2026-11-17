let audioCtx: AudioContext | null = null;
let isMuted = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined' || isMuted) return null;
  if (!audioCtx) {
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextCtor) {
      audioCtx = new AudioContextCtor();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function setSoundMuted(muted: boolean) {
  isMuted = muted;
}

export function getSoundMuted(): boolean {
  return isMuted;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', delay = 0, gainVal = 0.08) {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

export function playCorrectSound() {
  playTone(523.25, 0.14, 'triangle', 0, 0.1);
  playTone(659.25, 0.18, 'triangle', 0.08, 0.1);
  playTone(783.99, 0.24, 'triangle', 0.16, 0.11);
}

export function playWrongSound() {
  playTone(280, 0.16, 'sine', 0, 0.08);
  playTone(220, 0.22, 'sine', 0.12, 0.08);
}

export function playVictorySound() {
  playTone(523.25, 0.15, 'triangle', 0, 0.1);
  playTone(659.25, 0.15, 'triangle', 0.12, 0.1);
  playTone(783.99, 0.15, 'triangle', 0.24, 0.1);
  playTone(1046.5, 0.35, 'triangle', 0.36, 0.12);
}
