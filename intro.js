/* V1.12.12 — lower animated title, interactions, and procedural battlefield audio */
(() => {
  const intro = document.getElementById('trenchesIntro');
  const enter = document.getElementById('trenchesIntroEnter');
  const soundButton = document.getElementById('trenchesIntroSound');
  const soundIcon = soundButton?.querySelector('.trenchesIntroSoundIcon');
  const soundLabel = soundButton?.querySelector('.trenchesIntroSoundLabel');
  if (!intro || !enter) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let exiting = false;
  let soundOn = false;
  let audioContext = null;
  let masterGain = null;
  let noiseBuffer = null;
  let audioNodes = [];
  let gunfireTimer = 0;
  let explosionTimer = 0;

  document.body.classList.add('trenches-intro-open');
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => intro.classList.add('intro-ready'));
  });

  const startLightFlicker = () => {
    if (!exiting) intro.classList.add('lights-flicker');
  };

  const stopLightFlicker = () => {
    intro.classList.remove('lights-flicker');
  };

  enter.addEventListener('pointerenter', startLightFlicker);
  enter.addEventListener('pointerleave', stopLightFlicker);
  enter.addEventListener('focus', startLightFlicker);
  enter.addEventListener('blur', stopLightFlicker);

  function setSoundUI(enabled) {
    if (!soundButton) return;
    soundButton.setAttribute('aria-pressed', String(enabled));
    soundButton.setAttribute('aria-label', enabled ? 'Turn battlefield sound off' : 'Turn battlefield sound on');
    if (soundIcon) soundIcon.textContent = enabled ? '🔊' : '🔇';
    if (soundLabel) soundLabel.textContent = enabled ? 'Sound on' : 'Sound off';
  }

  function createNoiseBuffer(context, seconds = 2.5) {
    const length = Math.ceil(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      previous = previous * .74 + white * .26;
      data[i] = previous;
    }
    return buffer;
  }

  function trackNode(node) {
    audioNodes.push(node);
    return node;
  }

  function connectWithPan(node, destination, panValue) {
    if (audioContext?.createStereoPanner) {
      const panner = trackNode(audioContext.createStereoPanner());
      panner.pan.value = Math.max(-1, Math.min(1, panValue));
      node.connect(panner).connect(destination);
      return;
    }
    node.connect(destination);
  }

  function startWindAndRumble() {
    if (!audioContext || !masterGain || !noiseBuffer) return;

    const wind = trackNode(audioContext.createBufferSource());
    const windFilter = trackNode(audioContext.createBiquadFilter());
    const windGain = trackNode(audioContext.createGain());
    wind.buffer = noiseBuffer;
    wind.loop = true;
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 420;
    windFilter.Q.value = .45;
    windGain.gain.value = .07;
    wind.connect(windFilter).connect(windGain).connect(masterGain);
    wind.start();

    [31, 43].forEach((frequency, index) => {
      const oscillator = trackNode(audioContext.createOscillator());
      const filter = trackNode(audioContext.createBiquadFilter());
      const gain = trackNode(audioContext.createGain());
      oscillator.type = index ? 'triangle' : 'sine';
      oscillator.frequency.value = frequency;
      filter.type = 'lowpass';
      filter.frequency.value = 85;
      gain.gain.value = index ? .025 : .035;
      oscillator.connect(filter).connect(gain).connect(masterGain);
      oscillator.start();
    });
  }

  function fireGunshot(distance = .65, pan = Math.random() * 1.7 - .85) {
    if (!soundOn || !audioContext || !masterGain || !noiseBuffer) return;
    const now = audioContext.currentTime;
    const volume = .24 * (1 - distance * .52);

    const crack = trackNode(audioContext.createBufferSource());
    const crackFilter = trackNode(audioContext.createBiquadFilter());
    const crackGain = trackNode(audioContext.createGain());
    crack.buffer = noiseBuffer;
    crackFilter.type = 'bandpass';
    crackFilter.frequency.value = 820 + Math.random() * 650;
    crackFilter.Q.value = .7;
    crackGain.gain.setValueAtTime(Math.max(.0001, volume), now);
    crackGain.gain.exponentialRampToValueAtTime(.0001, now + .13 + distance * .15);
    connectWithPan(crack, crackGain, pan);
    crackGain.connect(masterGain);
    crack.start(now, Math.random() * 1.8, .34);
    crack.stop(now + .36);

    const thump = trackNode(audioContext.createOscillator());
    const thumpGain = trackNode(audioContext.createGain());
    thump.type = 'triangle';
    thump.frequency.setValueAtTime(92 - distance * 24, now);
    thump.frequency.exponentialRampToValueAtTime(42, now + .18);
    thumpGain.gain.setValueAtTime(Math.max(.0001, volume * .34), now);
    thumpGain.gain.exponentialRampToValueAtTime(.0001, now + .22 + distance * .12);
    connectWithPan(thump, thumpGain, pan);
    thumpGain.connect(masterGain);
    thump.start(now);
    thump.stop(now + .38);
  }

  function playExplosion(distance = .75, pan = Math.random() * 1.4 - .7) {
    if (!soundOn || !audioContext || !masterGain || !noiseBuffer) return;
    const now = audioContext.currentTime;
    const volume = .3 * (1 - distance * .48);

    const blast = trackNode(audioContext.createOscillator());
    const blastGain = trackNode(audioContext.createGain());
    blast.type = 'sine';
    blast.frequency.setValueAtTime(68 - distance * 15, now);
    blast.frequency.exponentialRampToValueAtTime(23, now + 1.4);
    blastGain.gain.setValueAtTime(Math.max(.0001, volume), now);
    blastGain.gain.exponentialRampToValueAtTime(.0001, now + 1.65);
    connectWithPan(blast, blastGain, pan);
    blastGain.connect(masterGain);
    blast.start(now);
    blast.stop(now + 1.8);

    const debris = trackNode(audioContext.createBufferSource());
    const debrisFilter = trackNode(audioContext.createBiquadFilter());
    const debrisGain = trackNode(audioContext.createGain());
    debris.buffer = noiseBuffer;
    debrisFilter.type = 'lowpass';
    debrisFilter.frequency.setValueAtTime(390, now);
    debrisFilter.frequency.exponentialRampToValueAtTime(105, now + 1.3);
    debrisGain.gain.setValueAtTime(Math.max(.0001, volume * .9), now);
    debrisGain.gain.exponentialRampToValueAtTime(.0001, now + 1.5);
    debris.connect(debrisFilter);
    connectWithPan(debrisFilter, debrisGain, pan);
    debrisGain.connect(masterGain);
    debris.start(now, Math.random() * 1.3, 1.65);
    debris.stop(now + 1.7);
  }

  function scheduleGunfire() {
    window.clearTimeout(gunfireTimer);
    if (!soundOn) return;
    gunfireTimer = window.setTimeout(() => {
      const pan = Math.random() * 1.7 - .85;
      const distance = .48 + Math.random() * .45;
      const burstCount = Math.random() > .68 ? 2 + Math.floor(Math.random() * 2) : 1;
      for (let shot = 0; shot < burstCount; shot += 1) {
        window.setTimeout(() => fireGunshot(distance, pan + (Math.random() - .5) * .16), shot * (105 + Math.random() * 70));
      }
      scheduleGunfire();
    }, 520 + Math.random() * 1750);
  }

  function scheduleExplosions() {
    window.clearTimeout(explosionTimer);
    if (!soundOn) return;
    explosionTimer = window.setTimeout(() => {
      playExplosion(.58 + Math.random() * .38);
      scheduleExplosions();
    }, 3900 + Math.random() * 6400);
  }

  async function startBattleAudio() {
    if (soundOn || exiting || !AudioContextClass) return;
    audioContext = new AudioContextClass();
    await audioContext.resume();
    masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(.0001, audioContext.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(.42, audioContext.currentTime + .7);
    masterGain.connect(audioContext.destination);
    noiseBuffer = createNoiseBuffer(audioContext);
    soundOn = true;
    setSoundUI(true);
    startWindAndRumble();
    scheduleGunfire();
    scheduleExplosions();
    window.setTimeout(() => fireGunshot(.8, -.55), 280);
  }

  function stopBattleAudio(fadeSeconds = .25) {
    soundOn = false;
    setSoundUI(false);
    window.clearTimeout(gunfireTimer);
    window.clearTimeout(explosionTimer);

    const contextToClose = audioContext;
    const gainToFade = masterGain;
    const nodesToStop = audioNodes;
    audioContext = null;
    masterGain = null;
    noiseBuffer = null;
    audioNodes = [];

    if (!contextToClose || !gainToFade) return;
    const now = contextToClose.currentTime;
    gainToFade.gain.cancelScheduledValues(now);
    gainToFade.gain.setValueAtTime(Math.max(.0001, gainToFade.gain.value), now);
    gainToFade.gain.exponentialRampToValueAtTime(.0001, now + fadeSeconds);

    window.setTimeout(() => {
      nodesToStop.forEach(node => {
        try { node.stop?.(); } catch {}
        try { node.disconnect?.(); } catch {}
      });
      contextToClose.close?.().catch?.(() => {});
    }, fadeSeconds * 1000 + 70);
  }

  soundButton?.addEventListener('click', async () => {
    if (soundOn) {
      stopBattleAudio();
      return;
    }
    try {
      await startBattleAudio();
    } catch {
      stopBattleAudio(0);
      soundButton.setAttribute('aria-label', 'Battlefield sound is unavailable in this browser');
    }
  });

  function enterTheTrenches() {
    if (exiting) return;
    exiting = true;
    stopLightFlicker();
    stopBattleAudio(.35);
    intro.classList.add('is-exiting');
    document.body.classList.remove('trenches-intro-open');

    window.setTimeout(() => {
      intro.hidden = true;
      intro.setAttribute('aria-hidden', 'true');
    }, 680);
  }

  enter.addEventListener('click', enterTheTrenches);
  intro.addEventListener('keydown', event => {
    if (event.key === 'Escape') enterTheTrenches();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && soundOn) stopBattleAudio(.08);
  });

  window.addEventListener('pagehide', () => stopBattleAudio(0), { once: true });
})();
