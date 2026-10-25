/* Old-computer sound, synthesised with Web Audio (no audio files): a mechanical mouse click
   on every click. Opening a page is silent. Browsers only allow sound after the visitor
   interacts, so it starts on the first click or key press. S, or the SOUND item in the bottom
   bar, turns it on and off (remembered). */
const Sound = (() => {
  let ac = null, master = null, whiteBuf = null, on = true, label = null;
  try { on = localStorage.getItem('crt-sound') !== 'off'; } catch {}

  // white noise, only ever played in short bursts (the click)
  function noise(seconds) {
    const buf = ac.createBuffer(1, Math.round(ac.sampleRate * seconds), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // a short burst of filtered noise: the building block of the click
  function burst(at, length, freq, q, level) {
    const src = ac.createBufferSource(); src.buffer = whiteBuf;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(level, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + length);
    src.connect(bp).connect(g).connect(master);
    src.start(at, Math.random() * 0.5, length + 0.01);
  }

  function start() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = on ? 0.6 : 0; master.connect(ac.destination);
    whiteBuf = noise(1);
    setOn(on);
  }

  /* ---------- click ---------- */

  // mechanical switch: a crisp, high snap and its release; plain noise, so no ring or clank
  function click() {
    if (!ac || !on) return;
    const t = ac.currentTime;
    burst(t, 0.003, 5200, 1.2, 0.5);           // the snap
    burst(t + 0.045, 0.002, 6000, 1.2, 0.25);  // the release
  }

  function setOn(v) {
    on = v;
    try { localStorage.setItem('crt-sound', on ? 'on' : 'off'); } catch {}
    if (master) master.gain.setTargetAtTime(on ? 0.6 : 0, ac.currentTime, 0.3);
    if (label) label.textContent = `S=SOUND ${on ? 'ON' : 'OFF'}`;
  }
  const toggle = () => { start(); setOn(!on); };

  // sound starts with the first interaction
  addEventListener('pointerdown', () => { start(); click(); });
  addEventListener('keydown', e => {
    start();
    if ((e.key === 's' || e.key === 'S') && !e.metaKey && !e.ctrlKey) toggle();
  });

  // keyboard-triggered clicks get the sound too; same-site links wait a beat so it can play
  addEventListener('click', e => {
    if (e.detail === 0) click();
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || !on || !ac || e.defaultPrevented || a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (a.origin !== location.origin) return;
    e.preventDefault();
    setTimeout(() => { location.href = a.href; }, 90);
  });

  // ON/OFF switch in the bottom bar, just before READY
  addEventListener('DOMContentLoaded', () => {
    const bar = document.querySelector('footer.bar');
    if (!bar) return;
    label = document.createElement('span');
    label.id = 'sound';
    label.textContent = `S=SOUND ${on ? 'ON' : 'OFF'}`;
    label.addEventListener('click', toggle);
    bar.insertBefore(label, bar.lastElementChild);
  });

  return { get state() { return ac ? ac.state : 'not started'; } };
})();
