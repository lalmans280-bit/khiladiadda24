const LUDO_SCORE_FINISH = 57;
const LUDO_SCORE_TOKEN_COUNT = 4;
const LUDO_SCORE_COLORS = Object.freeze(['red', 'green', 'yellow', 'blue']);
const LUDO_SCORE_TRACK = Object.freeze([
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12],
  [6, 13], [6, 14], [7, 14], [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8],
  [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6], [13, 6], [12, 6], [11, 6],
  [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0]
]);
const LUDO_SCORE_COLOR_CONFIG = Object.freeze({
  red: Object.freeze({ startIndex: 0, homePath: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], finish: [7, 7], baseSlots: [[1, 1], [1, 4], [4, 1], [4, 4]] }),
  green: Object.freeze({ startIndex: 26, homePath: [[8, 13], [8, 12], [8, 11], [8, 10], [8, 9]], finish: [7, 7], baseSlots: [[10, 10], [10, 13], [13, 10], [13, 13]] }),
  yellow: Object.freeze({ startIndex: 13, homePath: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]], finish: [7, 7], baseSlots: [[1, 10], [1, 13], [4, 10], [4, 13]] }),
  blue: Object.freeze({ startIndex: 39, homePath: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]], finish: [7, 7], baseSlots: [[10, 1], [10, 4], [13, 1], [13, 4]] })
});

function isValidLudoScoreColor(color) {
  return LUDO_SCORE_COLORS.includes(String(color || '').toLowerCase());
}

function defaultLudoScoreJoinerColor(creatorColor) {
  return LUDO_SCORE_COLORS.find(color => color !== creatorColor) || LUDO_SCORE_COLORS[1];
}

function ludoScoreTrackIndex(color, progress) {
  const config = LUDO_SCORE_COLOR_CONFIG[color] || LUDO_SCORE_COLOR_CONFIG.red;
  if (!Number.isInteger(progress) || progress < 0 || progress > 51) return null;
  return (config.startIndex + progress) % LUDO_SCORE_TRACK.length;
}

function isLudoScoreWinner(tokens) {
  return Array.isArray(tokens)
    && tokens.length === LUDO_SCORE_TOKEN_COUNT
    && tokens.every(progress => progress === LUDO_SCORE_FINISH);
}

function scoreFor(state, side) {
  const savedScore = Number(state.scores?.[side]);
  if (Number.isFinite(savedScore)) return Math.max(0, savedScore);
  return (state.tokens?.[side] || []).filter(progress => progress === 57).length * 250;
}

function scoresAfterMove(state, tokens) {
  const scores = {};
  for (const side of ['creator', 'joiner']) {
    const homesBefore = (state.tokens?.[side] || []).filter(progress => progress === LUDO_SCORE_FINISH).length;
    const homesAfter = (tokens[side] || []).filter(progress => progress === LUDO_SCORE_FINISH).length;
    scores[side] = Math.min(1000, scoreFor(state, side) + (homesAfter - homesBefore) * 250);
  }
  return scores;
}

function scoreAfterTimeout(state, side) {
  return {
    creator: scoreFor(state, 'creator'),
    joiner: scoreFor(state, 'joiner'),
    [side]: Math.max(0, scoreFor(state, side) - 100)
  };
}

function nextSixStreak(state, diceValue, opponentId) {
  const consecutiveSixes = Number(state.consecutiveSixes) || 0;
  if (diceValue === 6 && consecutiveSixes >= 2) {
    return { consecutiveSixes: 0, forfeited: true, nextTurn: String(opponentId) };
  }
  return {
    consecutiveSixes: diceValue === 6 ? consecutiveSixes + 1 : 0,
    forfeited: false,
    nextTurn: ''
  };
}

function nextLudoTokenProgress(progress, diceValue) {
  if (!Number.isInteger(diceValue) || diceValue < 1 || diceValue > 6) return null;
  if (progress === -1) return diceValue === 6 ? 0 : null;
  if (!Number.isInteger(progress) || progress < 0 || progress >= LUDO_SCORE_FINISH) return null;
  const targetProgress = progress + diceValue;
  return targetProgress <= LUDO_SCORE_FINISH ? targetProgress : null;
}

function legalTokenIndexesForRoll(tokens, diceValue) {
  return tokens
    .map((progress, index) => ({ progress, index }))
    .filter(({ progress }) => nextLudoTokenProgress(progress, diceValue) !== null)
    .map(({ index }) => index);
}

module.exports = {
  LUDO_SCORE_FINISH,
  LUDO_SCORE_TOKEN_COUNT,
  LUDO_SCORE_COLORS,
  LUDO_SCORE_TRACK,
  LUDO_SCORE_COLOR_CONFIG,
  isValidLudoScoreColor,
  defaultLudoScoreJoinerColor,
  ludoScoreTrackIndex,
  isLudoScoreWinner,
  legalTokenIndexesForRoll,
  nextLudoTokenProgress,
  nextSixStreak,
  scoreAfterTimeout,
  scoresAfterMove
};
