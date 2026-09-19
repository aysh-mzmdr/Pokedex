// Synthesized Pokédex sound effects (Web Audio API, no asset files).

let ctx = null
let master = null
let noiseBuf = null
let noteStep = 0

const NOOP = () => {}

// C-major pentatonic, two octaves: keeps rapid typing sounding melodic.
const KEY_NOTES = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51]

function getCtx() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return null
    ctx = new AudioCtx()
    master = ctx.createGain()
    master.gain.value = 0.55
    const limiter = ctx.createDynamicsCompressor()
    master.connect(limiter)
    limiter.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') ctx.resume().catch(NOOP)
  return ctx
}

function getNoise(c) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, Math.ceil(c.sampleRate * 1.5), c.sampleRate)
    const data = noiseBuf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  return noiseBuf
}

function tone(c, { type = 'sine', freq, endFreq, at = 0, dur = 0.1, gain = 0.2, attack = 0.004, dest }) {
  const t = c.currentTime + at
  const osc = c.createOscillator()
  const amp = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur)
  amp.gain.setValueAtTime(0.0001, t)
  amp.gain.exponentialRampToValueAtTime(gain, t + attack)
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(amp).connect(dest ?? master)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function noiseSweep(c, { from, to, at = 0, dur, gain, q = 1, filterType = 'bandpass', peak = 0.5 }) {
  const t = c.currentTime + at
  const src = c.createBufferSource()
  src.buffer = getNoise(c)
  const filter = c.createBiquadFilter()
  filter.type = filterType
  filter.Q.value = q
  filter.frequency.setValueAtTime(from, t)
  filter.frequency.exponentialRampToValueAtTime(to, t + dur)
  const amp = c.createGain()
  amp.gain.setValueAtTime(0.0001, t)
  amp.gain.exponentialRampToValueAtTime(gain, t + dur * peak)
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(filter).connect(amp).connect(master)
  src.start(t)
  src.stop(t + dur + 0.05)
}

// A gain bus lets a looping sound be faded out cleanly, cutting any notes
// that were already scheduled ahead of time.
function makeBus(c) {
  const bus = c.createGain()
  bus.gain.setValueAtTime(0.0001, c.currentTime)
  bus.gain.linearRampToValueAtTime(1, c.currentTime + 0.03)
  bus.connect(master)
  return bus
}

function releaseBus(c, bus, stopNodes = NOOP) {
  const now = c.currentTime
  bus.gain.cancelScheduledValues(now)
  bus.gain.setValueAtTime(bus.gain.value, now)
  bus.gain.linearRampToValueAtTime(0.0001, now + 0.06)
  setTimeout(() => {
    stopNodes()
    bus.disconnect()
  }, 120)
}

/** Call from a user gesture so later (async) sounds are allowed to play. */
export function unlock() {
  getCtx()
}

/** Keystroke in the input box: a marimba-like pluck climbing the scale. */
export function type(isDelete = false) {
  const c = getCtx()
  if (!c) return
  if (isDelete) {
    tone(c, { type: 'triangle', freq: 440, endFreq: 330, dur: 0.09, gain: 0.16 })
    return
  }
  noteStep = (noteStep + 1 + Math.floor(Math.random() * 2)) % KEY_NOTES.length
  const f = KEY_NOTES[noteStep]
  tone(c, { type: 'triangle', freq: f, dur: 0.2, gain: 0.22 })
  tone(c, { type: 'sine', freq: f * 4, dur: 0.06, gain: 0.05 })
  tone(c, { type: 'square', freq: 2400, dur: 0.02, gain: 0.03 })
}

/** A / B buttons (Reset and Search): two-tone confirm blip. */
export function button() {
  const c = getCtx()
  if (!c) return
  tone(c, { type: 'square', freq: 880, dur: 0.06, gain: 0.09 })
  tone(c, { type: 'square', freq: 1318.51, at: 0.06, dur: 0.1, gain: 0.09 })
}

/** D-pad (+): a lower, mechanical click-tock, pitched by direction. */
export function dpad(up = true) {
  const c = getCtx()
  if (!c) return
  const f = up ? 660 : 440
  tone(c, { type: 'triangle', freq: f * 1.5, endFreq: f, dur: 0.08, gain: 0.26 })
  noiseSweep(c, { from: 5000, to: 2500, dur: 0.03, gain: 0.12, q: 0.8, filterType: 'highpass', peak: 0.2 })
}

/** Blue lens glow: a radar sweep synced to the 1s glow pulse. Returns a stop fn. */
export function startScan() {
  const c = getCtx()
  if (!c) return NOOP
  const bus = makeBus(c)
  const pulse = () => {
    tone(c, { type: 'sine', freq: 500, endFreq: 1600, dur: 0.55, gain: 0.16, attack: 0.3, dest: bus })
    tone(c, { type: 'triangle', freq: 250, endFreq: 800, dur: 0.55, gain: 0.05, attack: 0.3, dest: bus })
    ;[0.6, 0.72, 0.84].forEach((at, i) =>
      tone(c, { type: 'square', freq: 1800 + i * 300, at, dur: 0.03, gain: 0.04, dest: bus })
    )
  }
  pulse()
  const id = setInterval(pulse, 1000)
  return () => {
    clearInterval(id)
    releaseBus(c, bus)
  }
}

/** Failed search: a continuous harsh buzz, pulsing with the red lens. Returns a stop fn. */
export function startBuzz() {
  const c = getCtx()
  if (!c) return NOOP
  const bus = makeBus(c)
  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 1100
  const gate = c.createGain()
  gate.gain.value = 0.7
  gate.connect(filter).connect(bus)

  const lfo = c.createOscillator()
  const lfoDepth = c.createGain()
  lfo.frequency.value = 2
  lfoDepth.gain.value = 0.3
  lfo.connect(lfoDepth).connect(gate.gain)

  const saw = c.createOscillator()
  saw.type = 'sawtooth'
  saw.frequency.value = 110
  const sawGain = c.createGain()
  sawGain.gain.value = 0.11
  saw.connect(sawGain).connect(gate)

  const sq = c.createOscillator()
  sq.type = 'square'
  sq.frequency.value = 117
  const sqGain = c.createGain()
  sqGain.gain.value = 0.06
  sq.connect(sqGain).connect(gate)

  const nodes = [lfo, saw, sq]
  nodes.forEach((n) => n.start())

  return () => releaseBus(c, bus, () => nodes.forEach((n) => n.stop()))
}

/** Doors sliding apart while the core light charges up (~0.95s). */
export function doorsOpen() {
  const c = getCtx()
  if (!c) return
  noiseSweep(c, { from: 300, to: 3500, dur: 0.95, gain: 0.3, q: 1.2, peak: 0.85 })
  tone(c, { type: 'sine', freq: 220, endFreq: 1760, dur: 0.95, gain: 0.12, attack: 0.7 })
  tone(c, { type: 'triangle', freq: 110, endFreq: 440, dur: 0.95, gain: 0.08, attack: 0.7 })
}

/** The white burst: thump, downward swoosh and a shimmering chord (~0.9s). */
export function burst() {
  const c = getCtx()
  if (!c) return
  tone(c, { type: 'sine', freq: 120, endFreq: 40, dur: 0.4, gain: 0.4 })
  noiseSweep(c, { from: 7000, to: 400, dur: 0.9, gain: 0.32, q: 0.9, peak: 0.12 })
  ;[1046.5, 1568, 2093].forEach((f, i) =>
    tone(c, { type: 'sine', freq: f, at: i * 0.03, dur: 0.9, gain: 0.05, attack: 0.15 })
  )
}
