//  [Load Package]
const express = require('express');

const router = express.Router();
router.use(express.json());
require('dotenv').config();

const Web3 = require('web3');
const walletAddressValidator = require('wallet-address-validator');

const kovanNetwork = 'https://kovan.infura.io/v3/e96fe621da8c4861a7985933e5312970';

const web3 = new Web3(kovanNetwork);
const contractAddress = '0xC83393fCf17a5575cD9D8702493536aaE803916D';
const callerPrivateKey = '7c968debcf172bee7a01ba8a3b7787b6f3d869d324a1e3d24d0e098f717ffb17';
const contractCaller = '0x6a2db060C153F3d11A4EBB855CEA4a00f32b5a56';

const NFTModel = require('../../../../models/nftmockup');
const TransactionModel = require('../../../../models/transaction');
const AuthModel = require('../../../../models/auth');

const authMiddleware = require('../../../middleware/authMiddleware');

// [Minting]
router.post('/mint', async (req, res) => {
  // [GET BODY]
  const {
    collectionName,
    name,
    imgUrl,
    owner,
    description,
  } = req.body;

  await web3.eth.accounts.wallet.remove(contractCaller);
  await web3.eth.accounts.wallet.add(callerPrivateKey);

  let result = {};
  try {
    const nonce = await web3.eth.getTransactionCount(contractCaller, 'latest'); // get latest nonce
    const inputData = web3.eth.abi.encodeFunctionCall({
      name: 'mint',
      type: 'function',
      inputs: [
        {
          type: 'address',
          name: 'creator',
        }, {
          type: 'string',
          name: 'uri',
        }, {
          type: 'string',
          name: 'contentName',
        }],
    }, [owner, imgUrl, name]);

    const tx = {
      chainId: 42,
      from: contractCaller,
      to: contractAddress,
      nonce,
      gas: 500000,
      data: inputData,
    };

    try {
      const signTx = await web3.eth.accounts.signTransaction(tx, callerPrivateKey);

      const transfer = await web3.eth.sendSignedTransaction(signTx.rawTransaction);

      const tokenId = String(web3.utils.hexToNumber(transfer.logs[0].topics[3]));

      transfer.tokenId = tokenId;

      // [Save NFT Data On MongoDB]
      const nft = new NFTModel();
      nft.tokenId = tokenId;
      nft.collectionName = collectionName;
      nft.networkType = 'ETH';
      nft.name = name;
      nft.description = description;
      nft.imgUrl = imgUrl;
      nft.owner = owner;
      nft.creator = owner;

      await nft.save((err) => {
        if (err) {
          console.error(err);
          res.json({ result: 'Cannot save NFT data' });
        }
      });

      // [Save Transaction Data On MongoDB]
      const txModel = new TransactionModel();
      const txId = String(transfer.transactionHash);
      txModel.txId = txId;
      txModel.toAddr = owner;
      txModel.isNft = true;
      txModel.fromAddr = 'NullAddress';
      txModel.tokenId = tokenId;
      txModel.amount = 1;
      txModel.tokenType = 'ETH';
      txModel.event = 'Minted';

      await txModel.save((err) => {
        if (err) {
          console.error(err);
          res.json({ result: 'Cannot save Transaction data' });
        }
      });

      result = `Minted success! tokenId = ${tokenId}`;
      res.send(result);
    } catch (err) {
      result.message = err;
      res.send(result);
    }
  } catch (err) {
    result.message = err;
    res.send(result);
  }
});

// [Transfer by Song]
router.post('/transfer', async (req, res) => {
  // [Get Body]
  const {
    fromAddr, toAddr, tokenId, amount,
  } = req.body;

  let result = {};

  try {
    if (!walletAddressValidator.validate(fromAddr, 'ETH')) {
      result = 'Invalid FromWallet';
      res.send(result);
    } else if (!walletAddressValidator.validate(toAddr, 'ETH')) {
      result = 'Invalid ToWallet';
      res.send(result);
    } else if (tokenId === undefined) {
      result.message = 'invalid tokenId';
      res.send(result);
    } else if (amount <= 0) {
      result.message = 'invalid amount';
      res.send(result);
    } else {
      try {
        // await web3.eth.accounts.wallet.remove(contractCaller);
        await web3.eth.accounts.wallet.add(callerPrivateKey);

        const nonce = await web3.eth.getTransactionCount(contractCaller, 'latest'); // get latest nonces

        const inputData = web3.eth.abi.encodeFunctionCall({
          name: 'transferFrom',
          type: 'function',
          inputs: [
            {
              type: 'address',
              name: 'from',
            }, {
              type: 'address',
              name: 'to',
            }, {
              type: 'uint256',
              name: 'tokenId',
            }],
        }, [fromAddr, toAddr, web3.utils.toBN(tokenId).toString()]);

        const tx = {
          chainId: 42,
          from: contractCaller,
          to: contractAddress,
          nonce,
          gas: 500000,
          data: inputData,
        };
        const operatorSigned = await web3.eth.accounts.signTransaction(tx, callerPrivateKey);
        console.log(operatorSigned);

        const transfer = await web3.eth.sendSignedTransaction(operatorSigned.rawTransaction);
        console.log(transfer);

        const txId = transfer.transactionHash;

        const txModel = new TransactionModel();
        txModel.txId = txId;
        txModel.toAddr = toAddr;
        txModel.isNft = true;
        txModel.fromAddr = fromAddr;
        txModel.tokenId = tokenId;
        txModel.amount = 1;
        txModel.tokenType = 'ETH';
        txModel.event = 'Transfer';

        txModel.save((err) => {
          if (err) {
            console.error(err);
            res.json({ result: 0 });
          }
        });
        NFTModel.findOne({ tokenId, networkType: 'ETH' }, (err, listing) => {
          if (err) return res.status(500).json({ error: 'DB failure' });
          if (!listing) return res.status(404).json({ error: 'NFT not found' });
          listing.owner = toAddr;
          listing.onSales = false;
          listing.salesStartAt = null;
          listing.salesDueDate = null;
          listing.salesTokenType = null;
          listing.salesPrice = null;

          listing.save((err) => {
            if (err) {
              res.status(500).json({ error: 'failed to update' });
              console.log(err);
            }
          });
        });
        result = transfer;
        res.send(result);
      } catch (err) {
        result.message = 'Please check the possession of NFT.';
        res.send(result);
      }
    }
  } catch (err) {
    result.message = 'Please check privateKey';
    res.send(result);
  }
});

//  [Get NFT Minted On Network]
/* router.get('/networkdata', async (req, res) => {
  const { tokenId } = req.query;

  // [Convert TokenId To uint256 Type]
  const uint256Id = web3.eth.abi.encodeParameter('uint256', tokenId);

  let result = {};

  try {
    const tokenName = await abi.methods.name().call(); // call function name

    const item = await abi.methods.Items(uint256Id).call();// call function Items(tokenId)

    result = {
      tokenName,
      tokenId: item[0],
      name: item[1],
      creator: item[2],
      imgUri: item[3],
    };

    res.send(result);
  } catch (err) {
    result = err;
    res.send(result);
  }
}); */

//  [List NFT On Market]
router.put('/list', async (req, res) => {
  NFTModel.findOne({ tokenId: req.query.tokenId, networkType: 'ETH' }, (err, listing) => {
    if (err) return res.status(500).json({ error: 'DB failure' });
    if (!listing) return res.status(404).json({ error: 'NFT not found' });

    listing.onSales = true;
    listing.salesStartAt = req.body.salesStartAt;
    listing.salesDueDate = req.body.salesDueDate;
    /*    const tmpDate = new Date();
        if (req.body.salesDueDate) {
          req.body.salesDueDate *= 1;
          listing.salesDueDate = tmpDate.setDate(tmpDate.getDate() + req.body.salesDueDate);
        }// For day amount dev expand */
    if (req.body.salesTokenType) listing.salesTokenType = 'ETH';
    if (req.body.salesPrice) listing.salesPrice = req.body.salesPrice;

    listing.save((err) => {
      if (err) {
        res.status(500).json({ error: 'failed to update' });
        console.log(err);
      }
    });
    res.json({ message: 'Sales information updated success!!' });
  });
});

// [Cancel Listing]
router.post('/withdraw', async (req, res) => {
  const {
    tokenId,
  } = req.body;
  const result = {};
  NFTModel.findOne({ tokenId, networkType: 'ETH' }, (err, listing) => {
    if (err) return res.status(500).json({ error: 'DB failure' });
    if (!listing) return res.status(404).json({ error: 'NFT not found' });
    listing.onSales = false;
    listing.salesStartAt = null;
    listing.salesDueDate = null;
    listing.salesTokenType = null;
    listing.salesPrice = null;

    listing.save((err) => {
      if (err) {
        result.message('failed to update');
        res.send(result);
      }
    });
  });
  res.json({ message: 'Listing Canceled success!!' });
});

//  [Token History]
router.get('/tokenhistory', async (req, res) => {
  const { tokenId } = req.query;
  const result = {};
  result.message = '';
  result.code = 400;
  result.message = 'Error';

  if (!tokenId) {
    tokenId = req.body.tokenId;
  }

  if (tokenId !== undefined) {
    try {
      TransactionModel.find({ tokenId, tokenType: 'ETH' }).sort({ createdAt: -1 }).exec((err, docs) => {
        res.send(docs);
      });
    } catch (err) {
      console.log(err);
      res.send(result);
    }
  }
});

//  [Buy History]
router.get('/buyhistory', async (req, res) => {
  const result = {};
  const { address } = req.query;

  try {
    TransactionModel.find({ toAddr: address, isNft: true })
      .sort({ createdAt: -1 })
      .exec((err, docs) => {
        res.send(docs);
      });
  } catch (err) {
    console.log(err);
    res.send(result);
  }
});

//  [Sell History]
router.get('/sellhistory', async (req, res) => {
  const result = {};
  // const wallet = await web3.eth.accounts.wallet.add(callerPrivateKey);
  const { address } = req.query;

  try {
    TransactionModel.find({ fromAddr: address, isNft: true })
      .sort({ createdAt: -1 })
      .exec((err, docs) => {
        res.send(docs);
      });
  } catch (err) {
    console.log(err);
    res.send(result);
  }
});

// [GET ALL NFTs Or Single NFT By tokenId]
router.get('/dbdata', async (req, res) => {
  if (!req.query.tokenId) {
    NFTModel.find({}).sort({ createdAt: -1 }).exec((err, nft) => {
      if (err) return res.status(500).send({ error: 'DB failure' });
      return res.json(nft);
    });
  } else {
    NFTModel.findOne({ networkType: 'ETH', tokenId: req.query.tokenId }, (err, nft) => {
      if (err) return res.status(500).json({ error: 'DB failure' });
      if (!nft) return res.status(404).json({ error: 'Token not found' });
      return res.json(nft);
    });
  }
});

// [Get My Page NFT]
router.get('/mypage', async (req, res) => {
  const { owner } = req.query;
  const result = {};
  result.message = '';
  result.code = 400;
  result.message = 'Error';

  if (owner !== undefined) {
    try {
      NFTModel.find({ owner }).sort({ tokenId: -1 }).exec((err, docs) => {
        res.send(docs);
      });
    } catch (err) {
      console.log(err);
      res.send(result);
    }
  }
});

// [Get HotDrops NFT]
router.get('/hotdrops', async (req, res) => {
  const result = {};
  result.message = '';
  result.code = 400;
  result.message = 'Error';
  try {
    NFTModel.find({ onSales: true, salesStartAt: { $lte: Date.now() } })
      .sort({ salesStartAt: -1 })
      .limit(10).exec((err, docs) => {
        res.send(docs);
      });
  } catch (err) {
    console.log(err);
    res.send(result);
  }
});

// [GET Collection NFT onSales]
router.get('/collection', async (req, res) => {
  const result = {};
  result.message = '';
  result.code = 400;
  result.message = 'Error';
  try {
    NFTModel.find({ onSales: true, salesStartAt: { $lte: Date.now() } })
      .sort({ createdAt: -1 }).exec((err, docs) => {
        res.send(docs);
      });
  } catch (err) {
    console.log(err);
    res.send(result);
  }
});

module.exports = router;
