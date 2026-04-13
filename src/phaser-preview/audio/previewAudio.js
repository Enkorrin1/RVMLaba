let engine = null;

const STAGE_MIX = {
  wake: { wind: 0.045, sea: 0.018, hum: 0.028, ember: 0 },
  lantern: { wind: 0.052, sea: 0.016, hum: 0.042, ember: 0 },
  shore: { wind: 0.078, sea: 0.06, hum: 0.038, ember: 0 },
  service: { wind: 0.016, sea: 0.008, hum: 0.065, ember: 0 },
  tunnel: { wind: 0.01, sea: 0, hum: 0.082, ember: 0 },
  pier: { wind: 0.06, sea: 0.076, hum: 0.022, ember: 0 },
  bay: { wind: 0.032, sea: 0.05, hum: 0.014, ember: 0.03 },
};

function createNoiseBuffer(context, durationSeconds = 2.2) {
  const length = Math.floor(context.sampleRate * durationSeconds);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    data[index] = (Math.random() * 2 - 1) * 0.45;
  }
  return buffer;
}

function createLoopingNoise(context, destination, {
  lowpass,
  highpass,
  gain = 0.02,
} = {}) {
  const source = context.createBufferSource();
  source.buffer = createNoiseBuffer(context);
  source.loop = true;

  let tail = source;
  if (highpass) {
    const filter = context.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = highpass;
    tail.connect(filter);
    tail = filter;
  }

  if (lowpass) {
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lowpass;
    tail.connect(filter);
    tail = filter;
  }

  const gainNode = context.createGain();
  gainNode.gain.value = gain;
  tail.connect(gainNode);
  gainNode.connect(destination);
  source.start();

  return { source, gainNode };
}

function createOscillatorLayer(context, destination, {
  type = "sine",
  frequency = 80,
  detune = 0,
  gain = 0.02,
} = {}) {
  const oscillator = context.createOscillator();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  oscillator.detune.value = detune;
  const gainNode = context.createGain();
  gainNode.gain.value = gain;
  oscillator.connect(gainNode);
  gainNode.connect(destination);
  oscillator.start();
  return { oscillator, gainNode };
}

function ensureEngine() {
  if (engine) {
    return engine;
  }

  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) {
    return null;
  }

  const context = new AudioCtor();
  const master = context.createGain();
  master.gain.value = 0.72;
  master.connect(context.destination);

  const ambienceBus = context.createGain();
  ambienceBus.gain.value = 1;
  ambienceBus.connect(master);

  const wind = createLoopingNoise(context, ambienceBus, { highpass: 190, lowpass: 1800, gain: 0.001 });
  const sea = createLoopingNoise(context, ambienceBus, { highpass: 70, lowpass: 460, gain: 0.001 });
  const humA = createOscillatorLayer(context, ambienceBus, { type: "sine", frequency: 56, gain: 0.001 });
  const humB = createOscillatorLayer(context, ambienceBus, { type: "triangle", frequency: 112, detune: 4, gain: 0.001 });
  const ember = createOscillatorLayer(context, ambienceBus, { type: "triangle", frequency: 380, detune: -8, gain: 0.0004 });

  engine = {
    context,
    master,
    wind,
    sea,
    humA,
    humB,
    ember,
    unlocked: false,
    currentStage: null,
  };

  return engine;
}

function rampGain(node, value, duration = 0.55) {
  const instance = ensureEngine();
  if (!instance) {
    return;
  }

  const now = instance.context.currentTime;
  node.gain.cancelScheduledValues(now);
  node.gain.setValueAtTime(node.gain.value, now);
  node.gain.linearRampToValueAtTime(value, now + duration);
}

export function resumePreviewAudio() {
  const instance = ensureEngine();
  if (!instance) {
    return;
  }

  instance.context.resume();
  instance.unlocked = true;
}

export function syncPreviewAmbience(stage) {
  const instance = ensureEngine();
  if (!instance || !instance.unlocked) {
    return;
  }

  const mix = STAGE_MIX[stage] ?? STAGE_MIX.wake;
  if (instance.currentStage === stage) {
    return;
  }

  instance.currentStage = stage;
  rampGain(instance.wind.gainNode, mix.wind);
  rampGain(instance.sea.gainNode, mix.sea);
  rampGain(instance.humA.gainNode, mix.hum);
  rampGain(instance.humB.gainNode, mix.hum * 0.58);
  rampGain(instance.ember.gainNode, mix.ember);
}

function playTransient({
  type = "triangle",
  frequency = 320,
  endFrequency = frequency,
  gain = 0.05,
  duration = 0.12,
  filterFrequency = 1800,
} = {}) {
  const instance = ensureEngine();
  if (!instance || !instance.unlocked) {
    return;
  }

  const { context, master } = instance;
  const oscillator = context.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, context.currentTime);
  oscillator.frequency.linearRampToValueAtTime(endFrequency, context.currentTime + duration);

  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = filterFrequency;

  const gainNode = context.createGain();
  gainNode.gain.setValueAtTime(0, context.currentTime);
  gainNode.gain.linearRampToValueAtTime(gain, context.currentTime + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);

  oscillator.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(master);
  oscillator.start();
  oscillator.stop(context.currentTime + duration + 0.02);
}

export function playPreviewUiTick(kind = "soft") {
  if (kind === "close") {
    playTransient({ type: "triangle", frequency: 280, endFrequency: 170, gain: 0.03, duration: 0.09, filterFrequency: 1300 });
    return;
  }

  if (kind === "select") {
    playTransient({ type: "triangle", frequency: 360, endFrequency: 420, gain: 0.04, duration: 0.1, filterFrequency: 1600 });
    return;
  }

  if (kind === "read") {
    playTransient({ type: "sine", frequency: 220, endFrequency: 290, gain: 0.035, duration: 0.18, filterFrequency: 1200 });
    return;
  }

  playTransient({ type: "triangle", frequency: 300, endFrequency: 340, gain: 0.028, duration: 0.08, filterFrequency: 1500 });
}

export function playPreviewWorldCue(kind = "pulse") {
  if (kind === "generator") {
    playTransient({ type: "sawtooth", frequency: 110, endFrequency: 70, gain: 0.055, duration: 0.22, filterFrequency: 900 });
    return;
  }

  if (kind === "unlock") {
    playTransient({ type: "triangle", frequency: 180, endFrequency: 120, gain: 0.045, duration: 0.16, filterFrequency: 1100 });
    return;
  }

  playTransient({ type: "triangle", frequency: 240, endFrequency: 190, gain: 0.03, duration: 0.12, filterFrequency: 1200 });
}
