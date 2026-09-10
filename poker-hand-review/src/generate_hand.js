/*
 * Generates one randomized heads-up hand with no betting in it: the small blind completes, the
 * big blind checks, and both players check every postflop street to showdown. Milestone 1 of the
 * roadmap deliberately leaves betting out - villain personalities and bet sizing arrive in
 * Milestone 2.
 *
 * Pure: no DOM, no globals, no I/O. An ES module, so the page loads it with
 * <script type="module"> and the tests import it directly.
 *
 * Heads-up blind convention: the button posts the small blind, acts first preflop, and acts last
 * on every postflop street. The button always occupies Seat 1.
 */
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const SUITS = ['s', 'h', 'd', 'c'];

const SMALL_BLIND = 1;
const BIG_BLIND = 2;
const STACK = 200;
const HERO = 'Hero';
const VILLAIN = 'Villain';

// Line types carrying a voluntary action, as opposed to the header, the blinds and the deal.
export const ACTION_TYPES = new Set(['preflop', 'flop', 'turn', 'river']);

// Draws a card not already in `used`, and records it there.
function draw(used) {
  let card;
  do {
    card = RANKS[Math.floor(Math.random() * RANKS.length)] +
           SUITS[Math.floor(Math.random() * SUITS.length)];
  } while (used.includes(card));
  used.push(card);
  return card;
}

export function generateHand() {
  const used = [];
  const heroCards = [draw(used), draw(used)];
  const villainCards = [draw(used), draw(used)];
  const flop = [draw(used), draw(used), draw(used)];
  const turn = draw(used);
  const river = draw(used);

  const heroBtn = Math.random() < 0.5;
  const button = heroBtn ? HERO : VILLAIN;        // small blind, acts first preflop
  const bigBlind = heroBtn ? VILLAIN : HERO;      // acts first postflop
  const handNumber = Math.floor(100000000 + Math.random() * 899999999);

  const lines = [];
  function push(type, text, street) {
    const line = { type, text };
    if (street) line.street = street;
    lines.push(line);
  }

  push('meta', `Hand #${handNumber}:  Hold'em No Limit ($${SMALL_BLIND}/$${BIG_BLIND} USD)`);
  push('meta', "Table 'Drill Table' 6-max Seat #1 is the button");
  push('meta', `Seat 1: ${button} ($${STACK} in chips)`);
  push('meta', `Seat 4: ${bigBlind} ($${STACK} in chips)`);
  push('blind', `${button}: posts small blind $${SMALL_BLIND}`);
  push('blind', `${bigBlind}: posts big blind $${BIG_BLIND}`);

  push('holecards', '*** HOLE CARDS ***');
  push('holecards', `Dealt to ${HERO} [${heroCards.join(' ')}]`);
  push('preflop', `${button} calls $${BIG_BLIND - SMALL_BLIND}`);
  push('preflop', `${bigBlind} checks`);

  let board = `[${flop.join(' ')}]`;
  push('street', `*** FLOP *** ${board}`, 'flop');
  push('flop', `${bigBlind} checks`);
  push('flop', `${button} checks`);

  board += ` [${turn}]`;
  push('street', `*** TURN *** ${board}`, 'turn');
  push('turn', `${bigBlind} checks`);
  push('turn', `${button} checks`);

  board += ` [${river}]`;
  push('street', `*** RIVER *** ${board}`, 'river');
  push('river', `${bigBlind} checks`);
  push('river', `${button} checks`);

  push('street', '*** SHOWDOWN ***');
  push('street', `${HERO} shows [${heroCards.join(' ')}]`);
  push('street', `${VILLAIN} shows [${villainCards.join(' ')}]`);

  return {
    handNumber,
    heroBtn,
    heroCards,
    villainCards,
    board: { flop, turn, river },
    pot: BIG_BLIND * 2,
    lines
  };
}

/*
 * Index of Hero's first action - the first decision the drill actually asks about. Everything
 * before it is setup: the table header, the forced blinds, the deal, and any villain action that
 * precedes Hero's turn.
 *
 * Posting a blind is not an action and neither is being dealt to, so the answer moves with the
 * seating: 8 when Hero is on the button, 9 when Hero is in the big blind and Villain has completed
 * first. Falls back to just past the deal if Hero never acts, which cannot happen while every hand
 * is checked down but could once Hero can fold.
 */
export function heroFirstActionIndex(hand) {
  const isHeroAction = line => ACTION_TYPES.has(line.type) && line.text.startsWith(`${HERO} `);
  const found = hand.lines.findIndex(isHeroAction);
  if (found !== -1) return found;
  return hand.lines.findIndex(line => line.text.startsWith(`Dealt to ${HERO}`)) + 1;
}

// The hand as it would appear in a hand-history file.
export function handToText(hand) {
  return hand.lines.map(line => line.text).join('\n') + '\n';
}
