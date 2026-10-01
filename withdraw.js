const mongoose = require('mongoose');

const withdrawSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  payoutMethod: { type: String, enum: ['BANK', 'UPI', 'QR'], default: 'UPI' },
  accountNumber: { type: String, default: '' },
  accountHolderName: { type: String, default: '' },
  ifscCode: { type: String, default: '' },
  upiId: { type: String, default: '' },
  payoutQr: { type: String, default: '' },
  status: { type: String, enum: ['PENDING', 'PAID', 'REJECTED'], default: 'PENDING' }
}, { timestamps: true });

module.exports = mongoose.model('Withdraw', withdrawSchema);
