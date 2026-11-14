const test = require('node:test');
const assert = require('node:assert/strict');
const {
  LUDO_RACE_COLORS,
  LUDO_RACE_TRACK,
  LUDO_RACE_COLOR_CONFIG,
  isValidLudoRaceColor,
  defaultLudoRaceJoinerColor,
  createLudoRaceState,
  isLudoRaceWinner
} = require('../lib/ludo-race-rules');

test('defines four distinct race colors with a 52-square outer track', () => {
  assert.deepEqual(LUDO_RACE_COLORS, ['red', 'green', 'yellow', 'blue']);
  assert.equal(LUDO_RACE_TRACK.length, 52);
  assert.deepEqual(
    LUDO_RACE_COLORS.map(color => LUDO_RACE_COLOR_CONFIG[color].startIndex).sort((a, b) => a - b),
    [0, 13, 26, 39]
  );
});

test('validates colors case-insensitively and chooses a different default opponent color', () => {
  assert.equal(isValidLudoRaceColor('YELLOW'), true);
  assert.equal(isValidLudoRaceColor('purple'), false);
  assert.equal(isValidLudoRaceColor(null), false);
  for (const color of LUDO_RACE_COLORS) {
    assert.notEqual(defaultLudoRaceJoinerColor(color), color);
  }
});

test('creates a fresh match state with valid distinct player colors', () => {
  const state = createLudoRaceState('creator-id', { creator: 'blue', joiner: 'blue' });
  assert.deepEqual(state.tokens, { creator: [-1, -1, -1, -1], joiner: [-1, -1, -1, -1] });
  assert.deepEqual(state.colors, { creator: 'blue', joiner: 'yellow' });
  assert.equal(state.currentTurn, 'creator-id');
  assert.equal(state.diceValue, null);
});

test('declares a classic race winner when any token reaches the finish', () => {
  assert.equal(isLudoRaceWinner([-1, 12, 57, -1]), true);
  assert.equal(isLudoRaceWinner([-1, 12, 56, -1]), false);
  assert.equal(isLudoRaceWinner(null), false);
});
