# Handoff: Poker Hand History Drill Generator

## What this is
A single-file HTML tool (`poker_drill.html`) for drilling poker hand-reading skills.
It generates a randomized poker hand, reveals it one atomic action at a time in
authentic PokerStars-style hand-history syntax, and mirrors the same action on a
simple table mockup. Currently lives as a Claude.ai published Artifact
(self-contained HTML, inline CSS/JS, no external dependencies or build step).

**Origin context:** built inside a Claude.ai chat for a live 1/2 cash-game player
working on hand-reading discipline (see "Design intent" below for the pedagogical
goals — these should be preserved/extended, not just the code).

## Current file
- `poker_drill.html` — the entire app. Plain HTML/CSS/vanilla JS, no framework,
  no build tooling. Runs by opening in a browser.

## How it currently works
- `buildHand()` randomly picks: position (`In position` / `Out of position`),
  villain type (`Loose-passive`, `Loose-aggressive`, `Tight-aggressive`), hero
  hole cards, villain hole cards, flop/turn/river cards (all drawn from a shared
  "used cards" pool so no duplicates).
- Villain type drives bet-sizing on each street via fixed percentages:
  - Station: ~55-60% pot
  - Bully: ~75-100% pot
  - TAG: ~33% c-bet flop, checks back turn
- All hand events are pushed into a flat `lines[]` array as `{type, text, ...}`
  objects — this **is** the "atomic event log" the user asked for. Each call to
  `revealNext()` increments `lineIdx` by 1 and re-renders.
- Two views, toggled by tabs: `Table view` (seats, board, pot, per-seat last
  action) and `Hand history log` (raw text lines, newest line on top per user's
  last requested change).
- A fixed 5-question checklist is always visible below the controls (position,
  board texture, bet size vs pot, range parity, action pattern change) — this
  is a static teaching aid, not derived from hand state.
- After the last line reveals, an "answer key" reveal shows both hole cards,
  villain tendency description, and full board.

## Known limitations (flagged to the user already)
- Only ONE fixed action pattern per street per villain type — no branching
  (no raises, 3-bets, folds, or check-raises in the postflop lines). After
  ~15-20 hands the generator's "shape" becomes recognizable rather than feeling
  fresh, which undermines the drilling goal.
- Pot tracking math is approximate/simplified, not exact chip-accurate.
- Villain hole cards are fully random — not constructed to be *consistent*
  with the villain's typical range (e.g. a "station" could randomly get dealt
  a hand that doesn't fit their profile). This weakens the pedagogical value
  since real reads depend on range-consistent villain hands.
- No difficulty/scenario targeting — the user has separately expressed
  interest in generating hands weighted toward specific weak spots (e.g.
  "value betting top pair, how many streets to fire").
- Preflop action is fixed as "raise + call" every hand — no limps, 3-bets,
  or squeezes.
- Single villain only (heads-up pots) — no multi-way pots.

## Design intent — please preserve/extend, don't drop
This tool exists to support a specific drilling *method*, not just to be a game:
1. **Atomic, one-line-at-a-time reveal** is intentional — the user is training
   themselves to extract the fixed 5 checklist answers from minimal information
   per street, under time pressure, before allowing themselves to reason further.
2. **Randomized-but-structurally-repeatable** hands were explicitly requested:
   the user wants to redo "the same exercise" without it being obviously the
   same hand at first glance. Templated randomization (villain-type-driven
   sizing, random cards) is the mechanism for this — don't replace it with
   fully free-form/generative hands unless still constrained enough to be
   quickly repeatable.
3. **Authentic hand-history syntax** (PokerStars-style) was a specific request,
   not incidental — the user wants practice reading the real format, and
   separately wants the parallel table-mockup view because that's how some
   real hand-history review UIs work.
4. The 5-question checklist is a fixed, unchanging mental script the user is
   trying to make automatic — it should stay visible and NOT be made dynamic
   or hand-specific, even though the tool "knows" more about the hand.

## Suggested next steps (not committed to, just plausible directions)
- Add branching action lines (raises, folds, check-raises) per street,
  possibly still keyed off villain type so the *tendency* stays legible.
- Make villain hole cards range-consistent with their type (e.g. stations
  more likely to have made hands than bluffs by the river).
- Add a scenario-weighting option to bias generation toward specific spots
  the user is actively working on (top-pair multi-street value betting was
  named as a current weak spot).
- Tighten pot math to be chip-exact if it matters for realism.
- Consider persisting a simple hand log/session history (would need the
  window.storage / artifact persistence pattern if kept as a Claude.ai
  Artifact, or plain localStorage if shipped as a standalone static app
  outside Claude.ai).

## Non-goals / things not to change without checking
- Don't add real-money, gambling, or bet-tracking-for-stakes features — this
  is a solitary study tool for pattern recognition, not a play-money or
  real-money poker product.
- Don't turn the fixed 5-question checklist into hand-specific dynamic hints
  — the whole point is that it's the same questions every time.
