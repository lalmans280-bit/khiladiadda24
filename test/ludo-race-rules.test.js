const test = require('node:test');
const assert = require('node:assert/strict');
const { legalTokenIndexesForRoll, nextLudoTokenProgress } = require('../lib/ludo-score-rules');
const {
  LUDO_RACE_FINISH,
  LUDO_RACE_TOKEN_COUNT,
  LUDO_RACE_COLORS,
  LUDO_RACE_TRACK,
  LUDO_RACE_COLOR_CONFIG,
  isValidLudoRaceColor,
  defaultLudoRaceJoinerColor,
  createLudoRaceState,
  isLudoRaceWinner
} = require('../lib/ludo-race-rules');

test('supports four selectable colors and assigns a different color to the second player', () => {
  assert.deepEqual(LUDO_RACE_COLORS, ['red', 'green', 'yellow', 'blue']);
  assert.equal(isValidLudoRaceColor('YELLOW'), true);
  assert.equal(isValidLudoRaceColor('purple'), false);
  assert.equal(defaultLudoRaceJoinerColor('red'), 'green');
});

test('each color has 52 shared-track squares and a five-square home lane', () => {
  assert.equal(LUDO_RACE_TRACK.length, 52);
  for (const color of LUDO_RACE_COLORS) {
    assert.equal(LUDO_RACE_COLOR_CONFIG[color].homePath.length, 5);
    assert.equal(LUDO_RACE_COLOR_CONFIG[color].baseSlots.length, LUDO_RACE_TOKEN_COUNT);
  }
  assert.equal(LUDO_RACE_TRACK.length + LUDO_RACE_COLOR_CONFIG.red.homePath.length, LUDO_RACE_FINISH);
});

test('initializes four tokens per player and requires all four to finish to win', () => {
  const state = createLudoRaceState('creator-id', { creator: 'blue', joiner: 'yellow' });
  assert.deepEqual(state.tokens, { creator: [-1, -1, -1, -1], joiner: [-1, -1, -1, -1] });
  assert.deepEqual(state.colors, { creator: 'blue', joiner: 'yellow' });
  assert.equal(state.currentTurn, 'creator-id');
  assert.equal(isLudoRaceWinner([57, 57, 57, 57]), true);
  assert.equal(isLudoRaceWinner([57, 57, 57, 56]), false);
  assert.equal(isLudoRaceWinner([57, 57, 57]), false);
});

test('requires an exact roll to finish at square 57', () => {
  assert.equal(nextLudoTokenProgress(56, 1), 57);
  assert.equal(nextLudoTokenProgress(56, 2), null);
});

test('opens a token from the yard only when the dice shows six', () => {
  const tokens = [-1, -1, -1, -1];
  assert.deepEqual(legalTokenIndexesForRoll(tokens, 5), []);
  assert.deepEqual(legalTokenIndexesForRoll(tokens, 6), [0, 1, 2, 3]);
});
