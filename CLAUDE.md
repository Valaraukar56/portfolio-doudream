# CLAUDE.md — Portfolio DouDream

Brief pour future-moi : portfolio statique de DouDream (artiste peintre numérique).
Site live sur GitHub Pages, branche `master` poussée direct (pas de PR workflow).

## Stack

Vanilla. **Pas de build, pas de framework, pas de bundler.** Trois fichiers font tout :

- `index.html` — markup + données projets inline (gros bloc JSON en bas)
- `script.js` — grille, lightbox, animations, filtres
- `style.css` — dark theme, accent doré `#e5b87a`, fond `#0e0e10`

Annexes : `_convert.js` (script Node pour ajouter des images), `projects.json` (fallback de fetch — voir plus bas), `privacy.html`.

## Données projets

⚠️ **La source de vérité est inline dans `index.html`**, dans un bloc :

```html
<script type="application/json" id="projects-data">
[ ... tableau de projets ... ]
</script>
```

`script.js` charge ce bloc en priorité (`init()` ligne ~161). `projects.json` n'est qu'un fallback fetch si le bloc inline est absent. **Si tu modifies un projet, modifie l'inline dans `index.html`.**

Format d'une entrée :

```json
{
  "id": 10637851,
  "title": "Mel",
  "category": "CreationPaysages",
  "file": "083-mel.webp",
  "w": 1600,
  "h": 900,
  "size": "small",   // optionnel : "small" | "normal" | "large" (default normal)
  "bg": "light"      // optionnel : fond crème pour images à canal alpha
}
```

Catégories valides : `Portraits` · `Paysages` · `CreationPaysages` · `Divers`.

## Ajouter une œuvre (workflow)

1. Drop `.jpg` ou `.png` dans `assets/images/`.
2. `node _convert.js` → génère `<slug>.webp` (1600w max) + `<slug>-800.webp`, déplace l'original dans `_originals_backup/`, imprime un snippet JSON.
3. Coller le snippet dans `projects.json` ET dans le bloc inline d'`index.html` (remplir `title` + `category`).
4. Mettre à jour `data-count` dans `.hero__stats` si tu veux que le compteur soit juste.

## Pièges connus

### Casse des fichiers — GitHub Pages est case-sensitive

`_convert.js` slugify tout en minuscules. **Garde tout en minuscules.** Si une image est nommée `Truc.webp` (majuscule) :
- en local Windows = ça marche (case-insensitive)
- sur GitHub Pages = 404 silencieux, l'image ne s'affiche pas

`script.js` construit `<base>-800.webp` à partir de `p.file` exactement. Donc `p.file` doit matcher la casse réelle sur disque (et idéalement = lowercase).

### Images à fond transparent

Si l'image est un WebP/PNG avec canal alpha (ex. dessin noir sur transparent), elle disparaît sur le fond sombre. Mettre `"bg": "light"` dans l'entrée JSON → fond crème `#f4f1ec` derrière la carte ET la lightbox (cf. `style.css` `.art--light` et `.lightbox__img--light`).

### Thumbnails -800

`_convert.js` ne génère le `-800.webp` que si l'original fait > 800px de large. Mais `script.js` le demande **toujours** dans le `srcset` (et le `src`). Pour les images < 800w, soit tu copies le fichier vers `<base>-800.webp`, soit tu acceptes le 404 (le navigateur fallback sur le large 1600w via srcset, mais pas pour le `src` initial).

## Architecture script.js (rapide)

- `init()` — charge le JSON, calcule auto-sizing, render grille
- `applyAutoSizing()` — les 33% plus vieux portraits passent en `size: small`
- `buildGrid(cat)` / `renderGrid()` — construit les cards via `documentFragment` (1 seul reflow)
- `computeSpan()` / `setRowSpan()` — calcule `grid-row: span N` à partir du ratio (sans DOM read, juste viewport math)
- `openLightbox()` / `closeLightbox()` / `navigate()` — modale avec preload des voisins
- `IntersectionObserver` pour les classes `.art--visible` (fade-in à l'entrée viewport)

Le reste (`_grid.js`-style stuff) tient en ~600 lignes, lis-le directement si besoin.

## Style — points à connaître

- Variables CSS dans `:root` : `--bg`, `--accent` (doré), `--ink`, etc.
- Grille bento : 12 cols, `grid-auto-rows: 8px`, `grid-auto-flow: dense`
- `.art--small` (span 2) · `.art--normal` (span 3) · `.art--large` (span 6)
- Animations : `reveal` + `reveal--delay-N` pour les fade-in séquencés
- Le hero a un loader translucide qui laisse voir l'animation derrière

## Git workflow

- Branche principale : `master` (pas `main`).
- Push direct sur `master` quand le user le demande explicitement (`git push origin <branch>:master`).
- Sinon, branche feature + PR.
- Pas de `--no-verify`, pas de `--force` sauf demande explicite.

## Tester en local

Serveur statique au choix. `python -m http.server`, `npx serve`, ou Live Server VSCode. **Ne pas ouvrir `index.html` en `file://`** : `fetch('projects.json')` plante en CORS et tu ne le verras pas si l'inline JSON marche, mais d'autres trucs cassent.

## Ce qui n'existe PAS

- Pas de tests, pas de CI, pas de linter configuré
- Pas de TypeScript, pas de build step
- Pas de backend — formulaire de contact passe par FormSubmit (`action="https://formsubmit.co/ajax/..."`)
