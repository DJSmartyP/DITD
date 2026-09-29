# DITD

**Discord In The Discord - A Jonabot Trail** is a mobile-first, static recreation of the Phantom Peak Explorers Club community trail. It runs as one persistent PPEC Trail Console and preserves the canonical Scene 00-22 order.

## Run locally

The site loads JSON with `fetch`, so serve the repository instead of double-clicking `index.html`.

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/`.

No package install, backend, account, database or build step is required.

## GitHub Pages

1. Create a repository named `DITD`.
2. Put the contents of this folder at the repository root.
3. In **Settings → Pages**, deploy from the root of the default branch.

Every runtime URL is repository-relative, so the site works below the `/DITD/` GitHub Pages subpath.

## Canonical chain

The complete 00-22 scene flow lives in `data/trail.json`. In particular, the critical dependency remains:

`noticeboard → 207 → Jonana Peel → Gremlin cypher + corrupted map → area 2 + initials JP → 2JP`

The required answers and behaviours are:

- `207`
- `Jonana Peel` (case and surrounding-space tolerant)
- `2JP`, with authored `1LF` dead end and `8HO` help route
- `reboot-jonanapeel.exe`
- `4763`
- `WD54L`
- `8345`
- `cancel-plan` (deliberately fails, then progresses)
- `4216`
- `INITIATE JONABOT RESTORE` (spaces/hyphens and case tolerated)

## Persistence and safety

Progress, evidence, pins, notes, hints and attempt counts use the single namespaced key `ppecTrailState:v1`. Starting again confirms before removing only that key.

All compromise, activation, install, scanning and deletion effects are fictional presentation. The site requests no device permissions and executes no downloaded code.

## Media

`data/media-manifest.json` maps each semantic media ID to its exact local asset or YouTube URL. YouTube embeds are privacy-enhanced and load only after the player chooses to load them.

The supplied noticeboard, map, manuals and Jonabot portrait are included in `assets/`. The nine videos use the supplied unlisted YouTube playlist rather than duplicating the local MOV masters.

Two original assets were not present in the supplied folder and remain clearly named placeholders:

- original Activation Centre/CAPTCHA artwork;
- Bodach Bay blimp tickets.

See `MEDIA_INVENTORY.md` for the complete source-to-scene map and hashes.

## Validation

Run the dependency-free static checks with:

```powershell
npm test
```

The checks cover the 23-scene chain, critical answers and normalizers, evidence dependency, media mapping and GitHub Pages-safe relative paths.

## Structure

```text
/
├── index.html
├── 404.html
├── README.md
├── MEDIA_INVENTORY.md
├── css/
├── js/
├── data/
├── assets/
└── tests/
```
