const LUDO_SCORE_LOOP_LENGTH = 52;
const LUDO_SCORE_FINISH_PROGRESS = 57;
const LUDO_SCORE_TOKEN_COUNT = 4;
const LUDO_SCORE_HOME_ENTRY_BONUS = 100;
const LUDO_SCORE_TOKEN_FINISH_POINTS = 250;
const LUDO_SCORE_MAX = LUDO_SCORE_TOKEN_COUNT * (LUDO_SCORE_HOME_ENTRY_BONUS + LUDO_SCORE_TOKEN_FINISH_POINTS);
const LUDO_SAFE_TRACK_INDEXES = Object.freeze([0, 8, 13, 21, 26, 34, 39, 47]);
const safeTrackIndexes = new Set(LUDO_SAFE_TRACK_INDEXES);

function scoreFor(state, side) {
  const savedScore = Number(state.scores?.[side]);
  if (Number.isFinite(savedScore)) return Math.min(LUDO_SCORE_MAX, Math.max(0, savedScore));
  return (state.tokens?.[side] || []).reduce((score, progress) => {
    return score + (progress >= LUDO_SCORE_LOOP_LENGTH ? LUDO_SCORE_HOME_ENTRY_BONUS : 0)
      + (progress === LUDO_SCORE_FINISH_PROGRESS ? LUDO_SCORE_TOKEN_FINISH_POINTS : 0);
  }, 0);
}

function scoresAfterMove(state, tokens, homeLaneEntrySide = null) {
  const scores = {};
  for (const side of ['creator', 'joiner']) {
    const homesBefore = (state.tokens?.[side] || []).filter(progress => progress === 57).length;
    const homesAfter = (tokens[side] || []).filter(progress => progress === 57).length;
    const homeLaneEntryBonus = side === homeLaneEntrySide ? LUDO_SCORE_HOME_ENTRY_BONUS : 0;
    scores[side] = Math.min(
      LUDO_SCORE_MAX,
      scoreFor(state, side) + (homesAfter - homesBefore) * LUDO_SCORE_TOKEN_FINISH_POINTS + homeLaneEntryBonus
    );
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
  if (!Number.isInteger(progress) || progress < 0 || progress >= LUDO_SCORE_FINISH_PROGRESS) return null;
  const targetProgress = progress + diceValue;
  return targetProgress <= LUDO_SCORE_FINISH_PROGRESS ? targetProgress : null;
}

function legalTokenIndexesForRoll(tokens, diceValue) {
  return tokens
    .map((progress, index) => ({ progress, index }))
    .filter(({ progress }) => nextLudoTokenProgress(progress, diceValue) !== null)
    .map(({ index }) => index);
}

function scoreTrackIndex(side, progress) {
  if (!Number.isInteger(progress) || progress < 0 || progress >= LUDO_SCORE_LOOP_LENGTH) return null;
  return (progress + (side === 'creator' ? 0 : 26)) % LUDO_SCORE_LOOP_LENGTH;
}

function captureOpponentTokens(tokens, side, destinationProgress) {
  const updatedTokens = {
    creator: [...tokens.creator],
    joiner: [...tokens.joiner]
  };
  const destinationTrackIndex = scoreTrackIndex(side, destinationProgress);
  if (destinationTrackIndex === null || safeTrackIndexes.has(destinationTrackIndex)) {
    return { tokens: updatedTokens, captured: false };
  }

  const opponentSide = side === 'creator' ? 'joiner' : 'creator';
  let captured = false;
  updatedTokens[opponentSide] = updatedTokens[opponentSide].map(progress => {
    if (scoreTrackIndex(opponentSide, progress) !== destinationTrackIndex) return progress;
    captured = true;
    return -1;
  });
  return { tokens: updatedTokens, captured };
}

function isLudoScoreWinner(tokens) {
  return Array.isArray(tokens)
    && tokens.length === LUDO_SCORE_TOKEN_COUNT
    && tokens.every(progress => progress === LUDO_SCORE_FINISH_PROGRESS);
}

function ludoScoreWinnerSide(scores, finishingSide) {
  const otherSide = finishingSide === 'creator' ? 'joiner' : 'creator';
  const finishingScore = Number(scores?.[finishingSide]) || 0;
  const otherScore = Number(scores?.[otherSide]) || 0;
  return otherScore > finishingScore ? otherSide : finishingSide;
}

module.exports = {
  LUDO_SCORE_FINISH_PROGRESS,
  LUDO_SCORE_HOME_ENTRY_BONUS,
  LUDO_SCORE_LOOP_LENGTH,
  LUDO_SCORE_MAX,
  LUDO_SCORE_TOKEN_FINISH_POINTS,
  LUDO_SAFE_TRACK_INDEXES,
  captureOpponentTokens,
  isLudoScoreWinner,
  legalTokenIndexesForRoll,
  ludoScoreWinnerSide,
  nextLudoTokenProgress,
  nextSixStreak,
  scoreAfterTimeout,
  scoresAfterMove
};
