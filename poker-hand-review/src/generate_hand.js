/*
 * Generates one randomized heads-up hand where both players bet according to a personality and to
 * what they actually hold.
 *
 *   Villain, loose-passive:  bets or raises on top pair or better, otherwise checks and calls.
 *                            Never folds, never opens the betting preflop.
 *   Hero, tight-aggressive:  opens a tight range preflop; postflop value bets top pair or better,
 *                            and c-bets the flop a third of the time with nothing when he raised
 *                            preflop. Never raises - facing a bet, he calls.
 *
 * Once Villain bets or raises, Hero switches to calldown mode and only checks and calls for the
 * rest of the hand, even if Villain goes quiet again on a later street.
 *
 * Nobody folds, so every hand reaches showdown. Pot arithmetic is chip-exact and every line carries
 * the pot as it stood after that action.
 *
 * Pure and seeded: no DOM, no globals, and the same seed always deals the same hand.
 *
 * Heads-up blind convention: the button posts the small blind, acts first preflop, and acts last
 * on every postflop street. The button always occupies Seat 1.
 */
import { createRng, randomSeed } from './rng.js';
import { isTopPairOrBetter, rankValue } from './evaluate_hand.js';

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const SUITS = ['s', 'h', 'd', 'c'];

const SMALL_BLIND = 1;
const BIG_BLIND = 2;
const STACK = 200;
const HERO = 'Hero';
const VILLAIN = 'Villain';

const PREFLOP_RAISE = 6;              // three big blinds, the standard heads-up open
const CBET_FREQUENCY = 0.33;          // how often Hero fires the flop having missed it
const VILLAIN_RAISE_MULTIPLE = 3;     // a passive player's raise: three times the bet faced

// Bet size as a fraction of the pot. Villain bets big and sticky; Hero sizes down.
const BET_SIZING = {
  [HERO]: { flop: 0.33, turn: 0.5, river: 0.5 },
  [VILLAIN]: { flop: 0.55, turn: 0.6, river: 0.6 }
};

// Line types carrying a voluntary action, as opposed to the header, the blinds and the deal.
export const ACTION_TYPES = new Set(['preflop', 'flop', 'turn', 'river']);

const STREETS = ['flop', 'turn', 'river'];
const other = player => (player === HERO ? VILLAIN : HERO);

// Draws a card not already in `used`, and records it there.
function draw(used, rng) {
  let card;
  do {
    card = RANKS[Math.floor(rng() * RANKS.length)] + SUITS[Math.floor(rng() * SUITS.length)];
  } while (used.includes(card));
  used.push(card);
  return card;
}

/*
 * Hero's preflop opening range - roughly the tightest 20% of hands, which is what makes him a TAG
 * rather than someone who raises at random. Anything outside it limps or checks, so limped pots are
 * a normal outcome rather than an accident.
 */
function heroOpens([first, second]) {
  const high = Math.max(rankValue(first), rankValue(second));
  const low = Math.min(rankValue(first), rankValue(second));
  const suited = first[1] === second[1];

  if (high === low) return true;                         // any pocket pair
  if (low >= 10) return true;                            // two broadway cards
  if (suited && high === 14) return true;                // any suited ace
  if (suited && high - low <= 1 && low >= 6) return true; // suited connectors and one-gappers
  return false;
}

export function generateHand({ seed = randomSeed() } = {}) {
  const rng = createRng(seed);

  const used = [];
  const heroCards = [draw(used, rng), draw(used, rng)];
  const villainCards = [draw(used, rng), draw(used, rng)];
  const flop = [draw(used, rng), draw(used, rng), draw(used, rng)];
  const turn = draw(used, rng);
  const river = draw(used, rng);

  const heroBtn = rng() < 0.5;
  const button = heroBtn ? HERO : VILLAIN;        // small blind, acts first preflop
  const bigBlind = heroBtn ? VILLAIN : HERO;      // acts first postflop
  const handNumber = Math.floor(100000000 + rng() * 899999999);
  const holeCards = { [HERO]: heroCards, [VILLAIN]: villainCards };

  // Chips already collected from finished streets, plus what each player has put in on this one.
  let settled = 0;
  let committed = { [HERO]: 0, [VILLAIN]: 0 };
  const pot = () => settled + committed[HERO] + committed[VILLAIN];

  let heroRaisedPreflop = false;
  let calldown = false;          // latches on Villain's first bet or raise, and never clears

  const lines = [];
  function push(type, text, street) {
    const line = { type, text, pot: pot() };
    if (street) line.street = street;
    lines.push(line);
  }

  // A bet sized off the current pot, in whole dollars. Never below the big blind - a smaller bet
  // is not legal at these stakes - and never more than a player has left.
  const betSize = (actor, street) =>
    Math.min(
      Math.max(BIG_BLIND, Math.round(pot() * BET_SIZING[actor][street])),
      STACK - committed[actor]
    );

  /*
   * What a player does when it is on them. `owed` is the difference they must call to stay in;
   * zero means the betting is open to them. Nobody ever folds, so every branch ends in a call, a
   * check, a bet or a raise.
   */
  function decide(actor, street, owed, board) {
    const strong = isTopPairOrBetter(holeCards[actor], board);

    if (street === 'preflop') {
      if (actor === HERO && heroOpens(heroCards) && committed[VILLAIN] <= BIG_BLIND) {
        return { action: 'raise', to: PREFLOP_RAISE };
      }
      return owed ? { action: 'call' } : { action: 'check' };   // Villain limps, calls, checks
    }

    if (actor === HERO) {
      if (calldown) return owed ? { action: 'call' } : { action: 'check' };
      if (owed) return { action: 'call' };                      // Hero never raises
      if (strong) return { action: 'bet' };
      if (street === 'flop' && heroRaisedPreflop && rng() < CBET_FREQUENCY) {
        return { action: 'bet' };
      }
      return { action: 'check' };
    }

    if (strong) return owed ? { action: 'raise', to: VILLAIN_RAISE_MULTIPLE * committed[HERO] } : { action: 'bet' };
    return owed ? { action: 'call' } : { action: 'check' };
  }

  /*
   * Runs one street's betting. Players act in turn, and a bet or a raise re-opens the action: the
   * opponent owes a response and becomes the only player left to act, whether or not they had
   * already acted this street. Since Hero never re-raises, a street is capped at bet-raise-call
   * and cannot loop.
   */
  function playStreet(street, board) {
    let queue = street === 'preflop' ? [button, bigBlind] : [bigBlind, button];

    while (queue.length) {
      const actor = queue.shift();
      const opponent = other(actor);
      const owed = committed[opponent] - committed[actor];
      const { action, to } = decide(actor, street, owed, board);

      if (action === 'check') {
        push(street, `${actor} checks`);
      } else if (action === 'call') {
        committed[actor] += owed;
        push(street, `${actor} calls $${owed}`);
      } else if (action === 'bet') {
        const amount = betSize(actor, street);
        committed[actor] += amount;
        push(street, `${actor} bets $${amount}`);
        if (actor === VILLAIN) calldown = true;
        queue = [opponent];
      } else {
        const total = Math.min(to, STACK);
        committed[actor] = total;
        push(street, `${actor} raises to $${total}`);
        if (actor === VILLAIN) calldown = true;
        if (actor === HERO && street === 'preflop') heroRaisedPreflop = true;
        queue = [opponent];
      }
    }

    settled = pot();
    committed = { [HERO]: 0, [VILLAIN]: 0 };
  }

  push('meta', `Hand #${handNumber}:  Hold'em No Limit ($${SMALL_BLIND}/$${BIG_BLIND} USD)`);
  push('meta', "Table 'Drill Table' 6-max Seat #1 is the button");
  push('meta', `Seat 1: ${button} ($${STACK} in chips)`);
  push('meta', `Seat 4: ${bigBlind} ($${STACK} in chips)`);

  committed[button] = SMALL_BLIND;
  push('blind', `${button}: posts small blind $${SMALL_BLIND}`);
  committed[bigBlind] = BIG_BLIND;
  push('blind', `${bigBlind}: posts big blind $${BIG_BLIND}`);

  push('holecards', '*** HOLE CARDS ***');
  push('holecards', `Dealt to ${HERO} [${heroCards.join(' ')}]`);
  playStreet('preflop', []);

  const board = [];
  let boardText = '';
  for (const street of STREETS) {
    const dealt = street === 'flop' ? flop : street === 'turn' ? [turn] : [river];
    board.push(...dealt);
    boardText += `${boardText ? ' ' : ''}[${dealt.join(' ')}]`;
    push('street', `*** ${street.toUpperCase()} *** ${boardText}`, street);
    playStreet(street, board);
  }

  push('street', '*** SHOWDOWN ***');
  push('street', `${HERO} shows [${heroCards.join(' ')}]`);
  push('street', `${VILLAIN} shows [${villainCards.join(' ')}]`);

  return {
    seed,
    handNumber,
    heroBtn,
    heroCards,
    villainCards,
    board: { flop, turn, river },
    pot: settled,
    lines
  };
}

/*
 * Index of Hero's first action - the first decision the drill actually asks about. Everything
 * before it is setup: the table header, the forced blinds, the deal, and any villain action that
 * precedes Hero's turn.
 *
 * Posting a blind is not an action and neither is being dealt to, so the answer moves with the
 * seating: 8 when Hero is on the button, 9 when Villain has acted first. Falls back to just past
 * the deal if Hero never acts, which cannot happen while nobody folds.
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
