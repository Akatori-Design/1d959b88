/* Old-computer sound, all synthesised with Web Audio (no audio files):
   - a short, low floppy-disk read when a page opens: the motor spins up, the head seeks and
     steps a few tracks, the motor spins down (no high-pitched sounds while a page opens)
   - static crackle when the screen glitches (screen.js calls Sound.crackle)
   - a mechanical mouse click on every click
   Browsers only allow sound after the visitor interacts. It is tried on load (Chrome allows it
   once someone has been clicking around the site), otherwise it starts on the first click or
   key press. S, or the SOUND item in the bottom bar, turns it on and off (remembered). */
const Sound = (() => {
  let ac = null, master = null, motor = null, whiteBuf = null, on = true, label = null;
  try { on = localStorage.getItem('crt-sound') !== 'off'; } catch {}
  const rand = (a, b) => a + Math.random() * (b - a);

  // white noise, only ever played in short bursts (clicks, steps, static)
  function noise(seconds) {
    const buf = ac.createBuffer(1, Math.round(ac.sampleRate * seconds), ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // a short burst of filtered noise: the building block of clicks, steps and static
  function burst(at, length, freq, q, level) {
    const src = ac.createBufferSource(); src.buffer = whiteBuf;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
    const g = ac.createGain();
    g.gain.setValueAtTime(level, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + length);
    src.connect(bp).connect(g).connect(master);
    src.start(at, Math.random() * 0.5, length + 0.01);
  }

  function thump(at, freq, length, level) {
    const o = ac.createOscillator(); o.frequency.value = freq;
    const g = ac.createGain();
    g.gain.setValueAtTime(level, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + length);
    o.connect(g).connect(master);
    o.start(at); o.stop(at + length + 0.01);
  }

  /* ---------- floppy drive ---------- */

  // spindle motor: a soft tonal hum (no noise, so nothing wind-like), wobbling at 5 Hz (300 rpm);
  // silent until a read
  function buildMotor() {
    motor = ac.createGain(); motor.gain.value = 0; motor.connect(master);
    const wobble = ac.createGain(); wobble.gain.value = 0.75; wobble.connect(motor);
    const lfo = ac.createOscillator(); lfo.frequency.value = 5;
    const depth = ac.createGain(); depth.gain.value = 0.25;
    lfo.connect(depth).connect(wobble.gain); lfo.start();

    const tone = ac.createOscillator(); tone.type = 'sawtooth'; tone.frequency.value = 78;
    const tl = ac.createBiquadFilter(); tl.type = 'lowpass'; tl.frequency.value = 240;
    const tg = ac.createGain(); tg.gain.value = 0.12;
    tone.connect(tl).connect(tg).connect(wobble); tone.start();
  }

  const motorOn = at => motor.gain.setTargetAtTime(0.18, at, 0.12);
  const motorOff = at => motor.gain.setTargetAtTime(0, at, 0.35);

  // one head step: a muffled tick and a small thunk from the drive frame (no bright highs)
  function step(at, level = 0.22) {
    burst(at, 0.01, rand(280, 480), 2, level);
    thump(at, rand(85, 110), 0.022, level * 0.8);
  }

  // many steps in a row at a few ms each turns into the drive's buzzy "zzzt" seek
  function seekBuzz(at, steps, every) {
    for (let i = 0; i < steps; i++) step(at + i * every, 0.13);
    return at + steps * every;
  }

  // one read: spin up, seek to the data, step through tracks, spin down. Returns its end time.
  function read(at, length) {
    motorOn(at);
    let t = seekBuzz(at + rand(0.25, 0.4), 5 + (Math.random() * 25 | 0), rand(0.005, 0.009)) + 0.08;
    while (t < at + length) {
      if (Math.random() < 0.15) t = seekBuzz(t, 3 + (Math.random() * 12 | 0), 0.006) + 0.06;
      else { step(t); t += rand(0.12, 0.42); }
    }
    motorOff(t + 0.3);
    return t + 0.3;
  }

  // page load: a short, busy read
  function processing() {
    if (ac && on) read(ac.currentTime + 0.02, rand(0.8, 1.3));
  }

  function start() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = on ? 0.6 : 0; master.connect(ac.destination);
    whiteBuf = noise(1);
    buildMotor();
    setOn(on);
  }

  /* ---------- clicks and glitches ---------- */

  // mechanical switch: a sharp, high-pitched tick with a little metallic ring, then the release
  function click() {
    if (!ac || !on) return;
    const t = ac.currentTime;
    burst(t, 0.003, 5200, 4, 0.55);            // the snap
    burst(t + 0.001, 0.008, 2600, 6, 0.18);    // plastic body
    const ring = ac.createOscillator(); ring.type = 'triangle'; ring.frequency.value = 4100;
    const rg = ac.createGain();
    rg.gain.setValueAtTime(0.05, t); rg.gain.exponentialRampToValueAtTime(0.0001, t + 0.014);
    ring.connect(rg).connect(master); ring.start(t); ring.stop(t + 0.02);
    burst(t + 0.045, 0.0025, 6200, 4, 0.3);    // the release
  }

  // static from a screen glitch (kept quiet for the first 3 s, while the page is opening)
  function crackle() {
    if (!ac || !on || performance.now() < 3000) return;
    const t = ac.currentTime;
    for (let i = 0, n = 4 + (Math.random() * 10 | 0); i < n; i++)
      burst(t + Math.random() * 0.18, 0.01 + Math.random() * 0.04, 800 + Math.random() * 3500, 0.8, 0.05 + Math.random() * 0.12);
  }

  function setOn(v) {
    on = v;
    try { localStorage.setItem('crt-sound', on ? 'on' : 'off'); } catch {}
    if (master) master.gain.setTargetAtTime(on ? 0.6 : 0, ac.currentTime, 0.3);
    if (label) label.textContent = `S=SOUND ${on ? 'ON' : 'OFF'}`;
  }
  const toggle = () => { start(); setOn(!on); };

  // try straight away, so arriving on a page can play its loading noise
  if (on) start();
  if (ac && ac.state === 'running') processing();

  // otherwise sound starts with the first interaction
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

  return { crackle, get state() { return ac ? ac.state : 'not started'; } };
})();
