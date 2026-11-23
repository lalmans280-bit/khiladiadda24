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
  brandLogoPath: { type: String, default: '' },
  appIcon192Path: { type: String, default: '' },
  appIcon512Path: { type: String, default: '' },
  homeBannerPath: { type: String, default: '' },
  ludoBannerPath: { type: String, default: '' },
  snakeBannerPath: { type: String, default: '' },
  supportBannerPath: { type: String, default: '' },
  voiceControlHint: {
    type: String,
    default: 'वेबसाइट को अपनी आवाज़ से भी चलाएँ • प्रोफ़ाइल में वॉइस कंट्रोल शुरू करें',
    maxlength: 160
  },
  withdrawalTickerEnabled: { type: Boolean, default: true },
  withdrawalTickerDays: { type: Number, enum: [7, 14, 30], default: 30 },
  withdrawalTickerMinimumAmount: { type: Number, min: 0, max: 10000000, default: 0 },
  withdrawalTickerMaxItems: { type: Number, enum: [5, 10, 20, 30], default: 30 },
  smsApiKey: { type: String, default: '' },
  playerCopy: { type: [playerCopyEntrySchema], default: [] }
}, { timestamps: true, versionKey: false });

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);
