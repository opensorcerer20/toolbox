/*
 * Tests for ../src/rng.js
 *
 * Only the contract this project relies on: the same seed replays the same hand, different seeds
 * do not, and the output is usable as a probability. mulberry32's statistical quality is the
 * algorithm's business, not this project's, so it is not tested here.
 *
 * Run it:
 *
 *     node --test        # from poker-hand-review/, or: npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { createRng, randomSeed } from '../src/rng.js';

const draw = (rng, n) => Array.from({ length: n }, rng);

describe('createRng', () => {
  it('replays the same sequence for the same seed', () => {
    assert.deepEqual(draw(createRng('milestone-2'), 50), draw(createRng('milestone-2'), 50));
    assert.deepEqual(draw(createRng(42), 20), draw(createRng('42'), 20), 'seeds stringify');
  });

  it('gives different sequences for different seeds', () => {
    assert.notDeepEqual(draw(createRng('seed-a'), 20), draw(createRng('seed-b'), 20));
  });

  it('produces usable probabilities', () => {
    const sample = draw(createRng('sanity'), 2000);
    for (const value of sample) {
      assert.ok(value >= 0 && value < 1, `out of range: ${value}`);
    }
    const mean = sample.reduce((a, b) => a + b, 0) / sample.length;
    assert.ok(Math.abs(mean - 0.5) < 0.05, `mean was ${mean}`);
  });
});

describe('randomSeed', () => {
  it('gives a distinct seed each time that createRng accepts', () => {
    const seeds = Array.from({ length: 100 }, randomSeed);
    assert.ok(new Set(seeds).size > 95, 'seeds collided too often');
    assert.deepEqual(draw(createRng(seeds[0]), 10), draw(createRng(seeds[0]), 10));
  });
});
