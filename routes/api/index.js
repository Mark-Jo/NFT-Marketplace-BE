const express = require('express');

const router = express.Router();

router.use('/NFT', require('./NFT'));
router.use('/FT', require('./FT'));
router.use('/metadata', require('./metadata'));
router.use('/Auth', require('./Auth'));
// router.use('/Ether', require('./Ether'));

module.exports = router;
