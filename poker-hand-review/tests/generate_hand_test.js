/*
 * Tests for ../src/generate_hand.js
 *
 * Betting branches, so the invariants matter more than any one line: money must add up, the
 * personalities must match the cards, and calldown must latch. Those are the things that fail
 * silently - a hand with a wrong pot or a villain betting air still reads as a normal hand.
 * Anything that would be obvious the moment you play a hand is left to the browser.
 *
 * Seeding makes this possible: the sample below is the same 200 hands on every run, and the
 * spot-checks name a seed whose line is worth pinning.
 *
 * Run it:
 *
 *     node --test        # from poker-hand-review/, or: npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { isTopPairOrBetter } from '../src/evaluate_hand.js';
import {
  ACTION_TYPES,
  generateHand,
  handToText,
  heroFirstActionIndex
} from '../src/generate_hand.js';

const CARD = /^[23456789TJQKA][shdc]$/;
const SEEDS = Array.from({ length: 200 }, (_, i) => `hand-${i}`);
const hands = SEEDS.map(seed => generateHand({ seed }));

function each(fn) {
  hands.forEach(hand => {
    try {
      fn(hand);
    } catch (e) {
      e.message = `seed ${hand.seed} (#${hand.handNumber}): ${e.message}`;
      throw e;
    }
  });
}

const allCards = hand => [
  ...hand.heroCards,
  ...hand.villainCards,
  ...hand.board.flop,
  hand.board.turn,
  hand.board.river
];

// The board as it stood on a given street, for asking what a player held at the time.
const boardOn = (hand, street) => ({
  preflop: [],
  flop: hand.board.flop,
  turn: [...hand.board.flop, hand.board.turn],
  river: [...hand.board.flop, hand.board.turn, hand.board.river]
}[street]);

const actorOf = line => line.text.split(' ')[0];

/*
 * Re-derives the pot from the text alone, independently of the generator's own arithmetic, and
 * hands back what it should have been after every line. A call's amount is the increment owed; a
 * raise names a street total, which is exactly the distinction that makes naive summing wrong.
 */
function potsFromText(hand) {
  let settled = 0;
  let committed = { Hero: 0, Villain: 0 };
  const settle = () => {
    settled += committed.Hero + committed.Villain;
    committed = { Hero: 0, Villain: 0 };
  };

  return hand.lines.map(line => {
    const actor = actorOf(line).replace(':', '');
    const amount = Number(line.text.match(/\$(\d+)$/)?.[1] ?? 0);

    if (line.street || line.text.startsWith('*** SHOWDOWN')) settle();
    else if (/ posts (small|big) blind /.test(line.text)) committed[actor] = amount;
    else if (/ bets \$/.test(line.text) || / calls \$/.test(line.text)) committed[actor] += amount;
    else if (/ raises to \$/.test(line.text)) committed[actor] = amount;

    return settled + committed.Hero + committed.Villain;
  });
}

describe('cards', () => {
  it('deals nine distinct, well-formed cards', () => each(hand => {
    const cards = allCards(hand);
    assert.equal(cards.length, 9);
    cards.forEach(c => assert.ok(CARD.test(c), `malformed card ${JSON.stringify(c)}`));
    assert.equal(new Set(cards).size, 9, `duplicate card in ${cards.join(' ')}`);
  }));

  it('varies the cards between hands', () => {
    assert.equal(new Set(hands.map(h => allCards(h).join(' '))).size, hands.length);
  });
});

describe('shape of the hand history', () => {
  it('opens with the header, the blinds and the deal', () => each(hand => {
    const btn = hand.heroBtn ? 'Hero' : 'Villain';
    const bb = hand.heroBtn ? 'Villain' : 'Hero';
    assert.deepEqual(hand.lines.slice(0, 8).map(l => l.text), [
      `Hand #${hand.handNumber}:  Hold'em No Limit ($1/$2 USD)`,
      "Table 'Drill Table' 6-max Seat #1 is the button",
      `Seat 1: ${btn} ($200 in chips)`,
      `Seat 4: ${bb} ($200 in chips)`,
      `${btn}: posts small blind $1`,
      `${bb}: posts big blind $2`,
      '*** HOLE CARDS ***',
      `Dealt to Hero [${hand.heroCards.join(' ')}]`
    ]);
  }));

  it('deals every street and ends at showdown', () => each(hand => {
    assert.deepEqual(hand.lines.filter(l => l.street).map(l => l.street),
      ['flop', 'turn', 'river'], 'wrong street markers');
    assert.deepEqual(hand.lines.slice(-3).map(l => l.text), [
      '*** SHOWDOWN ***',
      `Hero shows [${hand.heroCards.join(' ')}]`,
      `Villain shows [${hand.villainCards.join(' ')}]`
    ], 'hand did not reach showdown');
  }));

  it('writes only legal actions, and never a fold', () => each(hand => {
    hand.lines.filter(l => ACTION_TYPES.has(l.type)).forEach(l => {
      assert.match(l.text, /^(Hero|Villain) (checks|calls \$\d+|bets \$\d+|raises to \$\d+)$/,
        `unreadable action: ${l.text}`);
    });
  }));

  it('joins the lines and ends with a newline in handToText', () => each(hand => {
    assert.equal(handToText(hand), hand.lines.map(l => l.text).join('\n') + '\n');
  }));
});

describe('money', () => {
  it('stamps every line with a pot matching the text', () => each(hand => {
    assert.deepEqual(hand.lines.map(l => l.pot), potsFromText(hand), 'pot drifted from the text');
  }));

  it('reports the final pot', () => each(hand => {
    assert.equal(hand.pot, hand.lines.at(-1).pot, 'hand.pot is not the pot at showdown');
    assert.ok(hand.pot >= 4, `pot below two big blinds: ${hand.pot}`);
  }));

  it('never bets under the big blind or over a stack', () => each(hand => {
    hand.lines.filter(l => / (bets|raises to) \$/.test(l.text)).forEach(l => {
      const amount = Number(l.text.match(/\$(\d+)$/)[1]);
      assert.ok(amount >= 2, `illegal bet under the big blind: ${l.text}`);
      assert.ok(amount <= 200, `bet over the stack: ${l.text}`);
    });
  }));
});

describe('heads-up convention', () => {
  it('puts each player on the button across a run', () => {
    assert.ok(hands.some(h => h.heroBtn) && hands.some(h => !h.heroBtn));
  });

  it('acts the button first preflop and last on every postflop street', () => each(hand => {
    const btn = hand.heroBtn ? 'Hero' : 'Villain';
    const bb = hand.heroBtn ? 'Villain' : 'Hero';
    const firstOn = street => actorOf(hand.lines.find(l => l.type === street));
    assert.equal(firstOn('preflop'), btn, 'button did not act first preflop');
    for (const street of ['flop', 'turn', 'river']) {
      assert.equal(firstOn(street), bb, `wrong first actor on the ${street}`);
    }
  }));

  it('starts the drill on Hero, after the deal', () => each(hand => {
    const idx = heroFirstActionIndex(hand);
    const line = hand.lines[idx];
    assert.ok(ACTION_TYPES.has(line.type) && line.text.startsWith('Hero '), `stopped at ${line.text}`);
    assert.ok(hand.lines.slice(0, idx).some(l => l.text.startsWith('Dealt to Hero')));
    assert.equal(hand.lines.slice(0, idx).filter(l => ACTION_TYPES.has(l.type) &&
      l.text.startsWith('Hero ')).length, 0, 'Hero acted earlier');
  }));
});

describe('personalities', () => {
  it('has Villain bet or raise only with top pair or better', () => each(hand => {
    hand.lines
      .filter(l => ACTION_TYPES.has(l.type) && /^Villain (bets|raises)/.test(l.text))
      .forEach(l => {
        assert.ok(isTopPairOrBetter(hand.villainCards, boardOn(hand, l.type)),
          `Villain bet without top pair on the ${l.type}: ${l.text}`);
      });
  }));

  it('never has Villain open the betting preflop', () => each(hand => {
    hand.lines.filter(l => l.type === 'preflop').forEach(l => {
      assert.doesNotMatch(l.text, /^Villain (bets|raises)/, 'a passive player opened preflop');
    });
  }));

  it('never has Hero raise after the flop is dealt', () => each(hand => {
    hand.lines.filter(l => ['flop', 'turn', 'river'].includes(l.type)).forEach(l => {
      assert.doesNotMatch(l.text, /^Hero raises/, 'Hero is not supposed to raise');
    });
  }));

  it('produces both limped and raised pots', () => {
    const raised = hands.filter(h => h.lines.some(l => l.type === 'preflop' && /raises/.test(l.text)));
    assert.ok(raised.length > 0, 'Hero never opened');
    assert.ok(raised.length < hands.length, 'every pot was raised');
  });
});

describe('calldown', () => {
  it('stops Hero betting once Villain has bet or raised', () => each(hand => {
    const trigger = hand.lines.findIndex(l =>
      ACTION_TYPES.has(l.type) && /^Villain (bets|raises)/.test(l.text));
    if (trigger === -1) return;
    hand.lines.slice(trigger).forEach(l => {
      assert.doesNotMatch(l.text, /^Hero (bets|raises)/,
        `Hero led after Villain's aggression: ${l.text}`);
    });
  }));

  it('is reached often enough to drill', () => {
    const triggered = hands.filter(h =>
      h.lines.some(l => ACTION_TYPES.has(l.type) && /^Villain (bets|raises)/.test(l.text)));
    assert.ok(triggered.length > hands.length * 0.1,
      `Villain was aggressive in only ${triggered.length} of ${hands.length} hands`);
  });
});

describe('seeding', () => {
  it('deals the same hand for the same seed', () => {
    for (const seed of ['a1', 'b2', 'c3']) {
      assert.deepEqual(generateHand({ seed }), generateHand({ seed }));
    }
  });

  it('deals different hands for different seeds', () => {
    assert.notDeepEqual(generateHand({ seed: 'a1' }).lines, generateHand({ seed: 'b2' }).lines);
  });

  it('deals a random hand when given no seed', () => {
    assert.notDeepEqual(generateHand().lines, generateHand().lines);
  });
});

describe('spot-checks', () => {
  it('plays a limped pot checked down (seed c3)', () => {
    assert.equal(handToText(generateHand({ seed: 'c3' })).trim(), [
      "Hand #511587798:  Hold'em No Limit ($1/$2 USD)",
      "Table 'Drill Table' 6-max Seat #1 is the button",
      'Seat 1: Hero ($200 in chips)',
      'Seat 4: Villain ($200 in chips)',
      'Hero: posts small blind $1',
      'Villain: posts big blind $2',
      '*** HOLE CARDS ***',
      'Dealt to Hero [8h 4c]',
      'Hero calls $1',
      'Villain checks',
      '*** FLOP *** [Tc 3c 8d]',
      'Villain checks',
      'Hero checks',
      '*** TURN *** [Tc 3c 8d] [9d]',
      'Villain checks',
      'Hero checks',
      '*** RIVER *** [Tc 3c 8d] [9d] [Kd]',
      'Villain checks',
      'Hero checks',
      '*** SHOWDOWN ***',
      'Hero shows [8h 4c]',
      'Villain shows [Jd 6s]'
    ].join('\n'));
  });

  it('holds calldown when Villain goes quiet (seed d4)', () => {
    // Villain's jacks are an overpair on 2d 3s 4c and bet, then stop once the ace lands. Hero
    // checks the rest of the way - including the turned wheel - because calldown has latched.
    const hand = generateHand({ seed: 'd4' });
    const action = hand.lines.filter(l => ACTION_TYPES.has(l.type)).map(l => l.text);
    assert.deepEqual(action, [
      'Hero calls $1', 'Villain checks',
      'Villain bets $2', 'Hero calls $2',
      'Villain checks', 'Hero checks',
      'Villain checks', 'Hero checks'
    ]);
    assert.ok(isTopPairOrBetter(hand.villainCards, hand.board.flop), 'the flop bet needs a hand');
  });

  it('value bets three streets with top pair (seed b2)', () => {
    const hand = generateHand({ seed: 'b2' });
    const bets = hand.lines.filter(l => /^Hero bets/.test(l.text)).map(l => l.text);
    assert.deepEqual(bets, ['Hero bets $2', 'Hero bets $4', 'Hero bets $8']);
  });
});
