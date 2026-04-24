// ─────────────────────────────────────────────────────────────────────────────
// _convert.js — drop-new-image workflow
//
// 1. Drop a .jpg or .png into assets/images/
// 2. Run:  node _convert.js
// 3. The script:
//    - converts it to .webp (max 1600w, q82) + .webp (800w for srcset)
//    - moves the original into _originals_backup/
//    - prints a ready-to-paste JSON snippet for projects.json
// ─────────────────────────────────────────────────────────────────────────────
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const IMG_DIR    = path.join(__dirname, 'assets', 'images');
const BACKUP_DIR = path.join(__dirname, '_originals_backup');
const PROJ_PATH  = path.join(__dirname, 'projects.json');

const QUALITY   = 82;
const MAX_LARGE = 1600;
const SMALL_W   = 800;

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function run() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  // Load projects.json (strip BOM if present)
  let raw = fs.readFileSync(PROJ_PATH, 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  const projects = JSON.parse(raw);
  const knownFiles = new Set(projects.map(p => p.file));

  // Find new originals: .jpg/.png in assets/images/ that aren't already in projects.json
  const candidates = fs.readdirSync(IMG_DIR).filter(f =>
    /\.(jpe?g|png)$/i.test(f)
  );

  if (candidates.length === 0) {
    console.log('✨ Aucune nouvelle image (.jpg/.png) détectée dans assets/images/.');
    console.log('   Drop une image, puis relance le script.');
    return;
  }

  console.log(`📂 ${candidates.length} nouvelle(s) image(s) à traiter :\n`);

  const nextId = projects.reduce((m, p) => {
    // Ignore the 999xxx fake ids used for showcase items
    if (p.id && p.id < 99999000) return Math.max(m, p.id);
    return m;
  }, 0) + 1;

  const newEntries = [];
  let id = nextId;

  for (const f of candidates) {
    const src = path.join(IMG_DIR, f);
    const baseRaw = f.replace(/\.(jpe?g|png)$/i, '');
    // Keep name readable but safe for URLs
    const baseSlug = slugify(baseRaw) || `image-${id}`;
    const outLarge = path.join(IMG_DIR, baseSlug + '.webp');
    const outSmall = path.join(IMG_DIR, baseSlug + '-800.webp');

    try {
      const meta = await sharp(src).metadata();
      const origW = meta.width;
      const origH = meta.height;

      // Large (capped at 1600)
      const largePipe = sharp(src).rotate();
      if (origW > MAX_LARGE) largePipe.resize({ width: MAX_LARGE });
      await largePipe.webp({ quality: QUALITY }).toFile(outLarge);

      // Small (800) — only if original is bigger
      if (origW > SMALL_W) {
        await sharp(src).rotate().resize({ width: SMALL_W }).webp({ quality: QUALITY }).toFile(outSmall);
      }

      const largeStat = fs.statSync(outLarge);
      const origStat  = fs.statSync(src);
      const savings   = (1 - largeStat.size / origStat.size) * 100;

      // Move original to backup (handle name collisions)
      let dest = path.join(BACKUP_DIR, f);
      if (fs.existsSync(dest)) {
        const ts = Date.now();
        dest = path.join(BACKUP_DIR, `${baseRaw}-${ts}${path.extname(f)}`);
      }
      fs.renameSync(src, dest);

      const w = origW > MAX_LARGE ? MAX_LARGE : origW;
      const h = origW > MAX_LARGE ? Math.round(origH * MAX_LARGE / origW) : origH;

      const entry = {
        id: id++,
        title: '',
        category: '',
        file: baseSlug + '.webp',
        w, h,
      };
      newEntries.push(entry);

      console.log(`  ✔ ${f}`);
      console.log(`    → ${baseSlug}.webp  (${(origStat.size/1024).toFixed(0)}→${(largeStat.size/1024).toFixed(0)} KB, -${savings.toFixed(0)}%)`);
      console.log(`    → original déplacé dans _originals_backup/`);
      console.log('');
    } catch (e) {
      console.log(`  ✗ ${f} — ERREUR : ${e.message}\n`);
    }
  }

  if (newEntries.length === 0) {
    console.log('Aucune image traitée avec succès.');
    return;
  }

  console.log('─'.repeat(70));
  console.log('\n📋 À coller dans projects.json (remplir title + category) :\n');
  console.log(JSON.stringify(newEntries, null, 2));
  console.log('\n💡 Catégories valides : "Portraits" | "Paysages" | "CreationPaysages" | "Divers"\n');
}

run().catch(e => { console.error(e); process.exit(1); });
