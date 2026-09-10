/*
 * Tests for ../src/generate_hand.js
 *
 * The generator is pure and randomized, so the useful assertions are invariants rather than fixed
 * expected output: whatever cards and seating come out, the nine cards must be distinct, the text
 * must match the hand-history format exactly, and the heads-up convention must hold - button posts
 * the small blind, acts first preflop, acts last on every postflop street. Step 1 hands contain no
 * betting at all, so any bet/raise/fold line is a failure.
 *
 * Run it:
 *
 *     node tests/generate_hand_test.js        # from poker-hand-review/
 *
 * Exits 0 when every check passes, 1 otherwise.
 */
const { generateHand, handToText } = require('../src/generate_hand.js');

const HANDS = 200;
const CARD = /^[23456789TJQKA][shdc]$/;

let failures = 0;

function check(name, fn) {
  try {
    fn();
    console.log('  ok   ' + name);
  } catch (e) {
    failures++;
    console.log('  FAIL ' + name + '\n         ' + e.message);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(msg + '\n         expected: ' + JSON.stringify(expected) +
                          '\n         actual:   ' + JSON.stringify(actual));
  }
}

// Every hand this run, so a failure can name the hand it came from.
const hands = [];
for (let i = 0; i < HANDS; i++) hands.push(generateHand());

function each(fn) {
  hands.forEach((hand, i) => {
    try {
      fn(hand);
    } catch (e) {
      throw new Error('hand ' + i + ' (#' + hand.handNumber + '): ' + e.message);
    }
  });
}

// The full hand history, rebuilt from the structured fields. If the text and the structure ever
// disagree - a board card that only made it into one of them, say - this is what catches it.
function expectedLines(hand) {
  const btn = hand.heroBtn ? 'Hero' : 'Villain';
  const bb = hand.heroBtn ? 'Villain' : 'Hero';
  const flop = '[' + hand.board.flop.join(' ') + ']';
  const turn = flop + ' [' + hand.board.turn + ']';
  const river = turn + ' [' + hand.board.river + ']';
  return [
    'Hand #' + hand.handNumber + ":  Hold'em No Limit ($1/$2 USD)",
    "Table 'Drill Table' 6-max Seat #1 is the button",
    'Seat 1: ' + btn + ' ($200 in chips)',
    'Seat 4: ' + bb + ' ($200 in chips)',
    btn + ': posts small blind $1',
    bb + ': posts big blind $2',
    '*** HOLE CARDS ***',
    'Dealt to Hero [' + hand.heroCards.join(' ') + ']',
    btn + ' calls $1',
    bb + ' checks',
    '*** FLOP *** ' + flop,
    bb + ' checks',
    btn + ' checks',
    '*** TURN *** ' + turn,
    bb + ' checks',
    btn + ' checks',
    '*** RIVER *** ' + river,
    bb + ' checks',
    btn + ' checks',
    '*** SHOWDOWN ***',
    'Hero shows [' + hand.heroCards.join(' ') + ']',
    'Villain shows [' + hand.villainCards.join(' ') + ']'
  ];
}

function allCards(hand) {
  return hand.heroCards
    .concat(hand.villainCards)
    .concat(hand.board.flop)
    .concat([hand.board.turn, hand.board.river]);
}

console.log('generate_hand.js — ' + HANDS + ' hands\n');

console.log('cards');
check('nine cards per hand, all well-formed', () => each(hand => {
  const cards = allCards(hand);
  assertEqual(cards.length, 9, 'wrong card count');
  cards.forEach(c => assert(CARD.test(c), 'malformed card ' + JSON.stringify(c)));
}));
check('no card is dealt twice', () => each(hand => {
  const cards = allCards(hand);
  assertEqual(new Set(cards).size, 9, 'duplicate card in ' + cards.join(' '));
}));
check('cards vary between hands', () => {
  const seen = new Set(hands.map(h => allCards(h).join(' ')));
  assert(seen.size === HANDS, 'two hands dealt identical cards');
});

console.log('\nhand history text');
check('every line matches the expected format, in order', () => each(hand => {
  const expected = expectedLines(hand);
  const actual = hand.lines.map(l => l.text);
  assertEqual(actual.length, expected.length, 'wrong line count');
  expected.forEach((text, i) => assertEqual(actual[i], text, 'line ' + i + ' differs'));
}));
check('hand number is nine digits', () => each(hand => {
  assert(/^\d{9}$/.test(String(hand.handNumber)), 'bad hand number ' + hand.handNumber);
}));
check('handToText joins the lines and ends with a newline', () => each(hand => {
  assertEqual(handToText(hand), hand.lines.map(l => l.text).join('\n') + '\n', 'bad text');
}));

console.log('\nno betting (Step 1)');
check('no bet, raise, or fold anywhere', () => each(hand => {
  hand.lines.forEach(l => {
    assert(!/\b(bets|raises|folds)\b/.test(l.text), 'betting line: ' + l.text);
  });
}));
check('one check preflop, six postflop', () => each(hand => {
  const checks = t => hand.lines.filter(l => l.type === t && / checks$/.test(l.text)).length;
  assertEqual(checks('preflop'), 1, 'wrong preflop check count');
  assertEqual(checks('flop') + checks('turn') + checks('river'), 6, 'wrong postflop check count');
}));
check('pot is the two big blinds', () => each(hand => assertEqual(hand.pot, 4, 'wrong pot')));

console.log('\nheads-up convention');
check('both button orientations occur', () => {
  assert(hands.some(h => h.heroBtn), 'Hero was never on the button');
  assert(hands.some(h => !h.heroBtn), 'Villain was never on the button');
});
check('the button posts the small blind and sits in Seat 1', () => each(hand => {
  const btn = hand.heroBtn ? 'Hero' : 'Villain';
  const seat1 = hand.lines.find(l => l.text.startsWith('Seat 1: '));
  const sb = hand.lines.find(l => / posts small blind /.test(l.text));
  assert(seat1.text.startsWith('Seat 1: ' + btn + ' '), 'button not in Seat 1: ' + seat1.text);
  assert(sb.text.startsWith(btn + ':'), 'button did not post the small blind: ' + sb.text);
}));
check('the button acts first preflop, last on every postflop street', () => each(hand => {
  const btn = hand.heroBtn ? 'Hero' : 'Villain';
  const bb = hand.heroBtn ? 'Villain' : 'Hero';
  const actors = t => hand.lines.filter(l => l.type === t).map(l => l.text.split(' ')[0]);
  assertEqual(actors('preflop').join(','), btn + ',' + bb, 'wrong preflop order');
  ['flop', 'turn', 'river'].forEach(street => {
    assertEqual(actors(street).join(','), bb + ',' + btn, 'wrong ' + street + ' order');
  });
}));

console.log('\nline metadata');
check('street markers carry the street they open', () => each(hand => {
  const markers = hand.lines.filter(l => l.street).map(l => l.street);
  assertEqual(markers.join(','), 'flop,turn,river', 'wrong street markers');
  hand.lines.filter(l => l.street).forEach(l => {
    assert(l.type === 'street', 'street marker has type ' + l.type);
    assert(l.text.startsWith('*** ' + l.street.toUpperCase() + ' ***'), 'mismatched: ' + l.text);
  });
}));

console.log('\n' + (failures ? failures + ' check(s) failed' : 'all checks passed'));
process.exit(failures ? 1 : 0);
