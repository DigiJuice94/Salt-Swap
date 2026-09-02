/* V1.11.99 — entrance hotspot, hover glow, and localized lantern flicker */
(() => {
  const intro = document.getElementById('trenchesIntro');
  const enter = document.getElementById('trenchesIntroEnter');
  if (!intro || !enter) return;

  let exiting = false;

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

  function enterTheTrenches() {
    if (exiting) return;
    exiting = true;
    stopLightFlicker();
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
})();
