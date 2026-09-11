/*
 * The drill itself: hold a generated hand, reveal it one line at a time, and mirror each revealed
 * line on a table mockup. Ported from prototype/poker_drill.html, minus the hand building - that
 * now comes from generate_hand.js.
 *
 * One line per press is the whole point of the exercise (see prototype/poker_drill_README.md,
 * "Design intent"), so revealing is strictly one step forward through hand.lines and every view
 * renders from lineIdx alone. The exception is the first press: "Start hand" jumps the setup - the
 * header, the blinds, the deal - and stops on Hero's first decision, so no press is spent on a
 * line the drill is not training.
 *
 * Villain type is deliberately absent from the display. Every hand is against the same loose-passive
 * player, so a tag saying so on every hand would be noise; it earns its place once the other
 * personalities land and the label starts carrying information.
 */
import { ACTION_TYPES, generateHand, heroFirstActionIndex } from './generate_hand.js';

const SUIT_GLYPH = { s: '♠', h: '♥', d: '♦', c: '♣' };
const RED_SUITS = new Set(['h', 'd']);

let hand = null;
let lineIdx = 0;

const el = {
  posTag: document.getElementById('posTag'),
  revealBtn: document.getElementById('revealBtn'),
  newHandBtn: document.getElementById('newHandBtn'),
  tabTable: document.getElementById('tabTable'),
  tabLog: document.getElementById('tabLog'),
  tableView: document.getElementById('tableView'),
  logView: document.getElementById('logView'),
  answerBox: document.getElementById('answerBox'),
  answerRow: document.getElementById('answerRow'),
  answerBtn: document.getElementById('answerBtn')
};

// 'Ts' -> a white card face reading T♠. Cards are letter-suited in the text log, glyphed here.
function cardHtml(card) {
  const [rank, suit] = card;
  const cls = RED_SUITS.has(suit) ? 'card red' : 'card';
  return `<div class="${cls}">${rank}${SUIT_GLYPH[suit]}</div>`;
}

// How many street markers have been revealed: 0 = preflop, 1 = flop, 2 = turn, 3 = river.
function currentStreetIdx() {
  return hand.lines.slice(0, lineIdx).filter(l => l.street).length;
}

// The pot as far as the reveal has got. Every line carries the pot as it stood after that action,
// so the last revealed line already has the answer - no re-adding the text, which would double
// count a raise anyway, since "raises to $12" names a street total rather than an increment.
function potSoFar() {
  return lineIdx ? hand.lines[lineIdx - 1].pot : 0;
}

function newHand() {
  hand = generateHand();
  lineIdx = 0;
  el.posTag.textContent = hand.heroBtn ? 'In position' : 'Out of position';
  el.answerBox.style.display = 'none';
  render();
}

// First press deals the setup in one go; every press after that advances a single line.
function advance() {
  if (lineIdx === 0) lineIdx = heroFirstActionIndex(hand);
  else if (lineIdx < hand.lines.length) lineIdx++;
  render();
}

function render() {
  const complete = lineIdx >= hand.lines.length;
  renderLog();
  renderTable();
  el.revealBtn.disabled = complete;
  el.revealBtn.textContent = complete ? 'Hand complete'
    : lineIdx === 0 ? 'Start hand'
    : 'Reveal next line';
  el.answerRow.style.display = complete ? 'flex' : 'none';
}

// Newest line on top, so the line just revealed is always in the same place.
function renderLog() {
  const shown = hand.lines.slice(0, lineIdx);
  if (!shown.length) {
    el.logView.textContent = 'Press "Start hand" to begin.';
    return;
  }
  el.logView.innerHTML = shown
    .map((line, i) => `<span class="${i === lineIdx - 1 ? 'fresh' : ''}">${line.text}</span>`)
    .reverse()
    .join('\n');
}

function renderTable() {
  const streetIdx = currentStreetIdx();
  const board = [
    ...(streetIdx >= 1 ? hand.board.flop : []),
    ...(streetIdx >= 2 ? [hand.board.turn] : []),
    ...(streetIdx >= 3 ? [hand.board.river] : [])
  ];

  // Each seat shows that player's most recently revealed action.
  const acts = { Hero: '', Villain: '' };
  for (const line of hand.lines.slice(0, lineIdx)) {
    if (!ACTION_TYPES.has(line.type)) continue;
    const [name, ...rest] = line.text.split(' ');
    if (name in acts) acts[name] = rest.join(' ');
  }

  const heroShown = hand.lines
    .slice(0, lineIdx)
    .some(line => line.text.startsWith('Dealt to Hero'));
  const facedown = '<div class="card facedown">?</div>'.repeat(2);

  el.tableView.innerHTML = `
    <div class="table-area">
      <div class="board">
        ${board.length ? board.map(cardHtml).join('') : '<span class="board-empty">Preflop</span>'}
      </div>
      <div class="pot-line">Pot: $${potSoFar()}</div>
      <div class="seats">
        <div class="seat">
          <div class="seat-name">Villain${hand.heroBtn ? '' : ' (BTN)'}</div>
          <div class="seat-cards">${facedown}</div>
          <div class="seat-stack">$200</div>
          <div class="seat-act">${acts.Villain}</div>
        </div>
        <div class="seat hero">
          <div class="seat-name">Hero${hand.heroBtn ? ' (BTN)' : ''}</div>
          <div class="seat-cards">${heroShown ? hand.heroCards.map(cardHtml).join('') : facedown}</div>
          <div class="seat-stack">$200</div>
          <div class="seat-act">${acts.Hero}</div>
        </div>
      </div>
    </div>`;
}

function setView(view) {
  el.tabTable.classList.toggle('active', view === 'table');
  el.tabLog.classList.toggle('active', view === 'log');
  el.tableView.style.display = view === 'table' ? 'block' : 'none';
  el.logView.style.display = view === 'log' ? 'block' : 'none';
}

function showAnswer() {
  el.answerBox.innerHTML = `
    <b>Hero cards:</b> ${hand.heroCards.join(' ')} &nbsp;
    <b>Villain cards:</b> ${hand.villainCards.join(' ')}<br>
    <b>Board:</b> ${hand.board.flop.join(' ')} ${hand.board.turn} ${hand.board.river}`;
  el.answerBox.style.display = 'block';
}

// Module scripts do not share the global scope, so handlers are bound here rather than inline.
el.revealBtn.addEventListener('click', advance);
el.newHandBtn.addEventListener('click', newHand);
el.tabTable.addEventListener('click', () => setView('table'));
el.tabLog.addEventListener('click', () => setView('log'));
el.answerBtn.addEventListener('click', showAnswer);

newHand();
