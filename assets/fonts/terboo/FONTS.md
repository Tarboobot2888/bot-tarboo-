# Bot Terboo v4.0 — Identity Fonts

These font files are used by the central font registry (`src/lib/terboo-fonts.js`) for
image / canvas / SVG rendering only. WhatsApp controls the typeface of plain text
messages, so no `font-family` is forced on normal chat messages.

| File | Family | Weight | Used for |
| --- | --- | --- | --- |
| `Cairo-Regular.ttf` | Terboo Arabic | 400 | Arabic body text |
| `Cairo-Medium.ttf` | Terboo Arabic | 500 | Arabic emphasis |
| `Cairo-SemiBold.ttf` | Terboo Arabic | 600 | Arabic sub-headings |
| `Cairo-Bold.ttf` | Terboo Arabic | 700 | Arabic headings |
| `Inter-Regular.ttf` | Terboo Latin | 400 | English / Spanish body text |
| `Inter-Medium.ttf` | Terboo Latin | 500 | English / Spanish emphasis |
| `Inter-SemiBold.ttf` | Terboo Latin | 600 | English / Spanish sub-headings |
| `Inter-Bold.ttf` | Terboo Latin | 700 | English / Spanish headings |
| `JetBrainsMono-Regular.ttf` | Terboo Mono | 400 | Code cards (`src/lib/terboo-code-card.js`) |
| `JetBrainsMono-Bold.ttf` | Terboo Mono Bold | 700 | Code card headers |
| `PlusJakartaSans-ExtraBold.ttf` | Terboo Display (SVG: Plus Jakarta Sans ExtraBold) | 800 | Brand pack headlines: «Bot Terboo», section titles (Latin only) |
| `Anton-Regular.ttf` | Anton (SVG only, brand pack generator) | 400 | Brand pack: the giant «TERBOO» name drawn behind the character (Latin only) |

## Licensing / attribution

Both families are released under the **SIL Open Font License, Version 1.1**
(<https://openfontlicense.org>). The copyright strings embedded in the font files are:

- **Cairo** — Copyright 2009 The Cairo Project Authors (<https://github.com/Gue3bara/Cairo>)
- **Inter** — Copyright 2016 The Inter Project Authors (<https://github.com/rsms/inter>)
- **JetBrains Mono** — Copyright 2020 The JetBrains Mono Project Authors (<https://github.com/JetBrains/JetBrainsMono>) — full OFL text in `JetBrainsMono-OFL.txt`
- **Anton** — Copyright 2020 The Anton Project Authors (<https://github.com/googlefonts/AntonFont>) — full OFL text in `Anton-OFL.txt`. `Anton-Regular.ttf` is the Latin subset from the `@fontsource/anton` package, converted from WOFF to TTF (tables unchanged); no Reserved Font Name is declared.
- **Plus Jakarta Sans ExtraBold** — Copyright 2020 The Plus Jakarta Sans Project Authors (<https://github.com/tokotype/PlusJakartaSans>) — full OFL text in `PlusJakartaSans-OFL.txt`. `PlusJakartaSans-ExtraBold.ttf` is the Latin subset from the `@fontsource/plus-jakarta-sans` package, converted from WOFF to TTF (tables unchanged); no Reserved Font Name is declared.

The OFL permits bundling and redistribution with software as long as the fonts are
not sold on their own and the copyright notices above are preserved. These files are
unmodified copies fetched from Google Fonts. The full OFL text could not be bundled
here, so the canonical text at <https://openfontlicense.org> applies.

The fonts that already shipped with the project (`assets/fonts/Epep.ttf`,
`Levelup.ttf`, `Zahraaa.ttf`, `arialnarrow.ttf`, `assets/fonts/kalender/*`,
`assets/terboo-font.ttf`, `assets/meme/fonts/*`) were **not** removed or replaced;
plugins that register them keep working exactly as before.
