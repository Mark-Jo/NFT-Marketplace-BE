const mongoose = require('mongoose');

const { Schema } = mongoose;

const schema = new Schema({
  owner: String,
  tokenName: String,
  description: String,
  tokenId: String,
  imgUrl: String,
  publishedDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model('DB', schema);
