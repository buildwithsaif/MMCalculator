# Mosquito Mike Package Calculator

Live site: https://buildwithsaif.github.io/MMCalculator/

A static HTML/CSS/JS calculator that recommends Mosquito Mike service packages based on customer property size and preferences. Deployed via GitHub Pages — any push to `main` goes live in a minute or two.

## Working on this project from a new computer

### One-time setup

1. **Install Git** — https://git-scm.com/downloads
2. **Install Claude Code**
3. **Install GitHub Desktop** (easiest way to handle GitHub auth) — https://desktop.github.com/ — sign in once and it'll set up git credentials automatically
4. **Clone the repo** in a terminal:
   ```
   git clone https://github.com/buildwithsaif/MMCalculator.git
   ```

### Daily workflow (when editing from multiple computers)

**Before editing — always pull first:**
```
git pull
```
This grabs any changes made from your other computer.

**After editing** — Claude Code (or you) will commit and push changes to GitHub. GitHub Pages auto-deploys to the live site within a minute or two.

### The one rule

**Never edit on both computers without pulling first.** If you edited at work, pushed, then came home — run `git pull` at home before making changes. Otherwise you'll get merge conflicts.

## Project files

- `index.html` — main page structure
- `calculator.js` — all the recommendation logic, pitches, and package data
- `config.js` — pricing tiers and package prices by property size
- `styles.css` — styling
- `logo.png`, `MM_Calculator_Icon-9.png` — branding assets
