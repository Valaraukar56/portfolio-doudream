// ─────────────────────────────────────────────────────────────────────────────
// portfolio-script.js  —  DouDream portfolio, animation layer
// ─────────────────────────────────────────────────────────────────────────────

// ── Loader (skip after first visit this session) ─────────────────────────────
const loader = document.getElementById('loader');
const seenLoader = sessionStorage.getItem('doudream:seenLoader');
window.addEventListener('load', () => {
  // First visit: wait for logo + line + sub animations to fully play (~1.5s),
  // then hold 400ms so the user actually registers it. Subsequent: quick skip.
  const delay = seenLoader ? 200 : 2300;
  setTimeout(() => {
    loader.classList.add('loader--out');
    loader.addEventListener('transitionend', () => loader.remove(), { once: true });
    sessionStorage.setItem('doudream:seenLoader', '1');
  }, delay);
});

// ── Hero title letter stagger ────────────────────────────────────────────────
// Wrap each visible glyph in a span.char and stagger their reveal.
(function splitHeroTitle() {
  const title = document.querySelector('.hero__title');
  if (!title) return;
  // Walk children: text nodes + <em>s. Each glyph → span.char.
  const staggerBase = 0.7; // seconds — lands after hero cascade starts
  const step = 0.045;
  let idx = 0;
  const wrapText = (text) => {
    const frag = document.createDocumentFragment();
    for (const ch of text) {
      if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); continue; }
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = ch;
      span.style.animationDelay = `${staggerBase + idx * step}s`;
      frag.appendChild(span);
      idx++;
    }
    return frag;
  };
  [...title.childNodes].forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      title.replaceChild(wrapText(node.textContent), node);
    } else if (node.nodeName === 'EM') {
      const em = document.createElement('em');
      em.appendChild(wrapText(node.textContent));
      title.replaceChild(em, node);
    }
  });
})();

// ── Magnetic buttons ─────────────────────────────────────────────────────────
// CTA-style buttons drift slightly toward the cursor when hovered.
document.querySelectorAll('.hero__cta').forEach(btn => {
  const strength = 0.25;
  btn.addEventListener('mousemove', (e) => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - (rect.left + rect.width / 2);
    const y = e.clientY - (rect.top + rect.height / 2);
    btn.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
  });
});

// ── Scroll progress bar ───────────────────────────────────────────────────────
const progressBar = document.getElementById('scroll-progress');
window.addEventListener('scroll', () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progressBar.style.transform = `scaleX(${window.scrollY / max})`;
}, { passive: true });

// ── Nav scroll + active section ───────────────────────────────────────────────
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);

  // Active nav link
  const sections = ['portfolio', 'apropos', 'contact'];
  let current = '';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 120) current = id;
  });
  document.querySelectorAll('.nav__links a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + current);
  });
}, { passive: true });

// Burger menu
const burger = document.querySelector('.nav__burger');
burger?.addEventListener('click', () => {
  nav.classList.toggle('nav--open');
  burger.classList.toggle('nav__burger--active');
});
document.querySelectorAll('.nav__links a').forEach(a => {
  a.addEventListener('click', () => {
    nav.classList.remove('nav--open');
    burger?.classList.remove('nav__burger--active');
  });
});

// ── Hero parallax glow ────────────────────────────────────────────────────────
const heroGlow = document.getElementById('hero-glow');
document.addEventListener('mousemove', (e) => {
  if (!heroGlow) return;
  const x = (e.clientX / window.innerWidth)  * 100;
  const y = (e.clientY / window.innerHeight) * 100;
  heroGlow.style.background = `
    radial-gradient(circle at ${x}% ${y}%, rgba(229,184,122,0.11) 0%, transparent 55%),
    radial-gradient(circle at ${100 - x}% ${100 - y}%, rgba(229,184,122,0.06) 0%, transparent 50%)
  `;
});

// ── IntersectionObserver — reveal on scroll ───────────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ── Counter animation ─────────────────────────────────────────────────────────
function animateCounter(el, target, duration = 1400) {
  const start = performance.now();
  const isYear = String(target).includes('→');
  const num = parseInt(target);
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const val = Math.round(ease * num);
    el.textContent = isYear ? val + ' →' : val;
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const counters = entry.target.querySelectorAll('[data-count]');
      counters.forEach(c => animateCounter(c, c.dataset.count));
      statsObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

const statsEl = document.querySelector('.hero__stats');
if (statsEl) statsObserver.observe(statsEl);

// ── Projects / grid ───────────────────────────────────────────────────────────
let allProjects = [];
let currentList = [];
let currentIdx  = 0;

async function init() {
  // Try inline JSON first (fast path — no network round-trip)
  const inline = document.getElementById('projects-data');
  if (inline) {
    allProjects = JSON.parse(inline.textContent);
  } else {
    const res = await fetch('projects.json');
    allProjects = await res.json();
  }
  applyAutoSizing();
  updateCounts();
  renderGrid('all');
}

function applyAutoSizing() {
  const portraits = allProjects
    .filter(p => p.category === 'Portraits')
    .sort((a, b) => b.id - a.id);
  const cutoff = Math.floor(portraits.length * 0.66);
  portraits.forEach((p, i) => {
    if (!p.size && i >= cutoff) p.size = 'small';
  });
}

function updateCounts() {
  const counts = { all: allProjects.length };
  for (const p of allProjects) counts[p.category] = (counts[p.category] || 0) + 1;
  for (const [cat, n] of Object.entries(counts)) {
    const el = document.getElementById('count-' + cat);
    if (el) el.textContent = n;
  }
  // Filter widths just changed — re-align the pill
  requestAnimationFrame(positionPill);
}

const ROW_HEIGHT = 8;
const GAP = 16;

// Viewport-derived grid width — no DOM read, zero forced reflow.
// Mirrors .portfolio { padding: 7rem 4vw; max-width: 1600px }.
function estimateGridWidth() {
  const vw = window.innerWidth;
  const padding = Math.round(vw * 0.04) * 2;
  return Math.min(vw - padding, 1600 - padding);
}

// Mirrors the CSS media queries to know col count + card span by viewport.
function gridSpec(size) {
  const vw = window.innerWidth;
  let totalCols, spans;
  if (vw <= 640)       { totalCols = 6; spans = { small: 3, normal: 3, large: 5 }; }
  else if (vw <= 900)  { totalCols = 4; spans = { small: 2, normal: 2, large: 3 }; }
  else if (vw <= 1200) { totalCols = 6; spans = { small: 2, normal: 3, large: 6 }; }
  else                 { totalCols = 12; spans = { small: 2, normal: 3, large: 6 }; }
  return { totalCols, cardSpan: spans[size] || spans.normal };
}

function computeSpan(aspectRatio, size, gridW) {
  const { totalCols, cardSpan } = gridSpec(size);
  const colW = (gridW - (totalCols - 1) * GAP) / totalCols;
  const cardW = cardSpan * colW + (cardSpan - 1) * GAP;
  const height = cardW * aspectRatio;
  return Math.ceil((height + GAP) / (ROW_HEIGHT + GAP));
}

function setRowSpan(art) {
  // Fallback path for items without known dimensions — wait for image load.
  const img = art.querySelector('img');
  if (!img || !img.naturalWidth) return;
  const ratio = parseFloat(art.dataset.aspect) || (img.naturalHeight / img.naturalWidth);
  if (!ratio) return;
  const size = art.classList.contains('art--small') ? 'small'
             : art.classList.contains('art--large') ? 'large' : 'normal';
  art.style.gridRow = `span ${computeSpan(ratio, size, estimateGridWidth())}`;
}

const cardObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('art--visible');
      cardObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.05, rootMargin: '0px 0px -30px 0px' });

function renderGrid(cat, animate = true) {
  const grid = document.getElementById('grid');

  if (animate && grid.children.length > 0) {
    // Fade out existing
    [...grid.children].forEach((c, i) => {
      c.style.transition = `opacity 0.25s ease ${i * 8}ms, transform 0.25s ease ${i * 8}ms`;
      c.style.opacity = '0';
      c.style.transform = 'scale(0.94)';
    });
    setTimeout(() => buildGrid(cat), 280);
  } else {
    buildGrid(cat);
  }
}

function buildGrid(cat) {
  const grid = document.getElementById('grid');
  currentList = cat === 'all' ? allProjects : allProjects.filter(p => p.category === cat);

  // Pure viewport math — zero DOM geometry reads.
  const gridW = estimateGridWidth();
  const DEFAULT_SPANS = { small: 20, normal: 35, large: 55 };
  const frag = document.createDocumentFragment();

  currentList.forEach((p, i) => {
    const art = document.createElement('div');
    const size = p.size || 'normal';
    art.className = `art art--${size}`;
    art.dataset.idx = i;
    art.style.setProperty('--delay', `${(i % 12) * 40}ms`);

    // Span computed from known aspect — no image load wait, no rect read.
    let span;
    if (p.w && p.h && gridW) {
      art.dataset.aspect = (p.h / p.w).toFixed(4);
      span = computeSpan(p.h / p.w, size, gridW);
    } else {
      span = DEFAULT_SPANS[size];
    }
    art.style.gridRow = `span ${span}`;

    const base = p.file.replace(/\.webp$/, '');
    const small = `assets/images/${base}-800.webp`;
    const large = `assets/images/${p.file}`;
    const dims = (p.w && p.h) ? ` width="${p.w}" height="${p.h}"` : '';
    art.innerHTML = `
      <img src="${small}" srcset="${small} 800w, ${large} 1600w" sizes="(max-width:600px) 50vw, (max-width:1100px) 33vw, 25vw" alt="${escapeHtml(p.title)}" loading="lazy" decoding="async"${dims} />
      <div class="art__overlay">
        <div class="art__info">
          <strong>${escapeHtml(p.title || 'Sans titre')}</strong>
          <span>${prettyCat(p.category)}</span>
        </div>
      </div>
      <div class="art__shine"></div>
    `;

    art.addEventListener('click', () => openLightbox(i, art));
    // Safety fallback: only bind onload if dimensions unknown.
    if (!(p.w && p.h)) {
      art.querySelector('img').addEventListener('load', () => setRowSpan(art));
    }
    cardObserver.observe(art);
    frag.appendChild(art);
  });

  // Single DOM insertion — one layout pass for the whole grid.
  grid.replaceChildren(frag);
}

// Recompute all spans from viewport math only — no DOM reads.
function setAllRowSpans() {
  const gridW = estimateGridWidth();
  if (!gridW) return;
  const arts = document.querySelectorAll('.art');
  for (const art of arts) {
    const ratio = parseFloat(art.dataset.aspect);
    if (!ratio) continue;
    const size = art.classList.contains('art--small') ? 'small'
               : art.classList.contains('art--large') ? 'large' : 'normal';
    art.style.gridRow = `span ${computeSpan(ratio, size, gridW)}`;
  }
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(setAllRowSpans, 150);
}, { passive: true });

function prettyCat(c) {
  return { Portraits: 'Portrait', Paysages: 'Paysage', CreationPaysages: 'Création paysage', Divers: 'Création HD' }[c] || c;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ── Filters + sliding pill indicator ─────────────────────────────────────────
const filtersEl = document.getElementById('filters');
const filterPill = document.createElement('div');
filterPill.className = 'filter-pill';
filtersEl.insertBefore(filterPill, filtersEl.firstChild);

function positionPill() {
  const active = filtersEl.querySelector('.filter--active');
  if (!active) return;
  // offsetLeft/offsetTop are layout-based, unaffected by ancestor transforms.
  filterPill.style.left   = active.offsetLeft + 'px';
  filterPill.style.top    = active.offsetTop + 'px';
  filterPill.style.width  = active.offsetWidth + 'px';
  filterPill.style.height = active.offsetHeight + 'px';
  filterPill.classList.add('ready');
}
// Re-measure on various layout-settling events
window.addEventListener('load', () => requestAnimationFrame(positionPill));
window.addEventListener('resize', positionPill);
// Wait for webfonts — text widths change once they swap in
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => requestAnimationFrame(positionPill));
}
// Watch every filter button (size changes when counts populate or fonts swap)
const filterRO = new ResizeObserver(positionPill);
document.querySelectorAll('.filter').forEach(b => filterRO.observe(b));

filtersEl.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter');
  if (!btn) return;
  document.querySelectorAll('.filter').forEach(b => b.classList.remove('filter--active'));
  btn.classList.add('filter--active');
  positionPill();
  renderGrid(btn.dataset.cat, true);
});

// ── Lightbox ──────────────────────────────────────────────────────────────────
const lightbox   = document.getElementById('lightbox');
const lbImg      = document.getElementById('lightbox-img');
const lbTitle    = document.getElementById('lightbox-title');
const lbCat      = document.getElementById('lightbox-cat');
const lbFigure   = document.querySelector('.lightbox__figure');

function openLightbox(i, originEl) {
  currentIdx = i;
  const p = currentList[i];

  // Origin scale animation
  if (originEl) {
    const rect = originEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    lightbox.style.transformOrigin = `${cx}px ${cy}px`;
  }

  lbImg.src    = 'assets/images/' + p.file;
  lbImg.alt    = p.title || '';
  lbTitle.textContent = p.title || 'Sans titre';
  lbCat.textContent   = prettyCat(p.category);

  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Preload neighbours
  [-1, 1].forEach(d => {
    const nb = currentList[(i + d + currentList.length) % currentList.length];
    if (nb) { const img = new Image(); img.src = 'assets/images/' + nb.file; }
  });
}

function closeLightbox() {
  lightbox.classList.add('lightbox--closing');
  lightbox.addEventListener('animationend', () => {
    lightbox.classList.remove('active', 'lightbox--closing');
    document.body.style.overflow = '';
  }, { once: true });
}

function navigate(dir) {
  // Slide the image
  lbFigure.style.animation = `lbSlide${dir > 0 ? 'Left' : 'Right'} 0.2s ease forwards`;
  lbFigure.addEventListener('animationend', () => {
    currentIdx = (currentIdx + dir + currentList.length) % currentList.length;
    const p = currentList[currentIdx];
    lbImg.src            = 'assets/images/' + p.file;
    lbImg.alt            = p.title || '';
    lbTitle.textContent  = p.title || 'Sans titre';
    lbCat.textContent    = prettyCat(p.category);
    lbFigure.style.animation = `lbSlide${dir > 0 ? 'InRight' : 'InLeft'} 0.22s ease forwards`;
    lbFigure.addEventListener('animationend', () => { lbFigure.style.animation = ''; }, { once: true });
  }, { once: true });
}

document.querySelector('.lightbox__close').addEventListener('click', closeLightbox);
document.querySelector('.lightbox__prev').addEventListener('click',  () => navigate(-1));
document.querySelector('.lightbox__next').addEventListener('click',  () => navigate(1));
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

// Pause grain animation when tab hidden — avoids constant repaints in background
document.addEventListener('visibilitychange', () => {
  const g = document.getElementById('grain');
  if (g) g.style.animationPlayState = document.hidden ? 'paused' : 'running';
});

document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('active')) return;
  if (e.key === 'Escape')     closeLightbox();
  if (e.key === 'ArrowLeft')  navigate(-1);
  if (e.key === 'ArrowRight') navigate(1);
});

// ── Contact form ──────────────────────────────────────────────────────────────
document.getElementById('contact-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const btn  = form.querySelector('button[type="submit"]');
  const orig = btn.innerHTML;
  btn.innerHTML = '<span class="btn-loader"></span> Envoi…';
  btn.disabled  = true;
  try {
    const res = await fetch(form.action, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(form),
    });
    if (!res.ok) throw new Error();
    btn.innerHTML = '✓ Message envoyé !';
    btn.classList.add('btn--success');
    form.reset();
  } catch {
    btn.innerHTML = '✗ Erreur — réessayez';
    btn.classList.add('btn--error');
  } finally {
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.disabled  = false;
      btn.classList.remove('btn--success', 'btn--error');
    }, 3500);
  }
});

init();
