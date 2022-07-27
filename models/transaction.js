const mongoose = require('mongoose');

const { Schema } = mongoose;

const schema = new Schema({
  txId: { type: String, required: true },
  toAddr: { type: String, required: true },
  isNft: { type: Boolean, default: false },
  fromAddr: { type: String, required: true },
  tokenId: { type: String },
  amount: Number,
  tokenType: { type: String },
  event: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('transaction', schema);
