# House ads — "Anúnciate aquí"

Proyecta's own ads, for a screen with nothing sold on it yet and for testing uploads by hand.
"House ad" is the same idea the code calls a **house play**: an ad from the business that owns the
screen, recorded and counted but never billable.

One frame per resolution in `RESOLUTION_PRESETS`
(`packages/common/src/utils/resolution.ts`), landscape and portrait:

| | Landscape | Portrait |
| :--- | :--- | :--- |
| HD | `1280x720` | `720x1280` |
| Full HD | `1920x1080` | `1080x1920` |
| 1440p | `2560x1440` | `1440x2560` |
| 4K | `3840x2160` | `2160x3840` |

Each frame prints its own resolution in signal orange, so you can tell at a glance which asset a
screen is actually playing.

WebP, the same format the asset pipeline produces for images, and accepted by the uploader
(JPG/PNG/WebP, ≤20 MB, short side ≥480 px). The whole set is about 1 MB.

## How they were made

Background is the Meta campaign's hero photo (`design/images/generated-1789443937982.png` — a
Dominican highway at dusk with roadside LED billboards), with the treatment from
`ads/visual-direction.md`: photo on top, a black gradient rising from the bottom carrying the copy.
Type is set in the first available of Arial / DejaVu / Liberation, headline at 11% of the short
side, labels at 3.5%, padding at 8%.

They were rendered once with ffmpeg and committed, rather than generated on demand — these are
fixed assets, not build output. To add a resolution, render it the same way and drop it in.
