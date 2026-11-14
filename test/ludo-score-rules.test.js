const test = require('node:test');
const assert = require('node:assert/strict');
const {
  LUDO_SCORE_FINISH_PROGRESS,
  LUDO_SCORE_HOME_ENTRY_BONUS,
  LUDO_SCORE_LEGACY_FINISH_PROGRESS,
  LUDO_SCORE_LOOP_LENGTH,
  LUDO_SCORE_MAX,
  LUDO_SCORE_PATH_LENGTH,
  LUDO_SCORE_RULES_VERSION,
  LUDO_SAFE_TRACK_INDEXES,
  captureOpponentTokens,
  isLudoScoreWinner,
  legalTokenIndexesForRoll,
  ludoScoreFinishProgress,
  ludoScoreWinnerSide,
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

test('new games finish on exactly 57 route spaces and retain legacy finish rules', () => {
  assert.equal(LUDO_SCORE_PATH_LENGTH, 57);
  assert.equal(LUDO_SCORE_FINISH_PROGRESS, 56);
  assert.equal(LUDO_SCORE_LOOP_LENGTH + (LUDO_SCORE_FINISH_PROGRESS - LUDO_SCORE_LOOP_LENGTH + 1), LUDO_SCORE_PATH_LENGTH);
  assert.equal(ludoScoreFinishProgress({ rulesVersion: LUDO_SCORE_RULES_VERSION }), 56);
  assert.equal(ludoScoreFinishProgress({}), LUDO_SCORE_LEGACY_FINISH_PROGRESS);
  assert.equal(legalTokenIndexesForRoll([55, 54, 56], 1, LUDO_SCORE_FINISH_PROGRESS).join(','), '0,1');
  assert.equal(nextLudoTokenProgress(55, 1, LUDO_SCORE_FINISH_PROGRESS), 56);
  assert.equal(nextLudoTokenProgress(55, 2, LUDO_SCORE_FINISH_PROGRESS), null);
  assert.equal(isLudoScoreWinner([56, 56, 56, 56]), true);
  assert.equal(isLudoScoreWinner([56, 56, 56, 57]), false);
  assert.equal(nextLudoTokenProgress(56, 1), 57);
  assert.equal(isLudoScoreWinner([57, 57, 57, 57], LUDO_SCORE_LEGACY_FINISH_PROGRESS), true);
});

test('keeps opponent tokens safe on stars and captures every token on an unsafe landing', () => {
  assert.deepEqual(LUDO_SAFE_TRACK_INDEXES, [0, 8, 13, 21, 26, 34, 39, 47]);
  const safeLanding = captureOpponentTokens({
    creator: [0, -1, -1, -1],
    joiner: [26, 26, -1, -1]
  }, 'creator', 0);
  assert.equal(safeLanding.captured, false);
  assert.deepEqual(safeLanding.tokens.joiner, [26, 26, -1, -1]);

  const capture = captureOpponentTokens({
    creator: [0, -1, -1, -1],
    joiner: [27, 27, -1, -1]
  }, 'creator', 1);
  assert.equal(capture.captured, true);
  assert.deepEqual(capture.tokens.joiner, [-1, -1, -1, -1]);
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

test('awards 100 points once when each token enters the home lane', () => {
  const state = {
    tokens: { creator: [51, -1, -1, -1], joiner: [-1, -1, -1, -1] },
    scores: { creator: 0, joiner: 0 }
  };
  const enteredHome = { creator: [52, -1, -1, -1], joiner: [-1, -1, -1, -1] };
  assert.deepEqual(scoresAfterMove(state, enteredHome, 'creator'), { creator: LUDO_SCORE_HOME_ENTRY_BONUS, joiner: 0 });
  assert.deepEqual(scoresAfterMove({
    tokens: enteredHome,
    scores: { creator: LUDO_SCORE_HOME_ENTRY_BONUS, joiner: 0 }
  }, {
    creator: [53, -1, -1, -1],
    joiner: [-1, -1, -1, -1]
  }), { creator: LUDO_SCORE_HOME_ENTRY_BONUS, joiner: 0 });
  assert.deepEqual(scoresAfterMove(state, {
    creator: [57, -1, -1, -1],
    joiner: [-1, -1, -1, -1]
  }, 'creator'), { creator: LUDO_SCORE_HOME_ENTRY_BONUS + 250, joiner: 0 });
});

test('includes all four home-entry bonuses in the maximum score for a 57-space game', () => {
  const state = {
    rulesVersion: LUDO_SCORE_RULES_VERSION,
    tokens: { creator: [56, 56, 56, 55], joiner: [-1, -1, -1, -1] },
    scores: { creator: 1150, joiner: 0 }
  };
  assert.equal(LUDO_SCORE_MAX, 1400);
  assert.deepEqual(scoresAfterMove(state, {
    creator: [56, 56, 56, 56],
    joiner: [-1, -1, -1, -1]
  }), { creator: LUDO_SCORE_MAX, joiner: 0 });
});

test('awards the win to the higher scorer and uses the finisher as a tie-breaker', () => {
  assert.equal(ludoScoreWinnerSide({ creator: 900, joiner: 1100 }, 'creator'), 'joiner');
  assert.equal(ludoScoreWinnerSide({ creator: 1100, joiner: 900 }, 'creator'), 'creator');
  assert.equal(ludoScoreWinnerSide({ creator: 1000, joiner: 1000 }, 'joiner'), 'joiner');
});
