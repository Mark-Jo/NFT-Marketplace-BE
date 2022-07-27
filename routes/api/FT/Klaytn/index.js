const express = require('express');

const router = express.Router();
const Web3 = require('web3');
require('dotenv').config();
const walletAddressValidator = require('wallet-address-validator');

const web3 = new Web3('http://10.0.8.80:8545');
const privateKey = '0xbd2e7352f527801a8faae978feb8ac5911c46ccbe0314c4bdd843cd4b11f3e49';// 구매자

const TransactionModel = require('../../../../models/transaction');
//  [Transfer FT]
router.post('/transfer', async (req, res) => {
  const {
    fromAddr, toAddr, tokenId, amount,
  } = req.body;
  console.log(req.body);
  const result = {};
  result.message = '';
  result.code = 400;
  result.message = 'invalid address';
  const txObject = {
    from: fromAddr,
    to: toAddr,
    value: web3.utils.toWei(amount, 'ether'),
    gas: 50000,
  };

  const signedTx = await web3.eth.accounts.signTransaction(txObject, privateKey);

  web3.eth.sendSignedTransaction(signedTx.rawTransaction, async (error, output) => {
    if (error) {
      console.log('Transaction error', error);
    } else {
      const txHash = output;
      const txModel = new TransactionModel();
      txModel.txid = txHash;
      txModel.toAddr = toAddr;
      txModel.fromAddr = fromAddr;
      txModel.amount = amount;
      txModel.tokenType = 'KLAY';

      txModel.save((err) => {
        if (err) {
          console.error(err);
          res.json({ result: 0 });
        }
      });
      res.send(txHash);
    }
  });
});
//  [Making TxModel]
router.post('/txMaker', async (req, res) => {
  const {
    fromAddr, toAddr, amount,
  } = req.body;
  const result = {};
  result.message = '';
  result.code = 400;
  result.message = 'invalid address';
  const txObject = {
    from: fromAddr,
    to: toAddr,
    value: `0x${Buffer.from(amount, 'utf8').toString('hex')}`,
    gas: `0x${Buffer.from('50000', 'utf8').toString('hex')}`,
  };
  res.send(txObject);
});
//  [Transfer FT]
router.post('/txhashsave', async (req, res) => {
  const {
    txHash, toAddr, fromAddr, amount,
  } = req.body;

  const txModel = new TransactionModel();
  txModel.txId = txHash;
  txModel.toAddr = toAddr;
  txModel.fromAddr = fromAddr;
  txModel.amount = amount;
  // txModel.networkType = networkType;
  txModel.tokenType = 'KLAY';
  txModel.event = 'Transfer';

  txModel.save((err) => {
    if (err) {
      console.error(err);
      res.json({ result: 0 });
    }
  });
  res.send(txHash);
});

module.exports = router;
