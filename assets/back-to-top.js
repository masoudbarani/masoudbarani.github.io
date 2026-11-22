/* Footer-only back-to-top control shared by current and CMS-generated pages. */
(() => {
  'use strict';

  const button = document.querySelector('.site-footer .back-to-top');
  if (!button) return;

  button.addEventListener('click', () => {
    const reduceMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
})();
