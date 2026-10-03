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

Progress, notes, hints and attempt counts use the single namespaced key `ppecTrailState:v1`. Starting again confirms before removing only that key.

All compromise, activation, install, scanning and deletion effects are fictional presentation. The site requests no device permissions and executes no downloaded code.

## Media

`data/media-manifest.json` maps each semantic media ID to its exact local asset. The nine videos use the supplied MP4 files after the player presses the in-world play control; the existing YouTube URLs are backup links if a local recording cannot play.

The supplied noticeboard, map, manuals and Jonabot portrait are included in `assets/`. The noticeboard has a keyboard-accessible 100%-400% zoom viewer and remains an on-demand map-puzzle reference. Both manuals have local page-image readers so they work inline even when a browser cannot embed PDFs. The ordinary JonaTravel manual retains its source-PDF link; the protected Owners Guide has no source-file download in the player UI and stays concealed until its password puzzle is solved, after which its pages open directly in the console without another password prompt.

When a video contains the answer to the following question, that same video remains visible with the question. The password puzzle later directs players into Discord's `#trail-note-pdfs` channel to use the previous-trail PDFs there; the website does not replace that external investigation.

On mobile, Notes, Hints and Menu use a compact floating dock with the tool drawer positioned safely above it. The start advert uses a dedicated phone composition with the artwork above a compact full-width action card. In landscape and on laptops, the console becomes a three-column layout with Notes, Hints and History fixed beside a narrower current scene; older completed scenes collapse to compact headings while the immediately preceding clue remains available. The redundant desktop console-menu button is replaced by a direct, confirmed Reset Trail control; the mobile menu remains for the tools that are not permanently visible there. The current scene's hint set refreshes whenever the scene changes, and the retired Field Kit is not shown because required references remain inline with the puzzles that use them.

Answer feedback appears only after an answer control is submitted. Correct, incorrect and informational results use distinct labelled, high-contrast panels, with invalid inputs also marked for assistive technology.

Correct answers never advance automatically. A dedicated in-world success dialog confirms the result and has one Continue action. Continue always reveals the next logical beat: newly unlocked media first, otherwise the next prompt. The submitted section also retains its green acceptance signal at the bottom as a persistent record. New prompts align at their top, while newly unlocked media aligns directly below the console header. This also applies to the noticeboard's inline Jonavision tuner.

Completed story beats remain above the current interactive section instead of being replaced. Videos, images and relevant read-only records therefore stay available in one chronological page. History opens a completed section in full read-only replay, including its media, then returns the player to the top of their current section.

Each video has unique, locally hosted story artwork created for its exact scene. The site never uses YouTube's thumbnails. Live HTML overlays turn each cover into an in-world state such as `VISIT BODACH BAY`, `ROGUE UPLOAD DETECTED` or `INCOMING JONAGRAPH`, with a large accessible play control.

Each video manifest entry points to an included `assets/videos/*.mp4` file. The YouTube URL is retained only as an optional backup if local playback fails.

Video artwork and playback show scene-specific in-world loading messages. Where a recording leads directly to Continue, that button appears only after the local MP4 finishes; this watched state is saved on the device. If local playback fails and the YouTube backup is used, the player can confirm that they finished the backup recording. The corrupted map itself loads eagerly, independently of the optional noticeboard reference.

Jonabot favicon and touch-icon crops are included for browser tabs and saved-home-screen presentation. The opening story artwork also supplies the public social preview.

The home screen uses an original responsive advert-style Jonabot hero with live HTML title, Start Trail, Resume Trail and Start Again controls. Keeping the controls out of the bitmap preserves accessibility and lets the page show the correct option for saved progress.

Starting a fresh trail lands directly on Jonabot's opening transmission artwork and play control. A **Start trail** button sits immediately beneath the video; only after the player selects it does the original “Over the last 18 months…” task and noticeboard load. The task uses the source design document's question without prematurely naming the town, channel or machine the player must discover.

The original Activation Centre screenshot was not present in the supplied folder. The working in-console activation sequence remains clearly labelled as a recreated interface rather than original artwork.

A highly designed, downloadable Bodach Bay Blimp Ticket is included as the completed Scene 22 reward. The final Jonana Peel recording leads directly to the ticket page, where the post-trail credits video appears with the written credits rather than as another trail step.

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
