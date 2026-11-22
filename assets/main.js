/* NextBlade website behaviour */
(function () {
  'use strict';

  // ---- Configuration -------------------------------------------------------
  // Paste your form endpoint here (e.g. https://formspree.io/f/abcd1234).
  // While it is empty, the form does NOT pretend to register anyone: it opens
  // the visitor's email app with the details pre-filled instead.
  var FORM_ENDPOINT = 'https://formspree.io/f/mppdoaaq';
  var CONTACT_EMAIL = 'hello@nextblade.app';

  var CS = (document.documentElement.lang || 'en').indexOf('cs') === 0;
  var T = function (en, cs) { return CS ? cs : en; };

  // ---- Header + mobile navigation -----------------------------------------
  var header = document.getElementById('header');
  var onScroll = function () { header.classList.toggle('scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  var menuBtn = document.querySelector('.menu-btn');
  var links = document.getElementById('nav-links');
  function setMenu(open) {
    links.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? T('Close menu', 'Zavřít menu') : T('Open menu', 'Otevřít menu'));
  }
  menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
  links.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && links.classList.contains('open')) { setMenu(false); menuBtn.focus(); } });

  // ---- Scroll reveal --------------------------------------------------------
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = document.querySelectorAll('.reveal');
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  // ---- Feature tabs (WAI-ARIA tabs pattern) --------------------------------
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = !on;
      panel.classList.toggle('active', on);
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t, false); });
    t.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); selectTab(next, true); }
    });
  });

  // ---- Beta form -----------------------------------------------------------
  var form = document.getElementById('beta-form');
  if (!form) return;
  var submitBtn = document.getElementById('beta-submit');
  var statusEl = document.getElementById('form-status');
  var MSG = CS ? {
    required: 'Vyplňte prosím toto pole.',
    select: 'Vyberte prosím jednu možnost.',
    email: 'Zadejte prosím platnou e-mailovou adresu.',
    consent: 'Potvrďte prosím souhlas, abychom vás mohli kontaktovat ohledně bety.',
    sending: 'Odesílám…',
    submit: 'Požádat o pozvánku',
    ok: 'Děkujeme! Jste na seznamu. Až bude vaše pozvánka připravená, napíšeme vám.',
    dup: 'Z tohoto prohlížeče už jste o pozvánku požádali. Děkujeme!',
    mailto: 'Otevřeli jsme vám e-mail s vyplněnými údaji, stačí ho odeslat. Pokud se nic neotevřelo, napište nám na ' + CONTACT_EMAIL + '.',
    fail: 'Něco se nepovedlo a žádost se neodeslala. Zkuste to prosím znovu, nebo nám napište na ' + CONTACT_EMAIL + '.',
    subject: 'Žádost o betu NextBlade'
  } : {
    required: 'Please fill in this field.',
    select: 'Please choose an option.',
    email: 'Please enter a valid email address.',
    consent: 'Please confirm so we can contact you about the beta.',
    sending: 'Sending…',
    submit: 'Request an invite',
    ok: 'Thank you! You’re on the list. We’ll email you when your invitation is ready.',
    dup: 'You’ve already requested an invite from this browser. Thank you!',
    mailto: 'We’ve opened your email app with your details filled in. Just press send. If nothing opened, email us at ' + CONTACT_EMAIL + '.',
    fail: 'Something went wrong and your request was not sent. Please try again, or email us at ' + CONTACT_EMAIL + '.',
    subject: 'NextBlade beta request'
  };

  function showStatus(kind, text) {
    statusEl.className = 'form-status show ' + kind;
    statusEl.textContent = text;
  }
  function setError(input, text) {
    var err = document.getElementById(input.getAttribute('aria-describedby'));
    input.setAttribute('aria-invalid', text ? 'true' : 'false');
    if (err) err.textContent = text || '';
  }
  function validate() {
    var firstBad = null;
    form.querySelectorAll('[required]').forEach(function (el) {
      var msg = '';
      if (el.type === 'checkbox') { if (!el.checked) msg = MSG.consent; }
      else if (!el.value.trim()) msg = el.tagName === 'SELECT' ? MSG.select : MSG.required;
      else if (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim())) msg = MSG.email;
      setError(el, msg);
      if (msg && !firstBad) firstBad = el;
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }
  form.querySelectorAll('[required]').forEach(function (el) {
    el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'blur', function () {
      if (el.getAttribute('aria-invalid') === 'true') validate();
    });
  });

  function alreadySent(email) {
    try { return localStorage.getItem('nb-beta') === email.toLowerCase(); } catch (e) { return false; }
  }
  function remember(email) {
    try { localStorage.setItem('nb-beta', email.toLowerCase()); } catch (e) { /* storage unavailable */ }
  }

  var busy = false;
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (busy) return;
    if (form._gotcha && form._gotcha.value) return; // bot
    if (!validate()) return;

    var data = new FormData(form);
    data.append('language', CS ? 'cs' : 'en');
    var email = String(data.get('email')).trim();
    if (alreadySent(email)) { showStatus('ok', MSG.dup); return; }

    if (!FORM_ENDPOINT) {
      var lines = ['name', 'email', 'specialty', 'career_stage', 'country', 'feedback'].map(function (k) { return k + ': ' + (data.get(k) || ''); });
      lines.push('language: ' + (CS ? 'cs' : 'en'));
      lines.push('product news: ' + (data.get('marketing_consent') ? 'yes' : 'no'));
      showStatus('info', MSG.mailto);
      var a = document.createElement('a');
      a.href = 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent(MSG.subject) + '&body=' + encodeURIComponent(lines.join('\n'));
      a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
      return;
    }

    busy = true; submitBtn.disabled = true; submitBtn.textContent = MSG.sending;
    fetch(FORM_ENDPOINT, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        remember(email); form.reset(); showStatus('ok', MSG.ok);
      })
      .catch(function () { showStatus('error', MSG.fail); })
      .then(function () { busy = false; submitBtn.disabled = false; submitBtn.textContent = MSG.submit; });
  });
})();
