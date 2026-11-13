const test = require('node:test');
const assert = require('node:assert/strict');
const {
  legalTokenIndexesForRoll,
  nextLudoTokenProgress,
  nextSixStreak,
  scoreAfterTimeout,
  scoresAfterMove
} = require('../lib/ludo-score-rules');

test('keeps tokens in the yard until a six and launches them only on six', () => {
  const tokens = [-1, -1, 0, 51, 57];
  assert.deepEqual(legalTokenIndexesForRoll(tokens, 5), [2, 3]);
  assert.deepEqual(legalTokenIndexesForRoll(tokens, 6), [0, 1, 2, 3]);
});

test('opens a token on six and requires an exact roll to reach home', () => {
  assert.equal(nextLudoTokenProgress(-1, 5), null);
  assert.equal(nextLudoTokenProgress(-1, 6), 0);
  assert.equal(nextLudoTokenProgress(51, 6), 57);
  assert.equal(nextLudoTokenProgress(56, 1), 57);
  assert.equal(nextLudoTokenProgress(56, 2), null);
});

test('allows two consecutive sixes and forfeits the third', () => {
  assert.deepEqual(nextSixStreak({ consecutiveSixes: 0 }, 6, 'joiner'), {
    consecutiveSixes: 1,
    forfeited: false,
    nextTurn: ''
  });
  assert.equal(nextSixStreak({ consecutiveSixes: 1 }, 6, 'joiner').forfeited, false);
  assert.deepEqual(nextSixStreak({ consecutiveSixes: 2 }, 6, 'joiner'), {
    consecutiveSixes: 0,
    forfeited: true,
    nextTurn: 'joiner'
  });
});

test('resets the six streak after any non-six roll', () => {
  assert.equal(nextSixStreak({ consecutiveSixes: 2 }, 4, 'joiner').consecutiveSixes, 0);
});

test('subtracts 100 points on timeout without allowing a negative score', () => {
  const state = { scores: { creator: 250, joiner: 40 } };
  assert.deepEqual(scoreAfterTimeout(state, 'creator'), { creator: 150, joiner: 40 });
  assert.deepEqual(scoreAfterTimeout(state, 'joiner'), { creator: 250, joiner: 0 });
});

test('awards 250 points for each newly completed token and preserves timeout deductions', () => {
  const state = {
    tokens: { creator: [56, -1, -1, -1], joiner: [-1, -1, -1, -1] },
    scores: { creator: 150, joiner: 0 }
  };
  assert.deepEqual(scoresAfterMove(state, {
    creator: [57, -1, -1, -1],
    joiner: [-1, -1, -1, -1]
  }), { creator: 400, joiner: 0 });
});
