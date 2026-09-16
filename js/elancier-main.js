// ============================================================
// Elancier Solutions — site interactivity
// ============================================================

/* ---- Preloader hide (runs immediately, independent of DOMContentLoaded) ---- */
(function () {
  window.addEventListener('load', function () {
    var pre = document.querySelector('.preloader');
    if (pre) {
      setTimeout(function () {
        pre.classList.add('hide');
        setTimeout(function () { pre.remove(); }, 600);
      }, 150);
    }
  });
})();

document.addEventListener('DOMContentLoaded', function () {

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isFinePointer = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---- Mobile nav toggle ---- */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
      toggle.classList.toggle('open');
    });
    // mobile submenu open on tap
    document.querySelectorAll('.has-mega > a').forEach(function (a) {
      a.setAttribute('aria-expanded', window.innerWidth <= 1080 ? 'true' : 'false');
      a.addEventListener('click', function (e) {
        if (window.innerWidth <= 1080) {
          e.preventDefault();
          a.parentElement.classList.add('open');
          a.setAttribute('aria-expanded', 'true');
        }
      });
    });

    var bottomServices = document.querySelector('[data-services-menu]');
    var servicesItem = document.querySelector('.has-mega');
    if (bottomServices && servicesItem) {
      bottomServices.addEventListener('click', function (e) {
        if (window.innerWidth <= 1080) {
          e.preventDefault();
          links.classList.add('open');
          toggle.classList.add('open');
          servicesItem.classList.add('open');
          var servicesLink = servicesItem.querySelector(':scope > a');
          if (servicesLink) {
            servicesLink.setAttribute('aria-expanded', 'true');
            servicesLink.focus();
          }
        }
      });
    }
  }

  /* ---- Mark active nav link ----
     Handled server-side now (Blade sets the "active" class based on
     the current route), so no client-side URL matching is needed. ---- */

  /* ---- Mega menu: JS-controlled with close-delay so a real mouse path
     through the small gap between the nav link and the dropdown never
     drops the menu before the click lands. ---- */
  document.querySelectorAll('.has-mega').forEach(function (li) {
    var closeTimer;
    function openMega() { clearTimeout(closeTimer); li.classList.add('js-open'); }
    function scheduleClose() { closeTimer = setTimeout(function () { li.classList.remove('js-open'); }, 300); }
    li.addEventListener('mouseenter', openMega);
    li.addEventListener('mouseleave', scheduleClose);
    var mega = li.querySelector('.mega');
    if (mega) {
      mega.addEventListener('mouseenter', openMega);
      mega.addEventListener('mouseleave', scheduleClose);
    }
  });

  /* ---- Scroll progress bar ---- */
  var bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);
  window.addEventListener('scroll', function () {
    var h = document.documentElement;
    var pct = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
    bar.style.width = (pct || 0) + '%';
  });

  /* ---- Mouse tilt on .tilt cards ---- */
  if (window.matchMedia('(hover:hover)').matches) {
    document.querySelectorAll('.tilt').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', (px * 10) + 'deg');
        el.style.setProperty('--rx', (py * -10) + 'deg');
      });
      el.addEventListener('mouseleave', function () {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ---- Scroll reveal ---- */
  var revealEls = document.querySelectorAll('.reveal, .reveal-stagger, .pop-stagger');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---- Global SVG gradient defs (used by stat progress rings) ---- */
  if (!document.getElementById('statRingGrad')) {
    var svgDefs = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgDefs.setAttribute('width', '0');
    svgDefs.setAttribute('height', '0');
    svgDefs.style.position = 'absolute';
    svgDefs.innerHTML = '<defs><linearGradient id="statRingGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFD166"/><stop offset="100%" stop-color="#FF8FA3"/></linearGradient><linearGradient id="heroChartGrad" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#6366F1" stop-opacity="0.22"/><stop offset="100%" stop-color="#6366F1" stop-opacity="0"/></linearGradient></defs>';
    document.body.appendChild(svgDefs);
  }

  /* ---- Animated counters ---- */
  var counters = document.querySelectorAll('[data-count]');
  counters.forEach(function (el) {
    var digits = (el.getAttribute('data-count') || '').length;
    if (digits === 3) el.classList.add('digits-3');
    else if (digits >= 4) el.classList.add('digits-4');
  });
  if (counters.length && 'IntersectionObserver' in window) {
    var counted = new WeakSet();
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !counted.has(entry.target)) {
          counted.add(entry.target);
          animateCount(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { cio.observe(el); });
  }
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var dur = 1400, start = null;
    var ring = el.parentElement.querySelector('.stat-ring-bar');
    var circumference = 270;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.floor(eased * target);
      if (ring) ring.style.strokeDashoffset = circumference - (eased * circumference);
      if (p < 1) requestAnimationFrame(step);
      else {
        el.textContent = target;
        el.classList.add('count-pulse');
        if (ring) ring.style.strokeDashoffset = 0;
      }
    }
    requestAnimationFrame(step);
  }

  /* ---- Fade floating buttons while actively scrolling, to avoid
     them sitting solidly over content mid-scroll ---- */
  var floatBtns = ['.wa-float', '.qc-tab', '.to-top'];
  var scrollFadeTimer;
  window.addEventListener('scroll', function () {
    floatBtns.forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el) el.style.opacity = '0.35';
    });
    clearTimeout(scrollFadeTimer);
    scrollFadeTimer = setTimeout(function () {
      floatBtns.forEach(function (sel) {
        var el = document.querySelector(sel);
        if (el) el.style.opacity = '';
      });
    }, 220);
  }, { passive: true });

  /* ---- Sticky header shrink shadow ---- */
  var header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', function () {
      header.classList.toggle('scrolled', window.scrollY > 8);
    });
  }

  /* ---- Back to top ---- */
  var toTop = document.querySelector('.to-top');
  if (toTop) {
    window.addEventListener('scroll', function () {
      toTop.classList.toggle('show', window.scrollY > 500);
    });
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* ---- Portfolio filter (with smooth fade/scale reflow) ---- */
  var filterBtns = document.querySelectorAll('.pf-filters button');
  var pfCards = document.querySelectorAll('[data-cat]');
  if (filterBtns.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var f = btn.getAttribute('data-filter');
        // Step 1: fade out cards that no longer match (still in flow, so the
        // grid doesn't collapse yet — avoids a jarring empty gap mid-transition).
        pfCards.forEach(function (card) {
          var show = (f === 'all' || card.getAttribute('data-cat') === f);
          if (!show) card.classList.add('pf-hide');
        });
        // Step 2: once the fade-out is done, collapse hidden cards out of the
        // grid and fade the matching set into their newly-reflowed positions.
        setTimeout(function () {
          pfCards.forEach(function (card) {
            var show = (f === 'all' || card.getAttribute('data-cat') === f);
            if (show) {
              card.style.display = '';
              card.classList.add('pf-hide');
              requestAnimationFrame(function () {
                requestAnimationFrame(function () { card.classList.remove('pf-hide'); });
              });
            } else {
              card.style.display = 'none';
            }
          });
        }, 220);
      });
    });
  }

  /* ---- Gentle mouse parallax on hero floating cards ---- */
  var visual = document.querySelector('.hero-visual');
  if (visual && window.matchMedia('(hover:hover)').matches) {
    var cards = visual.querySelectorAll('.float-card');
    visual.addEventListener('mousemove', function (e) {
      var r = visual.getBoundingClientRect();
      var mx = (e.clientX - r.left) / r.width - 0.5;
      var my = (e.clientY - r.top) / r.height - 0.5;
      cards.forEach(function (c, i) {
        var depth = (i + 1) * 6;
        c.style.transform = 'translate(' + (mx * depth) + 'px,' + (my * depth) + 'px)';
      });
    });
    visual.addEventListener('mouseleave', function () {
      cards.forEach(function (c) { c.style.transform = ''; });
    });
  }

  /* ---- Confetti burst + animated checkmark for form success ---- */
  function burstConfetti(x, y) {
    var colors = ['#6366F1', '#FB7185', '#2DD4BF', '#F5A623', '#F0A6D8'];
    for (var i = 0; i < 22; i++) {
      var el = document.createElement('div');
      el.className = 'confetti-piece';
      var angle = Math.random() * Math.PI * 2;
      var dist = 55 + Math.random() * 75;
      var tx = Math.cos(angle) * dist;
      var ty = Math.sin(angle) * dist - 35;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.background = colors[i % colors.length];
      el.style.setProperty('--tx', tx + 'px');
      el.style.setProperty('--ty', ty + 'px');
      el.style.setProperty('--rot', (Math.random() * 360) + 'deg');
      document.body.appendChild(el);
      (function (elem) { setTimeout(function () { elem.remove(); }, 950); })(el);
    }
  }
  function showFormSuccess(form, msg) {
    if (!msg) return;
    var text = msg.textContent.trim();
    msg.textContent = '';
    var wrap = document.createElement('div');
    wrap.className = 'form-success-anim';
    wrap.innerHTML = '<svg class="form-success-check" viewBox="0 0 60 60"><circle cx="30" cy="30" r="24"/><path d="M18 31l8 8 16-18"/></svg>';
    var span = document.createElement('span');
    span.textContent = text;
    wrap.appendChild(span);
    msg.appendChild(wrap);
    msg.style.display = 'block';
    if (!prefersReducedMotion) {
      var btn = form.querySelector('button[type="submit"]');
      var r = (btn || form).getBoundingClientRect();
      burstConfetti(r.left + r.width / 2, r.top + r.height / 2);
    }
  }

  /* ---- Contact / career page success celebration ----
     The contact.blade.php / careers.blade.php forms now do a real
     server POST + redirect (see FrontendController). When the
     redirected-to page renders with a success flag, Blade renders
     the confirmation text itself (so it still works with JS off);
     this only adds a checkmark + confetti flourish on top of that
     already-genuine, server-confirmed success state. ---- */
  ['contact-success-trigger', 'career-success-trigger'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    var check = document.createElement('div');
    check.innerHTML = '<svg class="form-success-check" viewBox="0 0 60 60"><circle cx="30" cy="30" r="24"/><path d="M18 31l8 8 16-18"/></svg>';
    el.insertBefore(check.firstChild, el.firstChild);
    if (!prefersReducedMotion) {
      var r = el.getBoundingClientRect();
      burstConfetti(r.left + r.width / 2, r.top + 40);
    }
  });

  /* ---- Custom magnetic cursor (desktop only) ---- */
  if (isFinePointer && !prefersReducedMotion) {
    document.body.classList.add('has-custom-cursor');
    var dot = document.createElement('div'); dot.className = 'cursor-dot';
    var ring = document.createElement('div'); ring.className = 'cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);
    var mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my;
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
    });
    (function ringLoop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
      requestAnimationFrame(ringLoop);
    })();
    document.addEventListener('mouseover', function (e) {
      var target = e.target.closest('a, button, .tilt, .chip, input, textarea, select');
      if (target) {
        ring.classList.add('hovering');
        ring.classList.toggle('hovering-dark', !!target.closest('.hero, .page-hero, .cta-band, .site-footer'));
      }
    });
    document.addEventListener('mouseout', function (e) {
      var target = e.target.closest('a, button, .tilt, .chip, input, textarea, select');
      if (target) { ring.classList.remove('hovering'); ring.classList.remove('hovering-dark'); }
    });
    document.addEventListener('mouseleave', function () { dot.style.opacity = '0'; ring.style.opacity = '0'; });
    document.addEventListener('mouseenter', function () { dot.style.opacity = '1'; ring.style.opacity = '1'; });
  }

  /* ---- Word-by-word heading reveal ----
     Builds the word-span wrapper via safe DOM APIs (createElement +
     textContent) rather than innerHTML, so heading text that comes
     from the admin panel can never be re-parsed as HTML here. ---- */
  if (!prefersReducedMotion) {
    document.querySelectorAll('.head-block h2').forEach(function (h) {
      var words = h.textContent.trim().split(/\s+/);
      h.textContent = '';
      words.forEach(function (w, i) {
        var span = document.createElement('span');
        span.className = 'word';
        span.style.transitionDelay = Math.min(i * 0.045, 0.5) + 's';
        span.append(document.createTextNode(w), document.createTextNode('\u00A0'));
        h.appendChild(span);
      });
      h.classList.add('word-reveal');
    });
    var wordEls = document.querySelectorAll('.word-reveal');
    if ('IntersectionObserver' in window && wordEls.length) {
      var wio = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            wio.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      wordEls.forEach(function (el) { wio.observe(el); });
    } else {
      wordEls.forEach(function (el) { el.classList.add('is-visible'); });
    }
  }

  /* ---- Image curtain-wipe reveal ---- */
  var curtainEls = document.querySelectorAll('.img-col, .pf-img');
  if ('IntersectionObserver' in window && curtainEls.length) {
    var cwio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          cwio.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    curtainEls.forEach(function (el) { cwio.observe(el); });
  } else {
    curtainEls.forEach(function (el) { el.classList.add('revealed'); });
  }

  /* ---- Magnetic buttons ---- */
  if (isFinePointer) {
    document.querySelectorAll('.btn').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var r = btn.getBoundingClientRect();
        var mx2 = (e.clientX - r.left) / r.width - 0.5;
        var my2 = (e.clientY - r.top) / r.height - 0.5;
        btn.style.transform = 'translate(' + (mx2 * 14) + 'px,' + (my2 * 10 - 2) + 'px)';
      });
      btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
    });
  }

  /* ---- Hero parallax blobs ---- */
  var heroEl = document.querySelector('.hero');
  if (heroEl && !prefersReducedMotion) {
    window.addEventListener('scroll', function () {
      var y = Math.min(window.scrollY, 500);
      heroEl.style.setProperty('--parallax-a', (y * 0.22) + 'px');
      heroEl.style.setProperty('--parallax-b', (y * -0.15) + 'px');
    });
  }

  /* ---- Hero product-panel: animated bar fills + mouse-parallax tilt ---- */
  document.querySelectorAll('.hero-bar-fill').forEach(function (el) {
    var pct = el.getAttribute('data-fill') || '0';
    el.style.setProperty('--fillw', pct + '%');
  });
  var heroPanel = document.querySelector('.hero-panel');
  if (heroPanel) {
    setTimeout(function () {
      document.querySelectorAll('.hero-bar-fill').forEach(function (el) {
        el.classList.add('in-view');
      });
    }, 1000);
    if (isFinePointer && !prefersReducedMotion) {
      var heroVisualWrap = document.querySelector('.hero-visual');
      heroVisualWrap.addEventListener('mousemove', function (e) {
        var r = heroVisualWrap.getBoundingClientRect();
        var mx = (e.clientX - r.left) / r.width - 0.5;
        var my = (e.clientY - r.top) / r.height - 0.5;
        heroPanel.style.transform = 'rotateY(' + (mx * 8) + 'deg) rotateX(' + (my * -8) + 'deg)';
      });
      heroVisualWrap.addEventListener('mouseleave', function () {
        heroPanel.style.transform = '';
      });
    }
  }

  /* ---- Smooth page-transition (fade wipe on internal navigation) ---- */
  var exitOverlay = document.createElement('div');
  exitOverlay.className = 'page-exit-overlay';
  exitOverlay.innerHTML = '<div class="page-exit-mark"><img src="' + (window.ELANCIER_ASSET_BASE || '') + '/images/favicon.png" alt="Elancier"></div>';
  document.body.appendChild(exitOverlay);
  if (!prefersReducedMotion) {
    document.querySelectorAll('a[href]').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#') return;
      if (href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
      // Laravel's route() helper returns full absolute URLs, so an
      // internal link now legitimately starts with "http" too — only
      // treat it as "external" if it points at a different host.
      if (/^https?:\/\//i.test(href)) {
        try {
          if (new URL(href, window.location.href).host !== window.location.host) return;
        } catch (err) { return; }
      }
      if (a.target === '_blank') return;
      a.addEventListener('click', function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        // On mobile, the "Services" trigger link toggles the submenu instead of navigating — skip transition there.
        if (a.parentElement && a.parentElement.classList.contains('has-mega') && window.innerWidth <= 1080) return;
        e.preventDefault();
        exitOverlay.classList.add('show');
        setTimeout(function () { window.location.href = href; }, 360);
      });
    });
  }

  /* ---- Image skeleton-loading shimmer ---- */
  document.querySelectorAll('img').forEach(function (img) {
    if (img.closest('.preloader') || img.closest('.page-exit-overlay')) return;
    if (img.complete && img.naturalWidth > 0) return;
    var parent = img.parentElement;
    img.classList.add('img-loading');
    if (parent) parent.classList.add('shimmer-loading');
    function reveal() {
      img.classList.remove('img-loading');
      if (parent) parent.classList.remove('shimmer-loading');
    }
    img.addEventListener('load', reveal, { once: true });
    img.addEventListener('error', reveal, { once: true });
  });

  /* ---- Sticky quick-contact tab ---- */
  if (!document.querySelector('.qc-tab')) {
    var settings = window.ELANCIER_SETTINGS || {};
    var qcOverlay = document.createElement('div');
    qcOverlay.className = 'qc-overlay';
    var qcTab = document.createElement('button');
    qcTab.className = 'qc-tab';
    qcTab.textContent = 'Quick Contact';
    var qcPanel = document.createElement('div');
    qcPanel.className = 'qc-panel';
    // Static skeleton only — no admin/user-supplied values are ever
    // interpolated into this HTML string. Dynamic values (phone,
    // email, WhatsApp link) are assigned afterwards via safe DOM
    // properties (.href / .textContent), never re-parsed as HTML.
    qcPanel.innerHTML =
      '<div class="qc-panel-head"><h4>Quick contact</h4><button class="qc-close" aria-label="Close">&times;</button></div>' +
      '<div class="qc-panel-body">' +
      '<div class="qc-quick-links">' +
      '<a class="qc-link-call"><span class="qic">&#128222;</span>Call</a>' +
      '<a class="qc-link-email"><span class="qic">&#9993;</span>Email</a>' +
      '<a class="qc-link-whatsapp" target="_blank" rel="noopener"><span class="qic">&#128172;</span>WhatsApp</a>' +
      '</div>' +
      '<form id="qc-form">' +
      '<div style="position:absolute;left:-9999px" aria-hidden="true"><label>Leave this field blank</label><input type="text" name="website" tabindex="-1" autocomplete="off"></div>' +
      '<div class="field" style="margin-bottom:14px"><label>Full name</label><input type="text" name="full_name" required></div>' +
      '<div class="field" style="margin-bottom:14px"><label>Email address</label><input type="email" name="email" required></div>' +
      '<div class="field" style="margin-bottom:16px"><label>Message</label><textarea name="message" placeholder="Tell us about your project..." style="min-height:90px"></textarea></div>' +
      '<p class="qc-form-error" style="display:none;margin-bottom:12px;color:var(--coral);font-weight:600;font-size:.85rem"></p>' +
      '<button type="submit" class="btn btn-primary" style="width:100%;justify-content:center">Send message <span class="arrow">&rarr;</span></button>' +
      '<p class="form-success" style="display:none;margin-top:14px;color:var(--teal);font-weight:600">Thanks &mdash; we will be in touch soon.</p>' +
      '</form>' +
      '</div>';

    var callLink = qcPanel.querySelector('.qc-link-call');
    var emailLink = qcPanel.querySelector('.qc-link-email');
    var waLink = qcPanel.querySelector('.qc-link-whatsapp');
    if (settings.phone) { callLink.href = 'tel:' + settings.phone.replace(/[^\d+]/g, ''); } else { callLink.style.display = 'none'; }
    if (settings.email) { emailLink.href = 'mailto:' + settings.email; } else { emailLink.style.display = 'none'; }
    if (settings.whatsappLink) { waLink.href = settings.whatsappLink; } else { waLink.style.display = 'none'; }

    document.body.appendChild(qcOverlay);
    document.body.appendChild(qcTab);
    document.body.appendChild(qcPanel);
    function openQc() { qcPanel.classList.add('open'); qcOverlay.classList.add('open'); }
    function closeQc() { qcPanel.classList.remove('open'); qcOverlay.classList.remove('open'); }
    qcTab.addEventListener('click', openQc);
    qcOverlay.addEventListener('click', closeQc);
    qcPanel.querySelector('.qc-close').addEventListener('click', closeQc);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeQc(); });

    /* ---- Real, server-confirmed submission for the quick-contact
       form. This one widget appears on every page (not a dedicated
       page to redirect back to in a friendly way), so it uses a
       same-origin fetch() POST rather than a full-page form submit —
       success is shown only after the server actually responds 2xx;
       any failure re-enables the form and shows the real error. ---- */
    var qcForm = qcPanel.querySelector('#qc-form');
    if (qcForm) {
      var qcSubmitting = false;
      qcForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (qcSubmitting) return; // guards against double-submit (e.g. double-click)
        qcSubmitting = true;

        var btn = qcForm.querySelector('button[type="submit"]');
        var errEl = qcForm.querySelector('.qc-form-error');
        var msg = qcForm.querySelector('.form-success');
        errEl.style.display = 'none';
        var originalBtnText = btn.innerHTML;
        btn.disabled = true;
        btn.textContent = 'Sending...';

        var tokenMeta = document.querySelector('meta[name="csrf-token"]');
        var formData = new FormData(qcForm);
        formData.append('source', 'quick_contact');

        fetch(qcForm.getAttribute('data-action') || window.ELANCIER_CONTACT_URL, {
          method: 'POST',
          headers: {
            'X-CSRF-TOKEN': tokenMeta ? tokenMeta.getAttribute('content') : '',
            'Accept': 'application/json',
          },
          body: formData,
        }).then(function (response) {
          if (response.ok) {
            qcForm.querySelectorAll('input,textarea').forEach(function (f) { f.disabled = true; });
            btn.style.display = 'none';
            showFormSuccess(qcForm, msg);
          } else if (response.status === 422) {
            return response.json().then(function (data) {
              var firstError = data && data.errors ? Object.values(data.errors)[0][0] : 'Please check the form and try again.';
              errEl.textContent = firstError;
              errEl.style.display = 'block';
              btn.disabled = false;
              btn.innerHTML = originalBtnText;
            });
          } else {
            throw new Error('Server error');
          }
        }).catch(function () {
          errEl.textContent = 'Something went wrong sending your message. Please try again, or use the call/email links above.';
          errEl.style.display = 'block';
          btn.disabled = false;
          btn.innerHTML = originalBtnText;
        }).finally(function () {
          qcSubmitting = false;
        });
      });
    }
  }

  /* ---- Floating WhatsApp button (all pages) ---- */
  if (!document.querySelector('.wa-float') && window.ELANCIER_SETTINGS && window.ELANCIER_SETTINGS.whatsappLink) {
    var waBtn = document.createElement('a');
    waBtn.href = window.ELANCIER_SETTINGS.whatsappLink;
    waBtn.target = '_blank';
    waBtn.rel = 'noopener';
    waBtn.className = 'wa-float';
    waBtn.setAttribute('aria-label', 'Chat on WhatsApp');
    waBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17.5 14.4c-.3-.1-1.7-.9-2-1-.3-.1-.5-.1-.7.1s-.8 1-.9 1.2c-.2.2-.3.2-.6.1s-1.4-.5-2.6-1.6c-1-.9-1.6-2-1.8-2.3-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.5.1-.2 0-.4 0-.5C10.5 8.7 10 7.4 9.8 7c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.2-.9.9-.9 2.2s1 2.6 1.1 2.8c.1.2 2 3 4.8 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.5-.3zM12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.7 1.5 5.2L2 22l4.9-1.3C8.4 21.5 10.2 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2z"/></svg>';
    document.body.appendChild(waBtn);
  }

  /* ---- Testimonial auto-carousel ---- */
  var testiTrack = document.querySelector('.testi-track');
  if (testiTrack) {
    var testiSlides = testiTrack.querySelectorAll('.testi-card');
    var testiDots = document.querySelectorAll('.testi-dot');
    var testiIndex = 0;
    var testiTimer;
    function goToTesti(i) {
      testiIndex = (i + testiSlides.length) % testiSlides.length;
      testiTrack.style.transform = 'translateX(-' + (testiIndex * 100) + '%)';
      testiDots.forEach(function (d, di) { d.classList.toggle('active', di === testiIndex); });
    }
    function startTestiAuto() {
      clearInterval(testiTimer);
      if (prefersReducedMotion) return;
      testiTimer = setInterval(function () { goToTesti(testiIndex + 1); }, 5000);
    }
    testiDots.forEach(function (dot, i) {
      dot.addEventListener('click', function () { goToTesti(i); startTestiAuto(); });
    });
    var testiWrap = document.querySelector('.testi-carousel-wrap');
    testiWrap.addEventListener('mouseenter', function () { clearInterval(testiTimer); });
    testiWrap.addEventListener('mouseleave', startTestiAuto);
    startTestiAuto();
  }

  /* ---- Portfolio lightbox ---- */
  var pfImages = document.querySelectorAll('.pf-img img');
  if (pfImages.length) {
    var lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = '<button class="lightbox-close" aria-label="Close">&times;</button><img src="" alt=""><div class="lightbox-cap"></div>';
    document.body.appendChild(lightbox);
    var lbImg = lightbox.querySelector('img');
    var lbCap = lightbox.querySelector('.lightbox-cap');
    function openLightbox(src, alt) {
      lbImg.src = src; lbImg.alt = alt; lbCap.textContent = alt;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeLightbox() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    }
    pfImages.forEach(function (img) {
      img.addEventListener('click', function () { openLightbox(img.src, img.alt); });
    });
    lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLightbox(); });
  }

  /* ---- FAQ accordion ---- */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    if (q) {
      q.addEventListener('click', function () {
        var wasOpen = item.classList.contains('open');
        document.querySelectorAll('.faq-item.open').forEach(function (el) { el.classList.remove('open'); });
        if (!wasOpen) item.classList.add('open');
      });
    }
  });

});
