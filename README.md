# F1 Briefing

Public briefing for the current Formula 1 race weekend, published via GitHub Pages.

Live: https://pushpush.live

> **Note:** The page content itself is in German. Only the repository metadata (README, commit messages, issues, PRs) is in English.

## Contents

- Session times (toggle between Vienna and local track time)
- Track, tyres and strategy
- Weather per session
- Drivers' and Constructors' Championship standings
- New FIA documents
- Results, starting grid and race result, added throughout the weekend

## Updates

On race weekends the page is updated automatically several times a day, and it is switched to the next race during race week. Each commit corresponds to one page update.

## Tech

A single `index.html` with no external dependencies (HTML, CSS, and a bit of vanilla JS for the time zone toggle and the session countdown). Dark design matching the Wednesday briefing infographic (F1 red accents, Barlow and Barlow Condensed). The fonts are self-hosted in `fonts/` (SIL Open Font License, see `fonts/OFL.txt`), so no requests go to Google Fonts.

## Notifications

On every push to `main`, a GitHub Action calls a webhook (JSON with commit ID, commit message, timestamp and page link). New commits are also available as a feed: https://github.com/hechi-willson/f1-briefing/commits/main.atom
