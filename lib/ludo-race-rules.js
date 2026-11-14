const LUDO_RACE_COLORS = Object.freeze(['red', 'green', 'yellow', 'blue']);
const LUDO_RACE_TRACK = Object.freeze([
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5], [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 9], [6, 10], [6, 11], [6, 12],
  [6, 13], [6, 14], [7, 14], [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9], [9, 8],
  [10, 8], [11, 8], [12, 8], [13, 8], [14, 8], [14, 7], [14, 6], [13, 6], [12, 6], [11, 6],
  [10, 6], [9, 6], [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0], [7, 0], [6, 0]
].map(point => Object.freeze(point)));

const LUDO_RACE_COLOR_CONFIG = Object.freeze({
  red: Object.freeze({
    startIndex: 0,
    homePath: Object.freeze([[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]].map(point => Object.freeze(point))),
    finish: Object.freeze([7, 6])
  }),
  green: Object.freeze({
    startIndex: 26,
    homePath: Object.freeze([[8, 13], [8, 12], [8, 11], [8, 10], [8, 9]].map(point => Object.freeze(point))),
    finish: Object.freeze([8, 8])
  }),
  yellow: Object.freeze({
    startIndex: 13,
    homePath: Object.freeze([[1, 8], [2, 8], [3, 8], [4, 8], [5, 8]].map(point => Object.freeze(point))),
    finish: Object.freeze([6, 8])
  }),
  blue: Object.freeze({
    startIndex: 39,
    homePath: Object.freeze([[13, 6], [12, 6], [11, 6], [10, 6], [9, 6]].map(point => Object.freeze(point))),
    finish: Object.freeze([8, 6])
  })
});

const defaultJoinerColors = Object.freeze({
  red: 'green',
  green: 'red',
  yellow: 'blue',
  blue: 'yellow'
});

function isValidLudoRaceColor(color) {
  return typeof color === 'string' && LUDO_RACE_COLORS.includes(color.trim().toLowerCase());
}

function defaultLudoRaceJoinerColor(creatorColor) {
  const normalizedColor = isValidLudoRaceColor(creatorColor) ? creatorColor.trim().toLowerCase() : 'red';
  return defaultJoinerColors[normalizedColor];
}

function createLudoRaceState(creatorId, colors = {}) {
  const creatorColor = isValidLudoRaceColor(colors.creator) ? colors.creator.trim().toLowerCase() : 'red';
  const requestedJoinerColor = isValidLudoRaceColor(colors.joiner)
    ? colors.joiner.trim().toLowerCase()
    : defaultLudoRaceJoinerColor(creatorColor);
  const joinerColor = requestedJoinerColor === creatorColor
    ? defaultLudoRaceJoinerColor(creatorColor)
    : requestedJoinerColor;

  return {
    version: 0,
    tokens: { creator: [-1, -1, -1, -1], joiner: [-1, -1, -1, -1] },
    currentTurn: String(creatorId),
    diceValue: null,
    legalTokenIndexes: [],
    winnerId: null,
    colors: { creator: creatorColor, joiner: joinerColor }
  };
}

function isLudoRaceWinner(tokens) {
  return Array.isArray(tokens) && tokens.some(progress => progress === 57);
}

module.exports = {
  LUDO_RACE_COLORS,
  LUDO_RACE_TRACK,
  LUDO_RACE_COLOR_CONFIG,
  isValidLudoRaceColor,
  defaultLudoRaceJoinerColor,
  createLudoRaceState,
  isLudoRaceWinner
};
