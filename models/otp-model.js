const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: { type: String, required: true },
  otp: { type: String, required: true },
  username: { type: String, default: '' },
  referralCode: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: { expires: 300 } }
});

module.exports = mongoose.model('Otp', otpSchema);
