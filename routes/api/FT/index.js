const express = require('express');

const router = express.Router();

router.use('/Ethereum', require('./Ethereum'));
router.use('/Klaytn', require('./Klaytn'));


module.exports = router;