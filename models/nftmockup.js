const mongoose = require('mongoose');

const { Schema } = mongoose;

const schema = new Schema({
  tokenId: { type: String, require: true },
  collectionName: String,
  networkType: { type: String, require: true },
  name: String,
  description: String,
  imgUrl: { type: String, require: true },
  owner: { type: String, require: true },
  creator: { type: String, require: true },
  createdAt: { type: Date, default: Date.now },
  onSales: { type: Boolean, default: false },
  salesDueDate: { type: Date },
  salesTokenType: { type: String },
  salesPrice: { type: String },
  salesStartAt: { type: Date },
});

module.exports = mongoose.model('nft', schema);
