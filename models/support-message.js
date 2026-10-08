const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, enum: ['player', 'admin'], required: true },
  senderName: { type: String, required: true, maxlength: 80 },
  text: { type: String, default: '', maxlength: 1000 },
  attachment: { type: String, default: '' },
  readAt: { type: Date, default: null }
}, { timestamps: true, versionKey: false });

supportMessageSchema.index({ userId: 1, createdAt: -1 });
supportMessageSchema.index({ senderRole: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model('SupportMessage', supportMessageSchema);
