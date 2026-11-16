const LUDO_RACE_FINISH = 57;
const LUDO_RACE_TOKEN_COUNT = 4;
const LUDO_RACE_COLORS = Object.freeze(['red', 'green', 'yellow', 'blue']);
const LUDO_RACE_TRACK = Object.freeze([
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12],
  [6, 13], [6, 14], [7, 14], [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8],
  [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6], [13, 6], [12, 6], [11, 6],
  [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0]
]);
const LUDO_RACE_COLOR_CONFIG = Object.freeze({
  red: Object.freeze({ startIndex: 0, homePath: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]], finish: [7, 6], baseSlots: [[1, 1], [1, 4], [4, 1], [4, 4]] }),
  green: Object.freeze({ startIndex: 26, homePath: [[8, 13], [8, 12], [8, 11], [8, 10], [8, 9]], finish: [8, 8], baseSlots: [[10, 10], [10, 13], [13, 10], [13, 13]] }),
  yellow: Object.freeze({ startIndex: 13, homePath: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]], finish: [6, 7], baseSlots: [[1, 10], [1, 13], [4, 10], [4, 13]] }),
  blue: Object.freeze({ startIndex: 39, homePath: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]], finish: [8, 7], baseSlots: [[10, 1], [10, 4], [13, 1], [13, 4]] })
});

function isValidLudoRaceColor(color) {
  return LUDO_RACE_COLORS.includes(String(color || '').toLowerCase());
}

function defaultLudoRaceJoinerColor(creatorColor) {
  return LUDO_RACE_COLORS.find(color => color !== creatorColor) || LUDO_RACE_COLORS[1];
}

function createLudoRaceState(creatorId, colors) {
  return {
    version: 0,
    tokens: {
      creator: Array(LUDO_RACE_TOKEN_COUNT).fill(-1),
      joiner: Array(LUDO_RACE_TOKEN_COUNT).fill(-1)
    },
    colors: { creator: colors.creator, joiner: colors.joiner },
    currentTurn: String(creatorId),
    diceValue: null,
    lastDice: null,
    legalTokenIndexes: [],
    winnerId: null
  };
}

function isLudoRaceWinner(tokens) {
  return Array.isArray(tokens)
    && tokens.length === LUDO_RACE_TOKEN_COUNT
    && tokens.every(progress => progress === LUDO_RACE_FINISH);
}

module.exports = {
  LUDO_RACE_FINISH,
  LUDO_RACE_TOKEN_COUNT,
  LUDO_RACE_COLORS,
  LUDO_RACE_TRACK,
  LUDO_RACE_COLOR_CONFIG,
  isValidLudoRaceColor,
  defaultLudoRaceJoinerColor,
  createLudoRaceState,
  isLudoRaceWinner
};
