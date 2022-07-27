const mongoose = require('mongoose');

const { Schema } = mongoose;

const schema = new Schema({
  walletAddress: { type: String, required: true },
  walletType: { type: String, required: true },
  userId: { type: String },
  userName: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  refreshToken: { type: String },
});

module.exports = mongoose.model('auth', schema);
