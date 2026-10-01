const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  gameType: { type: String, enum: ['LUDO', 'SNAKE'], required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  joiner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true },
  creatorWinningsUsed: { type: Number, default: 0 },
  joinerWinningsUsed: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['OPEN', 'RUNNING', 'PENDING_RESULT', 'PENDING_CANCELLATION', 'COMPLETED', 'CANCELLED'],
    default: 'OPEN'
  },
  roomCode: { type: String, default: '' },
  roomCodeSharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  roomCodeSharedAt: { type: Date },
  joinedAt: { type: Date },
  roomCodeDeadline: { type: Date },
  creatorStartedAt: { type: Date },
  creatorConfirmedAt: { type: Date },
  joinerConfirmedAt: { type: Date },
  gameStartedAt: { type: Date },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resultSubmittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  creatorResult: { type: String, enum: ['WIN', 'LOSS'] },
  creatorResultReason: { type: String, default: '' },
  creatorProofScreenshot: { type: String, default: '' },
  joinerResult: { type: String, enum: ['WIN', 'LOSS'] },
  joinerResultReason: { type: String, default: '' },
  joinerProofScreenshot: { type: String, default: '' },
  proofScreenshot: { type: String },
  cancelReason: { type: String, default: '' },
  cancelRequestReason: { type: String, default: '' },
  cancelRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelRequestedAt: { type: Date },
  cancelRequestedFromStatus: { type: String, enum: ['OPEN', 'RUNNING'] },
  cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cancelledAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Match', matchSchema);
