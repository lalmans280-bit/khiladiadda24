function scoreFor(state, side) {
  const savedScore = Number(state.scores?.[side]);
  if (Number.isFinite(savedScore)) return Math.max(0, savedScore);
  return (state.tokens?.[side] || []).filter(progress => progress === 57).length * 250;
}

function scoresAfterMove(state, tokens) {
  const scores = {};
  for (const side of ['creator', 'joiner']) {
    const homesBefore = (state.tokens?.[side] || []).filter(progress => progress === 57).length;
    const homesAfter = (tokens[side] || []).filter(progress => progress === 57).length;
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

module.exports = { nextSixStreak, scoreAfterTimeout, scoresAfterMove };
