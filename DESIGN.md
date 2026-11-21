# ConfiShare Admin design system

The admin surface is an operating workspace: clear scanning, predictable controls, and restrained emphasis. The supplied ConfiShare palette and Inter are binding.

## Tokens

| Purpose | Value |
| --- | --- |
| Page and navigation | `#FAFAFA` |
| Cards and header | `#FFFFFF` |
| Primary action and selection | `#059669` |
| Primary text | `#0F172A` |
| Secondary text | `#475569` |
| Muted surface | `#F1F5F9` |
| Borders | `#E5E7EB` |
| Typeface | Inter Variable |
| Card radius | 12px |
| Dialog radius | 16px |
| Control radius | 8–9px |

## Layout and behavior

- Fixed 68px desktop header and 256px admin navigation; main content begins 34px from its edge.
- The mobile header is 62px, the navigation becomes a slide-in menu, and content uses 16px side padding.
- Summary cards use a four-column desktop grid, two columns on tablet, and one at very narrow widths.
- Analytics uses a wider trend panel and a compact usage panel; lower panels split evenly.
- The user table keeps all nine columns and scrolls horizontally on narrow screens.
- Green marks primary actions and selections. Subscription states use their specified semantic colors.
- Loading uses skeletons, errors offer retry, and empty filters explain how to recover.
- Motion is brief and disabled through reduced-motion preferences.
- The login is a single centered card on a softly tinted canvas, with the wordmark above it. There is no side brand panel at any width.

The wordmark is a replaceable placeholder because no official logo asset was supplied.
