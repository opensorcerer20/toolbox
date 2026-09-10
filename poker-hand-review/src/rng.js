/*
 * A small seeded pseudo-random generator (mulberry32), so a hand can be reproduced from its seed.
 * Math.random cannot be seeded, which would leave branching betting untestable - there would be no
 * way to ask for the hand where the villain check-raises the turn. Not cryptographic, and it does
 * not need to be.
 */

// Hashes an arbitrary seed - string or number - into the 32 bits mulberry32 starts from. xmur3,
// the mixing step usually paired with it; without it, nearby numeric seeds open alike.
function hashSeed(seed) {
  const text = String(seed);
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

// Returns a Math.random-alike over [0, 1) that always yields the same sequence for a given seed.
export function createRng(seed) {
  let state = hashSeed(seed);
  return function rng() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A seed to use when the caller does not supply one.
export function randomSeed() {
  return Math.floor(Math.random() * 0xffffffff).toString(36);
}
