/*
 * Tests for ../src/generate_hand.js
 *
 * The generator is pure and randomized, so the useful assertions are invariants rather than fixed
 * expected output: whatever cards and seating come out, the nine cards must be distinct, the text
 * must match the hand-history format exactly, and the heads-up convention must hold - button posts
 * the small blind, acts first preflop, acts last on every postflop street. Milestone 1 hands
 * contain no betting at all, so any bet/raise/fold line is a failure.
 *
 * Each test loops over the whole sample of hands rather than becoming a subtest per hand, so a
 * green run reports thirteen checks instead of thousands.
 *
 * Run it:
 *
 *     node --test        # from poker-hand-review/, or: npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ACTION_TYPES, generateHand, handToText, heroFirstActionIndex } from '../src/generate_hand.js';

const HANDS = 200;
const CARD = /^[23456789TJQKA][shdc]$/;

// One sample shared by every test, so a failure can name the hand it came from.
const hands = Array.from({ length: HANDS }, generateHand);

function each(fn) {
  hands.forEach((hand, i) => {
    try {
      fn(hand);
    } catch (e) {
      e.message = `hand ${i} (#${hand.handNumber}): ${e.message}`;
      throw e;
    }
  });
}

/*
 * The full hand history, rebuilt from the structured fields. If the text and the structure ever
 * disagree - a board card that only made it into one of them, say - this is what catches it.
 *
 * Several checks below overlap with this one on purpose (no betting, the check counts, and both
 * heads-up ordering checks). They restate Milestone 1's constraints by name so that loosening this
 * helper cannot quietly stop testing them.
 */
function expectedLines(hand) {
  const btn = hand.heroBtn ? 'Hero' : 'Villain';
  const bb = hand.heroBtn ? 'Villain' : 'Hero';
  const flop = `[${hand.board.flop.join(' ')}]`;
  const turn = `${flop} [${hand.board.turn}]`;
  const river = `${turn} [${hand.board.river}]`;
  return [
    `Hand #${hand.handNumber}:  Hold'em No Limit ($1/$2 USD)`,
    "Table 'Drill Table' 6-max Seat #1 is the button",
    `Seat 1: ${btn} ($200 in chips)`,
    `Seat 4: ${bb} ($200 in chips)`,
    `${btn}: posts small blind $1`,
    `${bb}: posts big blind $2`,
    '*** HOLE CARDS ***',
    `Dealt to Hero [${hand.heroCards.join(' ')}]`,
    `${btn} calls $1`,
    `${bb} checks`,
    `*** FLOP *** ${flop}`,
    `${bb} checks`,
    `${btn} checks`,
    `*** TURN *** ${turn}`,
    `${bb} checks`,
    `${btn} checks`,
    `*** RIVER *** ${river}`,
    `${bb} checks`,
    `${btn} checks`,
    '*** SHOWDOWN ***',
    `Hero shows [${hand.heroCards.join(' ')}]`,
    `Villain shows [${hand.villainCards.join(' ')}]`
  ];
}

function allCards(hand) {
  return [
    ...hand.heroCards,
    ...hand.villainCards,
    ...hand.board.flop,
    hand.board.turn,
    hand.board.river
  ];
}

describe('cards', () => {
  it('deals nine cards per hand, all well-formed', () => each(hand => {
    const cards = allCards(hand);
    assert.equal(cards.length, 9, 'wrong card count');
    cards.forEach(c => assert.ok(CARD.test(c), `malformed card ${JSON.stringify(c)}`));
  }));

  it('never deals the same card twice', () => each(hand => {
    const cards = allCards(hand);
    assert.equal(new Set(cards).size, 9, `duplicate card in ${cards.join(' ')}`);
  }));

  it('varies the cards between hands', () => {
    const seen = new Set(hands.map(h => allCards(h).join(' ')));
    assert.equal(seen.size, HANDS, 'two hands dealt identical cards');
  });
});

describe('hand history text', () => {
  it('matches the expected format, line for line', () => each(hand => {
    assert.deepEqual(hand.lines.map(l => l.text), expectedLines(hand));
  }));

  it('numbers the hand with nine digits', () => each(hand => {
    assert.match(String(hand.handNumber), /^\d{9}$/, 'bad hand number');
  }));

  it('joins the lines and ends with a newline in handToText', () => each(hand => {
    assert.equal(handToText(hand), hand.lines.map(l => l.text).join('\n') + '\n');
  }));
});

describe('no betting (Milestone 1)', () => {
  it('contains no bet, raise, or fold', () => each(hand => {
    hand.lines.forEach(l => {
      assert.doesNotMatch(l.text, /\b(bets|raises|folds)\b/, 'betting line');
    });
  }));

  it('checks once preflop and six times postflop', () => each(hand => {
    const checks = type => hand.lines.filter(l => l.type === type && / checks$/.test(l.text)).length;
    assert.equal(checks('preflop'), 1, 'wrong preflop check count');
    assert.equal(checks('flop') + checks('turn') + checks('river'), 6, 'wrong postflop check count');
  }));

  it('leaves the pot at the two big blinds', () => each(hand => {
    assert.equal(hand.pot, 4, 'wrong pot');
  }));
});

describe('heads-up convention', () => {
  it('puts each player on the button across a run', () => {
    assert.ok(hands.some(h => h.heroBtn), 'Hero was never on the button');
    assert.ok(hands.some(h => !h.heroBtn), 'Villain was never on the button');
  });

  it('seats the button in Seat 1 and has it post the small blind', () => each(hand => {
    const btn = hand.heroBtn ? 'Hero' : 'Villain';
    const seat1 = hand.lines.find(l => l.text.startsWith('Seat 1: '));
    const sb = hand.lines.find(l => / posts small blind /.test(l.text));
    assert.ok(seat1.text.startsWith(`Seat 1: ${btn} `), `button not in Seat 1: ${seat1.text}`);
    assert.ok(sb.text.startsWith(`${btn}:`), `button did not post the small blind: ${sb.text}`);
  }));

  it('acts the button first preflop and last on every postflop street', () => each(hand => {
    const btn = hand.heroBtn ? 'Hero' : 'Villain';
    const bb = hand.heroBtn ? 'Villain' : 'Hero';
    const actors = type => hand.lines.filter(l => l.type === type).map(l => l.text.split(' ')[0]);
    assert.deepEqual(actors('preflop'), [btn, bb], 'wrong preflop order');
    for (const street of ['flop', 'turn', 'river']) {
      assert.deepEqual(actors(street), [bb, btn], `wrong ${street} order`);
    }
  }));
});

describe("Hero's first action", () => {
  it('points at a Hero action with no earlier one', () => each(hand => {
    const idx = heroFirstActionIndex(hand);
    const line = hand.lines[idx];
    assert.ok(line, `index ${idx} is past the end of the hand`);
    assert.ok(ACTION_TYPES.has(line.type), `not an action line: ${line.text}`);
    assert.ok(line.text.startsWith('Hero '), `not Hero's line: ${line.text}`);
    const earlier = hand.lines.slice(0, idx)
      .find(l => ACTION_TYPES.has(l.type) && l.text.startsWith('Hero '));
    assert.equal(earlier, undefined, `Hero acted earlier: ${earlier && earlier.text}`);
  }));

  it('lands after the deal, and after any villain action preceding it', () => each(hand => {
    const idx = heroFirstActionIndex(hand);
    // 8 when Hero is on the button, 9 when Villain completes the small blind first.
    assert.equal(idx, hand.heroBtn ? 8 : 9, 'wrong stop point');
    assert.ok(
      hand.lines.slice(0, idx).some(l => l.text.startsWith('Dealt to Hero')),
      'Hero acts before being dealt to'
    );
  }));
});

describe('line metadata', () => {
  it('marks each street opener with the street it opens', () => each(hand => {
    const markers = hand.lines.filter(l => l.street);
    assert.deepEqual(markers.map(l => l.street), ['flop', 'turn', 'river']);
    markers.forEach(l => {
      assert.equal(l.type, 'street', 'street marker has the wrong type');
      assert.ok(l.text.startsWith(`*** ${l.street.toUpperCase()} ***`), `mismatched: ${l.text}`);
    });
  }));
});
