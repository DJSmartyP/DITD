# DITD

**Discord In The Discord - A Jonabot Trail** is a mobile-first, static recreation of the Phantom Peak Explorers Club community trail. It runs as one persistent, continuously growing PPEC Trail Console and preserves the canonical Scene 00-22 order.

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

`zoomable noticeboard + Jonavision 207 tuner → Bodach Bay video + Jonana Peel question → noticeboard reference + corrupted map → area 2 + initials JP → 2JP`

The player does not collect or detach the Gremlin poster. The full noticeboard can be zoomed at Scene 01, the channel tuner sits directly beneath it, and the same board reopens beside the Scene 04 map.

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

`data/media-manifest.json` maps each semantic media ID to its exact local asset or temporary YouTube URL. The YouTube embeds are placeholders and load only after the player presses the in-world play control.

The supplied noticeboard, map, manuals and Jonabot portrait are included in `assets/`. The noticeboard has a keyboard-accessible 100%-400% zoom viewer and remains an on-demand map-puzzle reference. The nine videos currently use the supplied unlisted YouTube playlist as placeholders. YouTube may still show its own sign-in prompt.

When a video contains the answer to the following question, that same video remains visible with the question. The password puzzle later directs players into Discord's `#trail-notes` channel to use the previous-trail PDFs there; the website does not replace that external investigation.

On mobile, Trail Tools use a compact floating dock with the tool drawer positioned safely above it. The current scene's hint set is refreshed whenever the scene changes, and the next available hint control remains visible at the bottom of the drawer.

Completed story beats remain above the current interactive section instead of being replaced. Videos, images and relevant read-only records therefore stay available in one chronological page; History jumps to an earlier section without leaving the live trail.

Each video has unique, locally hosted story artwork created for its exact scene. The site never uses YouTube's thumbnails. Live HTML overlays turn each cover into an in-world state such as `VISIT BODACH BAY`, `ROGUE UPLOAD DETECTED` or `INCOMING JONAGRAPH`, with a large accessible play control.

Each manifest entry also records its planned `assets/videos/*.mp4` path. Once browser-ready MP4 files are added, setting `localSrc` to that path makes the same player use native video instead of YouTube without changing the scene flow or artwork.

Jonabot favicon and touch-icon crops are included for browser tabs and saved-home-screen presentation. The opening story artwork also supplies the public social preview.

The home screen uses an original responsive advert-style Jonabot hero with live HTML title, Start Trail, Resume Trail and Start Again controls. Keeping the controls out of the bitmap preserves accessibility and lets the page show the correct option for saved progress.

The original Activation Centre screenshot was not present in the supplied folder. The working in-console activation sequence remains clearly labelled as a recreated interface rather than original artwork.

A highly designed, downloadable Bodach Bay Blimp Completion Pass is included as the completed Scene 22 reward.

See `MEDIA_INVENTORY.md` for the complete source-to-scene map and hashes.

## Validation

Run the dependency-free static checks with:

```powershell
npm test
```

The checks cover the 23-scene chain, critical answers and normalizers, the zoomable noticeboard reference, clue-bearing video continuity, the Discord PDF investigation, speaker attribution, local video artwork, media mapping and GitHub Pages-safe relative paths.

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
