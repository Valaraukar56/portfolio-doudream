// Nav scroll
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
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

// Load projects and build grid
let allProjects = [];
let currentList = [];
let currentIdx = 0;

async function init() {
  // Prefer inline JSON (no network round-trip), fallback to fetch
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

// Auto-downsize the oldest third of Portraits (unless a size is explicitly set)
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
}

const ROW_HEIGHT = 8;
const GAP = 16;

// Re-layout on resize. Viewport math only — zero DOM reads.
function setAllRowSpans() {
  const grid = document.getElementById('grid');
  if (!grid) return;
  const gridW = estimateGridWidth();
  if (!gridW) return;
  const arts = grid.children;
  for (let i = 0; i < arts.length; i++) {
    const art = arts[i];
    const img = art.querySelector('img');
    const aspect = parseFloat(art.dataset.aspect);
    let ratio = aspect;
    if (!ratio && img && img.naturalWidth) ratio = img.naturalHeight / img.naturalWidth;
    if (!ratio) continue;
    const size = art.classList.contains('art--small') ? 'small'
               : art.classList.contains('art--large') ? 'large' : 'normal';
    const { totalCols, cardSpan } = gridSpec(size);
    const colW = (gridW - (totalCols - 1) * GAP) / totalCols;
    const cardW = cardSpan * colW + (cardSpan - 1) * GAP;
    const height = cardW * ratio;
    const span = Math.ceil((height + GAP) / (ROW_HEIGHT + GAP));
    art.style.gridRow = `span ${span}`;
  }
}

function setRowSpan(art) {
  // Single-card version used on image onload fallback (when aspect was unknown)
  const img = art.querySelector('img');
  if (!img || !img.naturalWidth) return;
  const aspect = parseFloat(art.dataset.aspect);
  let ratio = aspect || (img.naturalHeight / img.naturalWidth);
  const width = art.getBoundingClientRect().width;
  if (!width || !ratio) return;
  const height = width * ratio;
  const span = Math.ceil((height + GAP) / (ROW_HEIGHT + GAP));
  art.style.gridRow = `span ${span}`;
}

// Grid layout mirror of the CSS — returns { totalCols, cardSpan } for this viewport.
// Matches style.css media queries: default 12, ≤1200 → 6, ≤900 → 4, ≤640 → 6 (narrower).
function gridSpec(size) {
  const vw = window.innerWidth;
  let totalCols, spans;
  if (vw <= 640) { totalCols = 6; spans = { small: 3, normal: 3, large: 5 }; }
  else if (vw <= 900)  { totalCols = 4; spans = { small: 2, normal: 2, large: 3 }; }
  else if (vw <= 1200) { totalCols = 6; spans = { small: 2, normal: 3, large: 6 }; }
  else                 { totalCols = 12; spans = { small: 2, normal: 3, large: 6 }; }
  return { totalCols, cardSpan: spans[size] || spans.normal };
}

// Grid width = viewport − .portfolio padding (4vw each side, capped at max-width 1600)
// Derived from viewport only — no DOM read, no forced reflow.
function estimateGridWidth() {
  const vw = window.innerWidth;
  const padding = Math.round(vw * 0.04) * 2; // 4vw × 2 sides
  return Math.min(vw - padding, 1600 - padding);
}

function renderGrid(cat) {
  const grid = document.getElementById('grid');
  currentList = cat === 'all' ? allProjects : allProjects.filter(p => p.category === cat);

  // Pure viewport math — no DOM geometry reads = no forced reflow.
  const gridW = estimateGridWidth();
  const frag = document.createDocumentFragment();

  currentList.forEach((p, i) => {
    const art = document.createElement('div');
    const size = p.size || 'normal';
    art.className = `art art--${size}`;
    art.dataset.idx = i;

    // Compute grid-row span up front — no image load wait, no rect read per card.
    let span;
    if (p.w && p.h && gridW) {
      art.dataset.aspect = (p.h / p.w).toFixed(4);
      const { totalCols, cardSpan } = gridSpec(size);
      const colW = (gridW - (totalCols - 1) * GAP) / totalCols;
      const cardW = cardSpan * colW + (cardSpan - 1) * GAP;
      const height = cardW * (p.h / p.w);
      span = Math.ceil((height + GAP) / (ROW_HEIGHT + GAP));
    } else {
      span = ({ small: 20, normal: 35, large: 55 })[size];
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
    `;
    art.addEventListener('click', () => openLightbox(i));
    // Safety fallback: if we didn't get dimensions, wait for image to load.
    if (!(p.w && p.h)) {
      art.querySelector('img').addEventListener('load', () => setRowSpan(art));
    }
    frag.appendChild(art);
  });

  // Single DOM insertion — one layout pass for the whole grid.
  grid.replaceChildren(frag);
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(setAllRowSpans, 150);
}, { passive: true });

function prettyCat(c) {
  return {
    Portraits: 'Portrait',
    Paysages: 'Paysage',
    CreationPaysages: 'Création paysage',
    Divers: 'Création HD',
    Autres: 'Autre'
  }[c] || c;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// Filters
document.getElementById('filters').addEventListener('click', (e) => {
  const btn = e.target.closest('.filter');
  if (!btn) return;
  document.querySelectorAll('.filter').forEach(b => b.classList.remove('filter--active'));
  btn.classList.add('filter--active');
  renderGrid(btn.dataset.cat);
});

// Lightbox
const lightbox = document.getElementById('lightbox');
const lbImg    = document.getElementById('lightbox-img');
const lbTitle  = document.getElementById('lightbox-title');
const lbCat    = document.getElementById('lightbox-cat');

function openLightbox(i) {
  currentIdx = i;
  const p = currentList[i];
  lbImg.src = 'assets/images/' + p.file;
  lbImg.alt = p.title || '';
  lbTitle.textContent = p.title || 'Sans titre';
  lbCat.textContent = prettyCat(p.category);
  lightbox.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Preload both neighbours for instant nav
  [-1, 1].forEach(d => {
    const nb = currentList[(i + d + currentList.length) % currentList.length];
    if (nb) { const img = new Image(); img.src = 'assets/images/' + nb.file; }
  });
}

function closeLightbox() {
  lightbox.classList.remove('active');
  document.body.style.overflow = '';
}

function navigate(dir) {
  currentIdx = (currentIdx + dir + currentList.length) % currentList.length;
  openLightbox(currentIdx);
}

document.querySelector('.lightbox__close').addEventListener('click', closeLightbox);
document.querySelector('.lightbox__prev').addEventListener('click', () => navigate(-1));
document.querySelector('.lightbox__next').addEventListener('click', () => navigate(1));
lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('active')) return;
  if (e.key === 'Escape')     closeLightbox();
  if (e.key === 'ArrowLeft')  navigate(-1);
  if (e.key === 'ArrowRight') navigate(1);
});

// Form (Formsubmit AJAX)
document.getElementById('contact-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const btn = form.querySelector('button[type="submit"]');
  const original = btn.textContent;
  btn.textContent = 'Envoi…';
  btn.disabled = true;
  try {
    const res = await fetch(form.action, {
      method: 'POST',
      headers: { 'Accept': 'application/json' },
      body: new FormData(form)
    });
    if (!res.ok) throw new Error('network');
    btn.textContent = '✓ Message envoyé';
    form.reset();
  } catch (err) {
    btn.textContent = '✗ Erreur, réessayez';
  } finally {
    setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 3000);
  }
});

init();
