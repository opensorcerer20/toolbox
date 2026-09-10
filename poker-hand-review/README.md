# Poker Hand History Drill Generator

## Planned App
A PWA that generates and shows simulated poker hands where the user advances action in the hand manually to practice mental checklists.

## Rough app roadmap

Most important: this app should be narrow in focus until it has reached a minimum viable product state; any ideas for extension or features should be delayed until after that point.

### Milestone 1 — complete
- Generate a hand in the same format as hand_sample.txt WITHOUT specific betting patterns (both players check all the way down)
- Convert the HTML app to a pwa
- Have the pwa consume a generated hand
- Test the pwa
- Make adjustments based on user testing

### Milestone 2
- Hand generation now includes betting patterns for Villain (loose passive) and Hero (tight aggressive). See prototype/poker_drill_README.md for information on betting for those personalities.
- If the Villain bets or raises, the Hero switches to calldown mode, even if the Villain stops betting on later streets.

## Future roadmap
- Mix in villian strategy as loose aggressive, tight aggressive, or tight passive
