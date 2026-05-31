# When Productivity Is Not Enough

*Forecasting AI's reshaping of the creative economy, 2026–2030.*

A public interactive web essay submitted for **ECON1626** (AI Future Forecast assignment).

---

## What this is

An AI 2027-style forecast that argues AI will reshape the creative economy along a specific binary fork, triggered by the US response to EU AI Act enforcement in mid-2027. The essay distinguishes between *instrumental* and *expressive* creative work, traces AI capability across visual art, music, and writing, and forecasts two divergent paths through 2030.

The site has three parts:

| File | What it is |
| --- | --- |
| `index.html` | Landing page with a three-round interactive quiz (can you tell AI from human work?) |
| `forecast.html` | The main essay with embedded visualizations |
| `about.html` | Methods, AI disclosure, and full reference list |

## How to navigate

- Start at `index.html` to take the quiz (takes about 2 minutes).
- Or skip directly to `forecast.html` if you want to read the essay.
- `about.html` has the methods, AI tooling disclosure, and Harvard references.

## Repository structure

```
econ1626-ai-future-forecast/
├── README.md                  # This file
├── index.html                 # Quiz landing page
├── forecast.html              # The essay
├── about.html                 # Methods and references
├── css/
│   ├── base.css               # Typography, palette, layout
│   └── components.css         # Quiz, visualizations, special UI
├── js/
│   └── quiz.js                # Quiz interaction logic
└── assets/
    ├── images/quiz/           # Quiz image pairs (visual art domain)
    ├── audio/quiz/            # Quiz audio clips (music domain)
    └── data/
        └── quiz.json          # Quiz content and seed statistics
```

## Tech notes

- **Static site, no backend.** Deployable directly to GitHub Pages.
- **No external dependencies beyond Google Fonts** (Newsreader, Fraunces, JetBrains Mono).
- **Quiz data is stored client-side only.** Aggregate statistics shown after the quiz are illustrative, seeded from cited published research (NPR/Luminate 2026, Authors Guild 2025, Otis College 2026), not collected from visitors. See `about.html` for full methodology disclosure.

## AI Disclosure

This essay was developed with AI assistance at every stage (brainstorming, research synthesis, structural feedback, drafting demonstration). The final writing and all original claims are mine. Full disclosure is in `about.html`.

This disclosure is part of the argument. The essay is about what AI does to authorship; writing it with an AI collaborator is the most direct evidence I have for the ideation/execution distinction at its centre.

## Author

Submitted by Truong Minh Ngoc for ECON1626, May 2026.

Prior work referenced: [AI labour market policy proposal](https://github.com/MinhNgocTr01/econ1626-labour-policy-proposal.-/blob/main/proposal.md).
