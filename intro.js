/* V1.11.88 — cinematic intro motion, transition, and optional generated ambience */
(() => {
  const intro = document.getElementById('trenchesIntro');
  if (!intro) return;

  const enter = document.getElementById('trenchesIntroEnter');
  const soundButton = document.getElementById('trenchesIntroSound');
  const debrisLayer = intro.querySelector('.trenchesIntroDebris');
  let audioContext = null;
  let masterGain = null;
  let ambienceTimer = 0;

  document.body.classList.add('trenches-intro-open');

  if (debrisLayer) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 18; i += 1) {
      const piece = document.createElement('i');
      piece.className = 'trenchDebrisPiece';
      piece.style.left = `${Math.round(Math.random() * 100)}%`;
      piece.style.setProperty('--debris-size', `${2 + Math.random() * 5}px`);
      piece.style.setProperty('--debris-time', `${7 + Math.random() * 8}s`);
      piece.style.setProperty('--debris-delay', `${-Math.random() * 13}s`);
      piece.style.setProperty('--debris-drift', `${-110 + Math.random() * 220}px`);
      fragment.appendChild(piece);
    }
    debrisLayer.appendChild(fragment);
  }

  function audioReady() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return false;
    if (!audioContext) {
      audioContext = new AudioContext();
      masterGain = audioContext.createGain();
      masterGain.gain.value = 0.055;
      masterGain.connect(audioContext.destination);
    }
    if (audioContext.state === 'suspended') audioContext.resume();
    return true;
  }

  function playRumble() {
    if (!audioReady() || !masterGain) return;
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(52 + Math.random() * 20, now);
    oscillator.frequency.exponentialRampToValueAtTime(24, now + 1.4);
    filter.type = 'lowpass';
    filter.frequency.value = 120;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.8, now + .08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
    oscillator.connect(filter).connect(gain).connect(masterGain);
    oscillator.start(now);
    oscillator.stop(now + 1.9);
  }

  function playCrackle() {
    if (!audioReady() || !masterGain) return;
    const duration = .16;
    const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    filter.type = 'bandpass';
    filter.frequency.value = 520 + Math.random() * 540;
    filter.Q.value = .7;
    gain.gain.value = .2;
    source.buffer = buffer;
    source.connect(filter).connect(gain).connect(masterGain);
    source.start();
  }

  function scheduleAmbience() {
    window.clearTimeout(ambienceTimer);
    if (soundButton?.dataset.sound !== 'on') return;
    if (Math.random() > .45) playCrackle();
    if (Math.random() > .72) playRumble();
    ambienceTimer = window.setTimeout(scheduleAmbience, 700 + Math.random() * 1400);
  }

  function stopSound() {
    window.clearTimeout(ambienceTimer);
    if (masterGain && audioContext) {
      masterGain.gain.cancelScheduledValues(audioContext.currentTime);
      masterGain.gain.setTargetAtTime(0.0001, audioContext.currentTime, .08);
    }
    if (soundButton) {
      soundButton.dataset.sound = 'off';
      soundButton.setAttribute('aria-pressed', 'false');
      soundButton.setAttribute('aria-label', 'Turn battlefield sound on');
      soundButton.textContent = '🔇';
    }
  }

  soundButton?.addEventListener('click', () => {
    const turningOn = soundButton.dataset.sound !== 'on';
    if (!turningOn) {
      stopSound();
      return;
    }
    if (!audioReady()) return;
    masterGain.gain.cancelScheduledValues(audioContext.currentTime);
    masterGain.gain.setTargetAtTime(0.055, audioContext.currentTime, .06);
    soundButton.dataset.sound = 'on';
    soundButton.setAttribute('aria-pressed', 'true');
    soundButton.setAttribute('aria-label', 'Turn battlefield sound off');
    soundButton.textContent = '🔊';
    playRumble();
    scheduleAmbience();
  });

  function enterTheTrenches() {
    if (intro.classList.contains('is-exiting')) return;
    stopSound();
    intro.classList.add('is-exiting');
    document.body.classList.remove('trenches-intro-open');
    window.setTimeout(() => {
      intro.hidden = true;
      intro.setAttribute('aria-hidden', 'true');
    }, 760);
  }

  enter?.addEventListener('click', enterTheTrenches);
  intro.addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target !== soundButton) enterTheTrenches();
    if (event.key === 'Escape') enterTheTrenches();
  });

  window.addEventListener('pagehide', stopSound, { once: true });
})();
