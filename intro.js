/* V1.11.91 — synchronized character beats, Canvas battle effects, title sequence, and ambience */
(() => {
  const intro = document.getElementById('trenchesIntro');
  if (!intro) return;

  const enter = document.getElementById('trenchesIntroEnter');
  const soundButton = document.getElementById('trenchesIntroSound');
  const debrisLayer = intro.querySelector('.trenchesIntroDebris');
  const impactsLayer = intro.querySelector('.trenchesIntroImpacts');
  const battleCanvas = document.getElementById('trenchesBattleCanvas');
  let audioContext = null;
  let masterGain = null;
  let ambienceTimer = 0;

  document.body.classList.add('trenches-intro-open');
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => intro.classList.add('intro-ready')));

  function spawnImpact() {
    if (!impactsLayer || intro.hidden || intro.classList.contains('is-exiting')) return;
    const impact = document.createElement('i');
    impact.className = 'trenchImpact';
    impact.style.left = `${24 + Math.random() * 54}%`;
    impact.style.top = `${45 + Math.random() * 38}%`;
    impactsLayer.appendChild(impact);
    impact.addEventListener('animationend', () => impact.remove(), { once: true });
  }

  const impactTimer = window.setInterval(() => {
    if (Math.random() > .34) spawnImpact();
  }, 620);

  /* A real-time battle renderer keeps every projectile, casing, smoke puff,
     explosion and action beat independent instead of moving one flat layer. */
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let battleFrame = 0;
  let battleBeatTimer = 0;
  let battleRunning = !reducedMotion;
  const battle = { bullets: [], sparks: [], smoke: [], casings: [], dirt: [], grenades: [] };

  function resizeBattleCanvas() {
    if (!battleCanvas) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    battleCanvas.width = Math.round(window.innerWidth * ratio);
    battleCanvas.height = Math.round(window.innerHeight * ratio);
    battleCanvas.style.width = `${window.innerWidth}px`;
    battleCanvas.style.height = `${window.innerHeight}px`;
    battleCanvas.dataset.ratio = String(ratio);
  }

  function point(nx, ny) {
    return { x: nx * window.innerWidth, y: ny * window.innerHeight };
  }

  function tracer(fromX, fromY, toX, toY, side = 'friendly') {
    const from = point(fromX, fromY);
    const to = point(toX, toY);
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const speed = Math.max(window.innerWidth, 900) * (1.45 + Math.random() * .35);
    battle.bullets.push({ x: from.x, y: from.y, px: from.x, py: from.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, age: 0, ttl: .48, side });
    for (let i = 0; i < 2; i += 1) battle.casings.push({ x: from.x, y: from.y, vx: (side === 'friendly' ? -1 : 1) * (35 + Math.random() * 50), vy: -120 - Math.random() * 70, rot: Math.random() * 6, vr: 7 + Math.random() * 9, age: 0, ttl: 1.15 });
  }

  function burst(nx, ny, size = 1) {
    const p = point(nx, ny);
    for (let i = 0; i < 15 * size; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const v = 55 + Math.random() * 190 * size;
      battle.sparks.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, age: 0, ttl: .28 + Math.random() * .3, size: 1 + Math.random() * 3 });
    }
    for (let i = 0; i < 9 * size; i += 1) battle.dirt.push({ x: p.x, y: p.y, vx: (Math.random() - .5) * 210, vy: -85 - Math.random() * 180, age: 0, ttl: .8 + Math.random() * .6, size: 2 + Math.random() * 6 });
    for (let i = 0; i < 3 * size; i += 1) battle.smoke.push({ x: p.x, y: p.y, vx: (Math.random() - .5) * 22, vy: -18 - Math.random() * 22, age: 0, ttl: 1.8 + Math.random(), radius: 12 + Math.random() * 22 });
    intro.classList.remove('battle-shake');
    void intro.offsetWidth;
    intro.classList.add('battle-shake');
  }

  function throwGrenade() {
    const p = point(.82, .43);
    battle.grenades.push({ x: p.x, y: p.y, vx: -window.innerWidth * .23, vy: -window.innerHeight * .34, age: 0, ttl: 1.55, rot: 0 });
  }

  function actionClass(name, duration) {
    intro.classList.remove(name);
    void intro.offsetWidth;
    intro.classList.add(name);
    window.setTimeout(() => intro.classList.remove(name), duration);
  }

  function runBattleBeat() {
    if (!battleRunning || intro.hidden || intro.classList.contains('is-exiting')) return;
    actionClass('battle-sheep-fire', 720);
    tracer(.31, .765, .76, .59, 'friendly');
    window.setTimeout(() => tracer(.31, .765, .87, .67, 'friendly'), 125);

    window.setTimeout(() => {
      actionClass('battle-cashcat-fire', 760);
      tracer(.82, .705, .34, .62, 'enemy');
      window.setTimeout(() => tracer(.82, .705, .19, .74, 'enemy'), 145);
    }, 420);

    window.setTimeout(() => actionClass('battle-pepe-reload', 1450), 780);
    window.setTimeout(() => actionClass('battle-medic-work', 1800), 1080);
    window.setTimeout(() => { actionClass('battle-troll-throw', 1150); throwGrenade(); }, 1550);
    window.setTimeout(() => actionClass('battle-distant-run', 2300), 2050);
    window.setTimeout(() => burst(.55 + Math.random() * .15, .68 + Math.random() * .12, 1), 2550);
    window.setTimeout(() => {
      tracer(.12, .49, .78, .52, 'friendly');
      tracer(.88, .48, .35, .55, 'enemy');
    }, 3300);
  }

  function drawBattle(now) {
    if (!battleCanvas || !battleRunning) return;
    const ctx = battleCanvas.getContext('2d');
    const ratio = Number(battleCanvas.dataset.ratio || 1);
    const previous = Number(battleCanvas.dataset.time || now);
    const dt = Math.min((now - previous) / 1000, .04);
    battleCanvas.dataset.time = String(now);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    battle.bullets = battle.bullets.filter(b => {
      b.age += dt; b.px = b.x; b.py = b.y; b.x += b.vx * dt; b.y += b.vy * dt;
      const alpha = Math.max(0, 1 - b.age / b.ttl);
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = alpha;
      const grad = ctx.createLinearGradient(b.px, b.py, b.x, b.y);
      grad.addColorStop(0, 'rgba(255,120,28,0)'); grad.addColorStop(.55, '#ffc85b'); grad.addColorStop(1, '#fffbd0');
      ctx.strokeStyle = grad; ctx.lineWidth = 2.2; ctx.shadowColor = '#ff8a21'; ctx.shadowBlur = 13;
      ctx.beginPath(); ctx.moveTo(b.px, b.py); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
      if (b.age >= b.ttl) burst(b.x / window.innerWidth, b.y / window.innerHeight, .65);
      return b.age < b.ttl;
    });

    battle.grenades = battle.grenades.filter(g => {
      g.age += dt; g.vy += window.innerHeight * .72 * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.rot += dt * 12;
      ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.rot); ctx.fillStyle = '#26301c'; ctx.strokeStyle = '#d2b76c'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.roundRect(-7, -10, 14, 20, 4); ctx.fill(); ctx.stroke(); ctx.restore();
      if (g.age >= g.ttl) burst(g.x / window.innerWidth, g.y / window.innerHeight, 1.5);
      return g.age < g.ttl;
    });

    battle.casings = battle.casings.filter(c => {
      c.age += dt; c.vy += 390 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.rot += c.vr * dt;
      ctx.save(); ctx.globalAlpha = 1 - c.age / c.ttl; ctx.translate(c.x, c.y); ctx.rotate(c.rot); ctx.fillStyle = '#d7a84b'; ctx.fillRect(-1.5, -4, 3, 8); ctx.restore();
      return c.age < c.ttl;
    });

    battle.sparks = battle.sparks.filter(s => {
      s.age += dt; s.vy += 260 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 1 - s.age / s.ttl; ctx.fillStyle = '#ffd66d'; ctx.shadowColor = '#ff8424'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      return s.age < s.ttl;
    });

    battle.dirt = battle.dirt.filter(d => {
      d.age += dt; d.vy += 360 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
      ctx.save(); ctx.globalAlpha = Math.max(0, 1 - d.age / d.ttl); ctx.fillStyle = '#5a452d'; ctx.beginPath(); ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      return d.age < d.ttl;
    });

    battle.smoke = battle.smoke.filter(s => {
      s.age += dt; s.x += s.vx * dt; s.y += s.vy * dt; const progress = s.age / s.ttl;
      ctx.save(); ctx.globalAlpha = (1 - progress) * .18; ctx.fillStyle = '#4b463a'; ctx.filter = `blur(${5 + progress * 10}px)`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.radius * (1 + progress * 1.7), 0, Math.PI * 2); ctx.fill(); ctx.restore();
      return s.age < s.ttl;
    });
    battleFrame = window.requestAnimationFrame(drawBattle);
  }

  if (battleCanvas && battleRunning) {
    resizeBattleCanvas();
    window.addEventListener('resize', resizeBattleCanvas, { passive: true });
    runBattleBeat();
    battleBeatTimer = window.setInterval(runBattleBeat, 5200);
    battleFrame = window.requestAnimationFrame(drawBattle);
  }

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
    window.clearInterval(impactTimer);
    window.clearInterval(battleBeatTimer);
    window.cancelAnimationFrame(battleFrame);
    battleRunning = false;
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

  window.addEventListener('pagehide', () => {
    stopSound();
    battleRunning = false;
    window.clearInterval(battleBeatTimer);
    window.cancelAnimationFrame(battleFrame);
  }, { once: true });
})();
