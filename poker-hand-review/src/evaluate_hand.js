/*
 * Reads a made hand off hole cards and a board, so betting can depend on what a player actually
 * holds rather than on a dice roll.
 *
 * The question the drill asks is narrow - "top pair or better?" - but answering it honestly needs a
 * real evaluator: an overpair beats top pair, a board that pairs itself belongs to nobody, and two
 * pair on a paired board is a different hand from the board's own two pair.
 *
 * Pure: no DOM, no globals, no randomness. Cards are the same 'Ts' / 'Kh' strings the generator
 * deals - rank character then suit character.
 */
const RANK_VALUE = {
  2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9,
  T: 10, J: 11, Q: 12, K: 13, A: 14
};

// Ordered weakest to strongest; the index is the first element of a hand's score.
export const CATEGORIES = [
  'high card',
  'pair',
  'two pair',
  'three of a kind',
  'straight',
  'flush',
  'full house',
  'four of a kind',
  'straight flush'
];

const [HIGH_CARD, PAIR, TWO_PAIR, TRIPS, STRAIGHT, FLUSH, FULL_HOUSE, QUADS, STRAIGHT_FLUSH] =
  CATEGORIES.map((_, i) => i);

export const rankValue = card => RANK_VALUE[card[0]];
const suitOf = card => card[1];

// Highest card of the best five-long run, or 0 for none. Handles the wheel, where the ace plays low.
function straightHigh(values) {
  const distinct = [...new Set(values)].sort((a, b) => b - a);
  if (distinct.includes(14)) distinct.push(1);
  let run = 1;
  for (let i = 1; i < distinct.length; i++) {
    if (distinct[i] === distinct[i - 1] - 1) {
      run++;
      if (run >= 5) return distinct[i] + 4;
    } else {
      run = 1;
    }
  }
  return 0;
}

/*
 * Scores any 2-7 cards as a comparable array: [category, ...tiebreakers], comparable
 * lexicographically against any other score. Fewer than five cards simply cannot reach the
 * categories that need five, which is what lets a three-card board be scored on its own.
 */
export function score(cards) {
  const values = cards.map(rankValue).sort((a, b) => b - a);

  const byRank = new Map();
  for (const value of values) byRank.set(value, (byRank.get(value) ?? 0) + 1);
  // Pairs before high cards, and higher ranks first within the same count.
  const groups = [...byRank.entries()]
    .map(([rank, count]) => ({ rank, count }))
    .sort((a, b) => b.count - a.count || b.rank - a.rank);

  const bySuit = new Map();
  for (const card of cards) {
    const suit = suitOf(card);
    if (!bySuit.has(suit)) bySuit.set(suit, []);
    bySuit.get(suit).push(rankValue(card));
  }
  const flushCards = [...bySuit.values()].find(suited => suited.length >= 5);
  const flushValues = flushCards ? [...flushCards].sort((a, b) => b - a) : null;

  // Kickers are the ungrouped cards, highest first.
  const kickers = (excluded, count) =>
    values.filter(v => !excluded.includes(v)).slice(0, count);

  if (flushValues) {
    const high = straightHigh(flushValues);
    if (high) return [STRAIGHT_FLUSH, high];
  }
  if (groups[0].count === 4) {
    return [QUADS, groups[0].rank, ...kickers([groups[0].rank], 1)];
  }
  if (groups[0].count === 3 && groups[1]?.count >= 2) {
    return [FULL_HOUSE, groups[0].rank, groups[1].rank];
  }
  if (flushValues) return [FLUSH, ...flushValues.slice(0, 5)];

  const high = straightHigh(values);
  if (high) return [STRAIGHT, high];

  if (groups[0].count === 3) {
    return [TRIPS, groups[0].rank, ...kickers([groups[0].rank], 2)];
  }
  if (groups[0].count === 2 && groups[1]?.count === 2) {
    const pairRanks = [groups[0].rank, groups[1].rank];
    return [TWO_PAIR, ...pairRanks, ...kickers(pairRanks, 1)];
  }
  if (groups[0].count === 2) {
    return [PAIR, groups[0].rank, ...kickers([groups[0].rank], 3)];
  }
  return [HIGH_CARD, ...values.slice(0, 5)];
}

// Lexicographic, so it works across categories and within one. Negative when a is weaker.
export function compareScores(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/*
 * How many ranks after the category actually define the hand, as opposed to being kickers. A pair
 * is defined by the pair's rank; a straight by its top card; a flush by all five, since a higher
 * flush is a genuinely different hand. High card is defined by nothing at all.
 */
const ESSENTIAL_RANKS = {
  [HIGH_CARD]: 0,
  [PAIR]: 1,
  [TWO_PAIR]: 2,
  [TRIPS]: 1,
  [STRAIGHT]: 1,
  [FLUSH]: 5,
  [FULL_HOUSE]: 2,
  [QUADS]: 1,
  [STRAIGHT_FLUSH]: 1
};

const essentials = handScore => handScore.slice(0, 1 + ESSENTIAL_RANKS[handScore[0]]);

/*
 * What a player has, and whether their own cards are doing any of the work.
 *
 *   madeHand(['Kd','9c'], ['Ks','7h','2d'])
 *     -> { category: 1, name: 'pair', score: [1,13,9,7,2], usesHoleCards: true }
 *
 * `usesHoleCards` compares against the board on its own, ignoring kickers - otherwise a 9 alongside
 * a board of K K 2 would score higher than the board alone and the board's kings would read as the
 * player's pair. Kickers decide who wins a pot; they do not give anyone a hand.
 */
export function madeHand(hole, board) {
  const handScore = score([...hole, ...board]);
  const boardScore = board.length ? score(board) : null;
  return {
    category: handScore[0],
    name: CATEGORIES[handScore[0]],
    score: handScore,
    usesHoleCards: !boardScore || compareScores(essentials(handScore), essentials(boardScore)) > 0
  };
}

/*
 * The threshold the betting logic asks about: top pair or better, using at least one hole card.
 *
 *   top pair    - a hole card paired with the highest board card
 *   overpair    - a pocket pair above the highest board card
 *   better      - two pair, trips, and up
 *
 * A pair below the top board card is second pair or an underpair, and does not qualify. A board
 * that pairs itself belongs to nobody, so it does not qualify either.
 *
 * Known gaps, recorded in the README's future roadmap: a loose-passive player should slow down when
 * three straight or flush cards are out and they hold neither, and paired boards need more thought
 * than "does it use a hole card".
 */
export function isTopPairOrBetter(hole, board) {
  const hand = madeHand(hole, board);
  if (!hand.usesHoleCards) return false;
  if (hand.category > PAIR) return true;
  if (hand.category < PAIR) return false;

  const topBoardRank = board.length ? Math.max(...board.map(rankValue)) : 0;
  return hand.score[1] >= topBoardRank;
}
