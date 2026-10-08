const mongoose = require('mongoose');

const playerOverrideSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  points: { type: Number, min: 0 },
  prize: { type: Number, min: 0 }
}, { _id: false });

const monthlyLeaderboardSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  pointsPerGame: { type: Number, min: 0, default: 5 },
  winBonus: { type: Number, min: 0, default: 15 },
  prizePool: { type: Number, min: 0, default: 5000 },
  prizes: { type: [Number], default: [] },
  playerOverrides: { type: [playerOverrideSchema], default: [] }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('MonthlyLeaderboard', monthlyLeaderboardSchema);
