// Nav scroll
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

// Load projects and build grid
let allProjects = [];
let currentList = [];
let currentIdx = 0;

async function init() {
  const res = await fetch('projects.json');
  allProjects = await res.json();
  updateCounts();
  renderGrid('all');
}

function updateCounts() {
  const counts = { all: allProjects.length };
  for (const p of allProjects) counts[p.category] = (counts[p.category] || 0) + 1;
  for (const [cat, n] of Object.entries(counts)) {
    const el = document.getElementById('count-' + cat);
    if (el) el.textContent = n;
  }
}

function renderGrid(cat) {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  currentList = cat === 'all' ? allProjects : allProjects.filter(p => p.category === cat);
  currentList.forEach((p, i) => {
    const art = document.createElement('div');
    art.className = 'art';
    art.dataset.idx = i;
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
  });
}

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
