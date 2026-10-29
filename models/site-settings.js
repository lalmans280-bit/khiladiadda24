const mongoose = require('mongoose');

const playerCopyEntrySchema = new mongoose.Schema({
  from: { type: String, required: true, maxlength: 400 },
  to: { type: String, default: '', maxlength: 500 }
}, { _id: false });

const siteSettingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'support-contact' },
  supportNumber: { type: String, default: '79557295' },
  whatsappNumber: { type: String, default: '79557295' },
  depositUpiId: { type: String, default: '' },
  withdrawalTickerEnabled: { type: Boolean, default: true },
  withdrawalTickerDays: { type: Number, enum: [7, 14, 30], default: 30 },
  withdrawalTickerMinimumAmount: { type: Number, min: 0, max: 10000000, default: 5000 },
  withdrawalTickerMaxItems: { type: Number, enum: [5, 10, 20, 30], default: 30 },
  smsApiKey: { type: String, default: '' },
  playerCopy: { type: [playerCopyEntrySchema], default: [] }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
