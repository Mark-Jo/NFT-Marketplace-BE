// [LOAD PACKAGES]
const mongoose = require('mongoose');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const cors = require('cors');

const app = express();

require('dotenv').config();

// [CONFIGURE APP TO USE bodyParser]
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());

// [CONNECT TO MONGODB SERVER]
const db = mongoose.connection;
db.on('error', console.error);
db.once('open', () => {
  console.log('Connected to mongodb server');
});
// mongoose.connect('mongodb://10.0.8.80:27017/blockchaindb')
//   .then(() => console.log('MongoDB Connected...'))
//   .catch((err) => console.log(err));

mongoose.connect('mongodb://localhost:27017/blockchaindb')
  .then(() => console.log('MongoDB Connected...'))
  .catch((err) => console.log(err));

// [CONFIGURE ROUTER]
const router = require('./routes');

app.use('/', router);

// cors
app.use(cors({
  origin: true,
  credentials: true, // 크로스 도메인 허용
  methods: ['POST', 'PUT', 'GET', 'OPTIONS', 'HEAD'],
}));

// [CONFIGURE SERVER PORT]
const port = process.env.PORT || 8080;

// [RUN SERVER]
app.listen(port, () => {
  console.log(`Express server has started on port ${port}`);
});
