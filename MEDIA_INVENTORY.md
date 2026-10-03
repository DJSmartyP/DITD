# DITD media inventory and scene mapping

Authoritative media source folder: `C:\Users\nickp\Desktop\Phantom Peak Stuff\Discord In The Discord Media`

Source planning document: [Phantom Peak Explorers Club: Community Trail - Planning Sheet](https://docs.google.com/document/d/1_JLZ6GsC-ILbwJdITtZuuqmhXJzBEQYYRh9HmboL6hE/edit?usp=drivesdk)

YouTube playlist: [Phantom Peak Explorers Club - CT1 Discord in the Discord](https://www.youtube.com/playlist?list=PLpw9gMGspkwQB59C81jIwSmvjUZZUw5bY)

## Supplied media pack

| Source file | Size | SHA-256 | Semantic ID / scene | Runtime mapping |
|---|---:|---|---|---|
| `PPEC_01_INTRO_240210.mov` | 16,025,202 B | `89BCDC0DEA0702F07FEECD9067F26E9DC640FE06FB0C87D581DE0C72797BB4F6` | `intro` / 00 | YouTube `o4-d7swjHQA` |
| `PPEC_02_NOTICEBOARD_240208.jpg` | 2,097,008 B; 3840×2600 | `8EA8E1B2F5715F555DB81E14545715C0CF1D004F535AAF7CECB9B21432EDFCA8` | `town-noticeboard`, `gremlin-cypher-poster` / 01, 04 | Zoomable full-board reference at both scenes; `assets/images/town-noticeboard.jpg` |
| `PPEC_03_BODACH_BAY_VIDEO_240211.mov` | 24,168,228 B | `12F9F4D3C29D55413405754C81745F419A7F84DC6FEC16C488DDEE619D4D9ECB` | `bodach-bay-tourism` / 02-03 | YouTube `NBgHzkGyLH8` |
| `PPEC_04_JONAGRAPH_MAP_240208.jpg` | 3,694,784 B; 5560×3264 | `D0CCE389B1B0868DF221B983E66C88588D6745497277D3FAB60C27DC65B8BEA0` | `corrupted-ridge-map` / 04 | `assets/images/corrupted-ridge-map.jpg` |
| `PPEC_05_JONATRAVEL_VIDEO_01_240211.mov` | 24,965,296 B | `1B44B18D57A640689B8EF7C1C1F219EF3A738C3A027811957263C5E5EEBF4AD7` | `jonatravel-jonana-peel` / 05 | YouTube `XZTUwUgWQ0w` |
| `PPEC_06_JONATRAVEL_MANUAL_240205.pdf` | 226,695 B; 9 pages | `622B7CEB5DD3AE8F8CEC6733CCCF0F28FD51493AEA5C2A3DADBA1819965ECBB5` | `jonatravel-operator-manual` / 06 | `assets/documents/jonatravel-operator-manual.pdf` |
| `PPEC_07_HACKER_VIDEO_01_240211.mov` | 19,604,812 B | `B35BB20ADFD4E3E69D0FDB418362F7433BDFE4F5013DC5A8962494FB3EDB562C` | `videomatic-4763-hacker` / 08-09 | YouTube `3Xmr5k-s2Uo` |
| `PPEC_08_HACKER_VIDEO_02_240211.mov` | 20,823,958 B | `6D4BC7260CB42E52B19459CA363C859CA618F9AEE01D8995C2B424F6D3E141BF` | `videomatic-8345-reveal` / 11-12 | YouTube `0Q03cm6mG4U` |
| `PPEC_09_HACKER_VIDEO_03_240211.mov` | 13,930,549 B | `285FE2BF67F481A49A19902A9C186A746E469C66CF9C181849666CF5AD1668D4` | `cancel-plan-mockery` / 14 | YouTube `UZvwzrTpF4M` |
| `PPEC_10_JONABOT_MANUAL_PROTECTED_240209.pdf` | 2,870,583 B; 3 pages; password `4216` | `A9C23539959509F3A076A653BBB347DA8793F72B7CBFBFFBAA4F6C63312CE830` | `jonabot-operator-manual-protected` / 16-18 | `assets/documents/jonabot-operator-manual-protected.pdf` |
| `PPEC_11_HACKER_VIDEO_04_240205.mov` | 19,794,990 B | `0CDEEFCCE28C3173F3E0502D36155CE84DF3EDFC4CA5B3D3EDB7B0DEAB67EB97` | `restore-finale` / 19 | YouTube `3Bau9qcTICE` |
| `PPEC_12_JONATRAVEL_VIDEO_02_240211.mov` | 16,034,062 B | `8C7C9B55E007655116AEC1DD0F421BB70A7DBE0A58FA923310A6DB6B4629682E` | `final-jonana-peel` / 21 | YouTube `UBRdKAB_FL8` |
| `PPEC_13_POST_TRAIL_CREDITS_240211.mov` | 16,775,564 B | `A307DC0505A1561D3DB9ACCFF68B7B8ABF70729316FCAAE2FEC5C1C69AAB628E` | `post-trail-credits` / 22 | YouTube `QUs3g0damK4`; displayed with the written credits on the ticket reward page |

## Additional supplied artwork

| Source file | Size / properties | SHA-256 | Use |
|---|---:|---|---|
| `D1 - 50 Pieces.png` | 16,517,106 B; 2484×3941 RGBA | `DD1654E1D8ADB4B83ECC71F2550B01161488B556A373E86071FC0DA49146EF8B` | Persistent narrator portrait; exact-content 719×1140 WebP derivative at `assets/images/jonabot-portrait.webp` (121,654 B), plus 64px favicon and 180px touch-icon crops |

The browser icon is also packaged as root `favicon.ico`. A 1200×630 JPEG crop of the opening story artwork at `assets/images/ditd-social-preview.jpg` supplies the public link preview.

The responsive home advert uses original generated artwork at `assets/images/ditd-landing-hero.jpg` (warm expedition-map setting with Jonabot on the left). Its title and Start/Resume controls remain live HTML rather than generated image text.

`Jonabot_Trail_Intro (1).mov` was deliberately excluded at the user's direction because the intro is already mapped from the YouTube playlist.

## Local video copies

The nine MOV masters remain in the authoritative source folder. Matching MP4 exports from that same folder are now included in `assets/videos/` and play directly in the trail. The existing YouTube URLs remain optional backups if a local MP4 cannot play on a device.

| Semantic ID | Source MP4 | Repository file |
|---|---|---|
| `intro` | `Ppec 01 Intro 240210.mp4` | `assets/videos/intro.mp4` |
| `bodach-bay-tourism` | `Ppec 03 Bodach Bay Video 240211.mp4` | `assets/videos/bodach-bay-tourism.mp4` |
| `jonatravel-jonana-peel` | `Ppec 05 Jonatravel Video 01 240211.mp4` | `assets/videos/jonatravel-call.mp4` |
| `videomatic-4763-hacker` | `Ppec 07 Hacker Video 01 240211.mp4` | `assets/videos/videomatic-4763.mp4` |
| `videomatic-8345-reveal` | `Ppec 08 Hacker Video 02 240211.mp4` | `assets/videos/videomatic-8345.mp4` |
| `cancel-plan-mockery` | `Ppec 09 Hacker Video 03 240211.mp4` | `assets/videos/cancel-plan.mp4` |
| `restore-finale` | `Ppec 11 Hacker Video 04 240205.mp4` | `assets/videos/restore-finale.mp4` |
| `final-jonana-peel` | `Ppec 12 Jonatravel Video 02 240211.mp4` | `assets/videos/final-jonatravel-call.mp4` |
| `post-trail-credits` | `Ppec 13 Post Trail Credits 240211.mp4` | `assets/videos/post-trail-credits.mp4` |

The Bodach Bay tourism video is deliberately mapped to both Scenes 02 and 03 so the answer-bearing recording stays on screen with the travel-agent question. The full noticeboard is referenced rather than collected, and reopens beside the corrupted map.

## Explicit TBD assets

These original files were referenced by the planning material but were not present in the supplied media folder:

| Placeholder ID | Required scene | Current behaviour |
|---|---:|---|
| `activation-centre` / original CAPTCHA art | 10 | Authored fictional activation interaction with visible `[TBD ORIGINAL VISUAL]` label; canonical code `WD54L` retained |

No replacement canon was invented for the missing Activation Centre visual.

## Generated reward asset

| Asset | Required scene | Runtime mapping |
|---|---:|---|
| Collectible Bodach Bay Blimp Completion Pass, generated 2026-09-30 with Jonabot cameo, completion seal, travel stub and blank passenger/date/seat fields | 22 | `assets/tickets/bodach-bay-trail-completion-pass.png` |

## Generated video story art

The nine video players use original, locally hosted artwork generated specifically for the story beat at that point in the trail. None of these covers use or derive from the YouTube thumbnails. The play control and story-specific state labels are live HTML/CSS overlays rather than baked into the images: Bodach Bay appears as a tourism broadcast, the hacker recordings as rogue/restricted uploads, and the calls and restoration as incoming system transmissions.

| Thumbnail asset | Story beat | Media ID |
|---|---|---|
| `assets/video-thumbnails/intro.webp` | Jonabot opens the trail over the Ridge | `intro` |
| `assets/video-thumbnails/bodach-bay-tourism.webp` | Idealised Bodach Bay tourism vision | `bodach-bay-tourism` |
| `assets/video-thumbnails/jonatravel-call.webp` | JonaTravel call beginning to corrupt | `jonatravel-jonana-peel` |
| `assets/video-thumbnails/videomatic-4763.webp` | Hacker controlling the town network | `videomatic-4763-hacker` |
| `assets/video-thumbnails/videomatic-8345.webp` | Jonabot's corrupted reveal | `videomatic-8345-reveal` |
| `assets/video-thumbnails/cancel-plan.webp` | The false cancel-plan trap | `cancel-plan-mockery` |
| `assets/video-thumbnails/restore-finale.webp` | Backup restore removing corruption | `restore-finale` |
| `assets/video-thumbnails/final-jonana-peel.webp` | Restored Bodach Bay booking | `final-jonana-peel` |
| `assets/video-thumbnails/post-trail-credits.webp` | Post-trail sunset and departure | `post-trail-credits` |
