let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  return ctx;
}

function tone(
  frequency: number,
  duration: number,
  type: OscillatorType,
  gain: number,
  startDelay = 0,
) {
  const c = getCtx();
  if (!c) return;
  try {
    if (c.state === "suspended") void c.resume();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.connect(g);
    g.connect(c.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, c.currentTime + startDelay);
    g.gain.setValueAtTime(gain, c.currentTime + startDelay);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startDelay + duration);
    osc.start(c.currentTime + startDelay);
    osc.stop(c.currentTime + startDelay + duration);
  } catch {
    // audio unavailable
  }
}

export function playMoveSound() {
  tone(520, 0.08, "square", 0.15);
}

export function playCaptureSound() {
  tone(320, 0.07, "sawtooth", 0.2);
  tone(220, 0.12, "sawtooth", 0.15, 0.06);
}

export function playCheckSound() {
  tone(660, 0.08, "sine", 0.25);
  tone(880, 0.12, "sine", 0.2, 0.09);
}

export function playMoveByType(san: string, captured: boolean) {
  if (san.includes("+") || san.includes("#")) {
    playCheckSound();
  } else if (captured) {
    playCaptureSound();
  } else {
    playMoveSound();
  }
}
