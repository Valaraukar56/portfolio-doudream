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

// Batched version — read ONE width (all grid columns are equal), then write all
// spans. Avoids 129 forced reflows per render (layout thrashing killer).
function setAllRowSpans() {
  const arts = document.querySelectorAll('.art');
  if (!arts.length) return;
  // Single read pass — one layout flush for the whole batch
  const colWidth = arts[0].getBoundingClientRect().width;
  if (!colWidth) return;
  // Single write pass — no reads interleaved
  arts.forEach(art => {
    const img = art.querySelector('img');
    const aspect = parseFloat(art.dataset.aspect);
    let ratio = aspect;
    if (!ratio && img && img.naturalWidth) ratio = img.naturalHeight / img.naturalWidth;
    if (!ratio) return;
    const height = colWidth * ratio;
    const span = Math.ceil((height + GAP) / (ROW_HEIGHT + GAP));
    art.style.gridRow = `span ${span}`;
  });
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

function renderGrid(cat) {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  currentList = cat === 'all' ? allProjects : allProjects.filter(p => p.category === cat);
  const DEFAULT_SPANS = { small: 20, normal: 35, large: 55 };
  currentList.forEach((p, i) => {
    const art = document.createElement('div');
    const size = p.size || 'normal';
    art.className = `art art--${size}`;
    art.dataset.idx = i;
    if (p.w && p.h) art.dataset.aspect = (p.h / p.w).toFixed(4);
    art.style.gridRow = `span ${DEFAULT_SPANS[size]}`;
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
    grid.appendChild(art);
    const img = art.querySelector('img');
    img.addEventListener('load', () => setRowSpan(art));
  });
  requestAnimationFrame(setAllRowSpans);
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
