# Agent Anatomy

A single-page interactive explainer for what an AI "agent" actually is — and
why most of the scary / magical framing around them is marketing.

**Live:** <https://fredlemieux.github.io/agent-anatomy/>

Built for a 20-minute talk at [Tech Wave #003](https://tech-wave.org/event003),
Marbella, Nov 2026. Audience: smart non-technical people who are tired of
being sold magic.

## The thesis

Every agent you've ever heard of is the same four parts wired together:

- **Model** — a language model (LLM). Text in, text out. No memory, no will,
  no clock.
- **Tools** — the arms. Functions the harness exposes: web search, calendar,
  code execution, anything with an API.
- **Loop** (the harness) — ordinary code wrapped around the model. Builds the
  prompt, runs the tools, keeps the loop going until the model stops asking.
- **Trigger** — a person, an event, or a timer. Something has to say *go*.

Learn the parts once and the hype can't fool you.

## Running it locally

Nothing to build. It's three static files.

```bash
python3 -m http.server 8000
# → open http://localhost:8000
```

Or use any static file server you like (`npx serve`, `caddy file-server`, etc).

## Project structure

```
.
├── index.html            Structure + inline SVG diagrams
├── styles.css            Design tokens, layout, dark mode
├── app.js                Ladder, simulator, glossary, SVG animations
├── .github/workflows/
│   └── deploy.yml        GitHub Pages deploy on push to main
└── README.md             This file
```

## Sources

The content synthesises three pieces that landed in late Jan 2026:

- Simon Willison — ["My take on Moltbook"](https://simonwillison.net/2026/Jan/30/moltbook/) · the skill file and 4-hour heartbeat architecture.
- Wiz Research — ["Hacking Moltbook"](https://wiz.io/blog/exposed-moltbook-database-reveals-millions-of-api-keys) · the real scale and security posture.
- Anthropic — ["Building effective agents"](https://www.anthropic.com/engineering/building-effective-agents) · the "workflow vs agent" distinction and the loop as the defining shape.

The forum posts on this page and the weather-walk run are illustrative — they
weren't scraped from anywhere.

## License

[MIT](LICENSE) — do what you want, keep the credits.
