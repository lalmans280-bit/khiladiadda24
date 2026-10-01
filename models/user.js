const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  profileImage: { type: String, default: '' },
  walletBalance: { type: Number, default: 0 },
  winningsBalance: { type: Number, min: 0 },
  isBlocked: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  isPrimaryAdmin: { type: Boolean, default: false },
  activeBetCount: { type: Number, default: 0 },
  referralCode: { type: String, unique: true, sparse: true, uppercase: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  referralBonusCredited: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
