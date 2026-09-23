/* MindSource: the Google tag is never requested before explicit opt-in. */
(() => {
  'use strict';
  const measurementId = 'G-X9RS343D0G';
  const storageKey = 'mindsource-analytics-consent-v1';
  const banner = document.getElementById('analytics-consent');
  const settings = document.getElementById('analytics-settings');
  const accept = document.getElementById('analytics-accept');
  const reject = document.getElementById('analytics-reject');
  if (!banner || !settings || !accept || !reject) return;

  function savedChoice() {
    try { return localStorage.getItem(storageKey); }
    catch { return null; }
  }

  function loadAnalytics() {
    if (document.getElementById('mindsource-google-tag')) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', measurementId);
    const script = document.createElement('script');
    script.id = 'mindsource-google-tag';
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    document.head.appendChild(script);
  }

  function choose(value) {
    try { localStorage.setItem(storageKey, value); }
    catch { /* A blocked storage API only prevents remembering the choice. */ }
    banner.hidden = true;
    if (value === 'accepted') loadAnalytics();
    else if (document.getElementById('mindsource-google-tag')) {
      // Reload to stop the already loaded tag after consent is withdrawn.
      window.location.reload();
    }
  }

  accept.addEventListener('click', () => choose('accepted'));
  reject.addEventListener('click', () => choose('rejected'));
  settings.addEventListener('click', () => {
    banner.hidden = false;
    reject.focus();
  });

  const choice = savedChoice();
  if (choice === 'accepted') loadAnalytics();
  else if (choice !== 'rejected') banner.hidden = false;
})();
