/*
 * Tests for ../src/evaluate_hand.js
 *
 * The rest of this project is tested lightly, on the grounds that a bug shows up the moment you
 * play a hand. This module is the exception: a wrong evaluator does not crash, it deals a hand
 * where the villain confidently bets a hand they do not have, and the only way to notice is to
 * squint at showdowns. So the categories are covered properly, and the top-pair threshold - the
 * one question the betting actually asks - is covered case by case.
 *
 * Run it:
 *
 *     node --test        # from poker-hand-review/, or: npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { compareScores, isTopPairOrBetter, madeHand, score } from '../src/evaluate_hand.js';

const nameOf = cards => madeHand(cards.slice(0, 2), cards.slice(2)).name;
const yes = (hole, board, why) => assert.ok(isTopPairOrBetter(hole, board), why);
const no = (hole, board, why) => assert.ok(!isTopPairOrBetter(hole, board), why);

describe('categories', () => {
  const cases = [
    ['straight flush', ['9h', '8h'], ['7h', '6h', '5h', 'Kd', '2c']],
    ['straight flush', ['Ah', '2h'], ['3h', '4h', '5h']],                 // steel wheel
    ['four of a kind', ['9h', '9s'], ['9d', '9c', 'Kd']],
    ['full house',     ['9h', '9s'], ['9d', 'Kc', 'Kd']],
    ['flush',          ['Ah', '4h'], ['9h', '7h', '2h']],
    ['straight',       ['9h', '8s'], ['7d', '6c', '5h']],
    ['straight',       ['Ah', '2s'], ['3d', '4c', '5h']],                 // the wheel
    ['straight',       ['Ah', 'Ks'], ['Qd', 'Jc', 'Th']],                 // broadway
    ['three of a kind', ['9h', '9s'], ['9d', 'Kc', '2h']],
    ['two pair',       ['9h', 'Ks'], ['9d', 'Kc', '2h']],
    ['pair',           ['9h', '4s'], ['9d', 'Kc', '2h']],
    ['high card',      ['Ah', '4s'], ['9d', 'Kc', '2c']]
  ];

  for (const [expected, hole, board] of cases) {
    it(`reads ${expected} from ${hole.join(' ')} on ${board.join(' ')}`, () => {
      assert.equal(madeHand(hole, board).name, expected);
    });
  }

  it('takes the best five of seven', () => {
    // A flush is available and beats the straight also present.
    assert.equal(nameOf(['Ah', 'Kh', '9h', '8h', '7h', '6s', '5d']), 'flush');
  });

  it('does not make a straight from four to a run', () => {
    assert.equal(nameOf(['9h', '8s', '7d', '6c']), 'high card');
  });

  it('does not make a flush from four suited', () => {
    assert.equal(nameOf(['Ah', '9h', '7h', '2h']), 'high card');
  });
});

describe('comparing hands', () => {
  it('ranks categories against each other', () => {
    const flush = score(['Ah', '9h', '7h', '4h', '2h']);
    const straight = score(['9h', '8s', '7d', '6c', '5h']);
    assert.ok(compareScores(flush, straight) > 0);
  });

  it('breaks ties within a category on rank, then kicker', () => {
    const aces = score(['Ah', 'As', 'Kd', '7c', '2h']);
    const kings = score(['Kh', 'Ks', 'Ad', '7c', '2h']);
    assert.ok(compareScores(aces, kings) > 0, 'higher pair wins');

    const goodKicker = score(['Ah', 'As', 'Kd', '7c', '2h']);
    const weakKicker = score(['Ah', 'As', 'Qd', '7c', '2h']);
    assert.ok(compareScores(goodKicker, weakKicker) > 0, 'kicker breaks the tie');
  });

  it('calls identical hands equal', () => {
    assert.equal(compareScores(score(['Ah', 'As', 'Kd']), score(['Ac', 'Ad', 'Kh'])), 0);
  });
});

describe('top pair or better', () => {
  it('counts top pair', () => {
    yes(['Kd', '9c'], ['Ks', '7h', '2d'], 'hole card paired the highest board card');
  });

  it('counts an overpair', () => {
    yes(['Qd', 'Qc'], ['9s', '7h', '2d'], 'pocket pair above the board');
  });

  it('rejects second pair', () => {
    no(['7d', '9c'], ['Ks', '7h', '2d'], 'paired the middle card');
  });

  it('rejects an underpair', () => {
    no(['Qd', 'Qc'], ['Ks', '7h', '2d'], 'pocket queens under a king');
  });

  it('counts anything from two pair up', () => {
    yes(['9d', '7c'], ['9s', '7h', '2d'], 'two pair');
    yes(['9d', '9c'], ['9s', '7h', '2d'], 'trips');
    yes(['8d', '6c'], ['9s', '7h', '5d'], 'straight');
    yes(['Ah', '4h'], ['9h', '7h', '2h'], 'flush');
  });

  it('rejects a missed draw', () => {
    no(['Ah', '4h'], ['9h', '7h', '2d'], 'four to a flush is not a hand yet');
  });

  it('rejects high card', () => {
    no(['Ad', '4c'], ['Ks', '7h', '2d'], 'ace high');
  });
});

describe('the board belongs to nobody', () => {
  it('rejects a pair that is entirely the board', () => {
    no(['9d', '4c'], ['Ks', 'Kh', '2d'], 'the kings are not theirs');
  });

  it('rejects playing the board outright', () => {
    no(['3d', '2c'], ['Ah', 'Kh', 'Qh', 'Jh', 'Th'], 'the flush is on the board');
  });

  it('counts a hole card that improves on a paired board', () => {
    yes(['Kd', '9c'], ['Ks', 'Kh', '2d'], 'trip kings using a hole card');
    yes(['9d', '9c'], ['Ks', 'Kh', '2d'], 'two pair, kings and nines');
  });

  it('counts a flush using one hole card over four board hearts', () => {
    yes(['Ah', '4c'], ['9h', '7h', '2h', 'Kh'], 'ace-high flush beats the board flush');
  });

  it('rejects a board flush the hole cards cannot improve', () => {
    no(['4c', '3d'], ['9h', '7h', '2h', 'Kh', 'Qh'], 'everyone has this flush');
  });
});

describe('usesHoleCards', () => {
  it('is true when the hole cards improve on the board', () => {
    assert.equal(madeHand(['Kd', '9c'], ['Ks', '7h', '2d']).usesHoleCards, true);
  });

  it('is false when they do not', () => {
    assert.equal(madeHand(['5d', '3c'], ['Ks', 'Kh', '2d']).usesHoleCards, false);
  });

  it('is true preflop, where there is no board to play', () => {
    assert.equal(madeHand(['5d', '3c'], []).usesHoleCards, true);
  });
});
