/*
 * Generates one randomized heads-up hand with no betting in it: the small blind completes, the
 * big blind checks, and both players check every postflop street to showdown. Step 1 of the
 * roadmap deliberately leaves betting out - villain personalities and bet sizing arrive in Step 2.
 *
 * Pure: no DOM, no globals, no I/O. Loads either as a browser <script> (exports land on window)
 * or via require() in Node, so the tests can run without a browser.
 *
 * Heads-up blind convention: the button posts the small blind, acts first preflop, and acts last
 * on every postflop street. The button always occupies Seat 1.
 */
(function (root) {
  'use strict';

  var RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  var SUITS = ['s', 'h', 'd', 'c'];

  var SMALL_BLIND = 1;
  var BIG_BLIND = 2;
  var STACK = 200;
  var HERO = 'Hero';
  var VILLAIN = 'Villain';

  // Draws a card not already in `used`, and records it there.
  function draw(used) {
    var card;
    do {
      card = RANKS[Math.floor(Math.random() * RANKS.length)] +
             SUITS[Math.floor(Math.random() * SUITS.length)];
    } while (used.indexOf(card) !== -1);
    used.push(card);
    return card;
  }

  function generateHand() {
    var used = [];
    var heroCards = [draw(used), draw(used)];
    var villainCards = [draw(used), draw(used)];
    var flop = [draw(used), draw(used), draw(used)];
    var turn = draw(used);
    var river = draw(used);

    var heroBtn = Math.random() < 0.5;
    var button = heroBtn ? HERO : VILLAIN;        // small blind, acts first preflop
    var bigBlind = heroBtn ? VILLAIN : HERO;      // acts first postflop
    var handNumber = Math.floor(100000000 + Math.random() * 899999999);

    var lines = [];
    function push(type, text, street) {
      var line = { type: type, text: text };
      if (street) line.street = street;
      lines.push(line);
    }

    push('meta', 'Hand #' + handNumber + ":  Hold'em No Limit ($" +
      SMALL_BLIND + '/$' + BIG_BLIND + ' USD)');
    push('meta', "Table 'Drill Table' 6-max Seat #1 is the button");
    push('meta', 'Seat 1: ' + button + ' ($' + STACK + ' in chips)');
    push('meta', 'Seat 4: ' + bigBlind + ' ($' + STACK + ' in chips)');
    push('blind', button + ': posts small blind $' + SMALL_BLIND);
    push('blind', bigBlind + ': posts big blind $' + BIG_BLIND);

    push('holecards', '*** HOLE CARDS ***');
    push('holecards', 'Dealt to ' + HERO + ' [' + heroCards.join(' ') + ']');
    push('preflop', button + ' calls $' + (BIG_BLIND - SMALL_BLIND));
    push('preflop', bigBlind + ' checks');

    var board = '[' + flop.join(' ') + ']';
    push('street', '*** FLOP *** ' + board, 'flop');
    push('flop', bigBlind + ' checks');
    push('flop', button + ' checks');

    board += ' [' + turn + ']';
    push('street', '*** TURN *** ' + board, 'turn');
    push('turn', bigBlind + ' checks');
    push('turn', button + ' checks');

    board += ' [' + river + ']';
    push('street', '*** RIVER *** ' + board, 'river');
    push('river', bigBlind + ' checks');
    push('river', button + ' checks');

    push('street', '*** SHOWDOWN ***');
    push('street', HERO + ' shows [' + heroCards.join(' ') + ']');
    push('street', VILLAIN + ' shows [' + villainCards.join(' ') + ']');

    return {
      handNumber: handNumber,
      heroBtn: heroBtn,
      heroCards: heroCards,
      villainCards: villainCards,
      board: { flop: flop, turn: turn, river: river },
      pot: BIG_BLIND * 2,
      lines: lines
    };
  }

  // The hand as it would appear in a hand-history file.
  function handToText(hand) {
    return hand.lines.map(function (line) { return line.text; }).join('\n') + '\n';
  }

  var api = { generateHand: generateHand, handToText: handToText };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PokerHand = api;
})(typeof self !== 'undefined' ? self : this);
