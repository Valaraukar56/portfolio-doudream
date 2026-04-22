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
  const res = await fetch('projects.json');
  allProjects = await res.json();
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

function setRowSpan(art) {
  const img = art.querySelector('img');
  if (!img || !img.naturalWidth) return;
  const width = art.getBoundingClientRect().width;
  if (!width) return;
  const height = width * (img.naturalHeight / img.naturalWidth);
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
    art.style.gridRow = `span ${DEFAULT_SPANS[size]}`;
    art.innerHTML = `
      <img src="assets/images/${p.file}" alt="${escapeHtml(p.title)}" loading="lazy" />
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
  requestAnimationFrame(() => {
    document.querySelectorAll('.art').forEach(setRowSpan);
  });
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    document.querySelectorAll('.art').forEach(setRowSpan);
  }, 150);
});

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

// Form
document.getElementById('contact-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  const original = btn.textContent;
  btn.textContent = '✓ Message envoyé';
  btn.disabled = true;
  setTimeout(() => { btn.textContent = original; btn.disabled = false; e.target.reset(); }, 3000);
});

init();
