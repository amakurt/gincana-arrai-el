export function useSound() {
  let ctx: AudioContext | null = null;

  const getCtx = () => {
    if (!ctx) ctx = new AudioContext();
    return ctx;
  };

  const playTone = (freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) => {
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, c.currentTime);
      gain.gain.setValueAtTime(volume, c.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + duration);
    } catch {}
  };

  const voteConfirm = () => {
    playTone(523, 0.1, 'sine', 0.2);
    setTimeout(() => playTone(659, 0.15, 'sine', 0.2), 100);
    setTimeout(() => playTone(784, 0.2, 'sine', 0.2), 200);
  };

  const juryVote = () => {
    playTone(440, 0.15, 'triangle', 0.25);
    setTimeout(() => playTone(660, 0.2, 'triangle', 0.25), 150);
  };

  const resultsReveal = () => {
    playTone(523, 0.15, 'square', 0.15);
    setTimeout(() => playTone(659, 0.15, 'square', 0.15), 150);
    setTimeout(() => playTone(784, 0.15, 'square', 0.15), 300);
    setTimeout(() => playTone(1047, 0.4, 'square', 0.2), 450);
  };

  const timerBeep = () => {
    playTone(880, 0.08, 'square', 0.15);
  };

  const timerWarning = () => {
    playTone(660, 0.1, 'square', 0.2);
    setTimeout(() => playTone(660, 0.1, 'square', 0.2), 200);
    setTimeout(() => playTone(440, 0.15, 'square', 0.2), 400);
  };

  return { voteConfirm, juryVote, resultsReveal, timerBeep, timerWarning };
}
