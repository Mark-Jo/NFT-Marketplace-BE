//  [Load Package]
const express = require('express');

const router = express.Router();
router.use(express.json());
require('dotenv').config();

const walletAddressValidator = require('wallet-address-validator');

//  [Configure ABI & Blockchain info]
const Caver = require('caver-js');

const caver = new Caver('https://api.baobab.klaytn.net:8651');
const contractAddress = '0x6484a351b58C65331787cFbFfC0a8C968F72F287';
const callerPrivatekey = '0x6a349ab5b68d96d631e81266d09c4974e6faa9d1f38ae1de021756561227015c';
const contractCaller = '0xAb1108E0a9F5606852de667180a16D1F77C5653C';
//  [Configure DBSchema]
const NFTModel = require('../../../../models/nftmockup');
const TransactionModel = require('../../../../models/transaction');

const authMiddleware = require('../../../middleware/authMiddleware');

//  [Minting]
router.post('/mint', async (req, res) => {
  // [Get Body]
  const {
    collectionName,
    name,
    imgUrl,
    owner,
    description,
  } = req.body;

  await caver.klay.accounts.wallet.remove(contractCaller);
  await caver.klay.accounts.wallet.add(callerPrivatekey);

  let result = '';
  try {
    const nonce = await caver.rpc.klay.getTransactionCount(contractCaller, 'latest'); // get latest nonces
    const inputData = caver.klay.abi.encodeFunctionCall({
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
      chainId: 1001,
      from: contractCaller,
      to: contractAddress,
      nonce,
      gas: 500000,
      data: inputData,
    };
    try {
      const signedTx = await caver.klay.accounts.signTransaction(tx, callerPrivatekey);

      const transfer = await caver.klay.sendSignedTransaction(signedTx.rawTransaction);

      const tokenId = String(caver.utils.hexToNumber(transfer.logs[0].topics[3]));

      transfer.tokenId = tokenId;

      // [Save NFT Data On MongoDB]
      const nft = new NFTModel();
      nft.tokenId = tokenId;
      nft.collectionName = collectionName;
      nft.networkType = 'KLAY';
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
      txModel.tokenType = 'KLAY';
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

//  [Transfer by J]
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
        await caver.klay.accounts.wallet.remove(contractCaller);
        await caver.klay.accounts.wallet.add(callerPrivatekey);


        const nonce = await caver.rpc.klay.getTransactionCount(contractCaller, 'latest'); // get latest nonces
        const inputData = caver.klay.abi.encodeFunctionCall({
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
        }, [fromAddr, toAddr, caver.utils.toBN(tokenId).toString()]);

        const tx = {
          type: 'SMART_CONTRACT_EXECUTION',
          chainId: 1001,
          from: contractCaller,
          to: contractAddress,
          nonce,
          gas: 500000,
          data: inputData,
        };
        console.log(tokenId);
        const operatorSigned = await caver.klay.accounts.signTransaction(tx, callerPrivatekey);
        const transfer = await caver.klay.sendSignedTransaction(operatorSigned.rawTransaction);

        /* const feePayerSigned = await caver.klay.accounts.feePayerSignTransaction(senderTransaction, feePayer.address).catch((err) => { console.log(err); });
              const transfer = await caver.klay.sendSignedTransaction(feePayerSigned.rawTransaction)
                .catch((err) => { console.log(err); }); */

        /*  const feePayerSigned = await caver.klay.accounts.feePayerSignTransaction(txRlp, feePayer.address).catch((err) => { console.log(err); });
          const transfer = await caver.klay.sendSignedTransaction(feePayerSigned.rawTransaction)
            .catch((err) => { console.log(err); }); */
        /*  const feePayerSigned = await caver.klay.accounts.feePayerSignTransaction(signed.rawTransaction, feePayer.address)
            .catch((err) => { console.log(err); });
          await caver.klay.sendSignedTransaction(feePayerSigned.rawTransaction)
            .on('receipt', (receipt) => {
              transfer = receipt;
            })
            .on('error', console.error); */
        const txId = transfer.transactionHash;

        const txModel = new TransactionModel();
        txModel.txId = txId;
        txModel.toAddr = toAddr;
        txModel.isNft = true;
        txModel.fromAddr = fromAddr;
        txModel.tokenId = tokenId;
        txModel.amount = 1;
        txModel.tokenType = 'KLAY';
        txModel.event = 'Transfer';

        txModel.save((err) => {
          if (err) {
            console.error(err);
            res.json({ result: 0 });
          }
        });
        NFTModel.findOne({ tokenId, networkType: 'KLAY' }, (err, listing) => {
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
        result.message = 'please check the posession of NFT.';
        res.send(result);
      }
    }
  } catch (err) {
    result.message = 'Please check privateKey';
    res.send(result);
  }
});

//  [Get NFT Minted On Network]
/*router.get('/networkdata', async (req, res) => {
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
});*/

//  [List NFT On Market]
router.put('/list', async (req, res) => {
  NFTModel.findOne({ tokenId: req.query.tokenId, networkType: 'KLAY' }, (err, listing) => {
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
    if (req.body.salesTokenType) listing.salesTokenType = 'KLAY';
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
  NFTModel.findOne({ tokenId, networkType: 'KLAY' }, (err, listing) => {
    if (err) return res.status(500).json({ error: 'DB failure' });
    if (!listing) return res.status(404).json({ error: 'NFT not found' });
    listing.onSales = false;
    listing.salesStartAt = null;
    listing.salesDueDate = null;
    listing.salesTokenType = null;
    listing.salesPrice = null;

    listing.save((err) => {
      if (err) {
        res.status(500).json({ error: 'faled to update' });
        console.log(err);
      }
    });
  });
  res.send(result);
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
      TransactionModel.find({ tokenId, tokenType: 'KLAY' }).sort({ createdAt: -1 }).exec((err, docs) => {
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
  const wallet = await web3.eth.accounts.wallet.add(privateKey);
  // const { address } = wallet;
  const address = '0x8F2d92f4B1722013A49920229E41316792633CD1';
  try {
    TransactionModel.find({ toAddr: address, nftFlag: true }).sort({ createdAt: -1 }).exec((err, docs) => {
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
  const wallet = await web3.eth.accounts.wallet.add(privateKey);
  const { address } = wallet;

  try {
    TransactionModel.find({ fromAddr: address, nftFlag: true }).sort({ createdAt: -1 }).exec((err, docs) => {
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
    NFTModel.find((err, nft) => {
      if (err) return res.status(500).send({ error: 'DB failure' });
      return res.json(nft);
    });
  } else {
    NFTModel.findOne({ networkType: 'KLAY', tokenId: req.query.tokenId }, (err, nft) => {
      if (err) return res.status(500).json({ error: 'DB failure' });
      if (!nft) return res.status(404).json({ error: 'Token not found' });
      /* let tempDate=new Date(nft.salesDueDate);
              tempDate=tempDate.getTime()+9 * 60 * 60 * 1000;
              tempDate=new Date(tempDate);
              tmepDate=tempDate.toLocaleString('ko');
              //tempDate=tempDate+(3600000*9);
              console.log(tempDate.toLocaleString('ko'));
              nft.salesDueDate=DueDate; */
      return res.json(nft);
    });
  }
});

/*// [Get My Page NFT]
router.get('/mypage', async (req, res) => {
  const { owner } = req.query;
  const result = {};
  result.message = '';
  result.code = 400;
  result.message = 'Error';

  // if (!owner) {
  //   owner = req.body.owner;
  // }

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
});*/

/*// [Get HotDrops NFT]
router.get('/hotdrops', async (req, res) => {
  const result = {};
  result.message = '';
  result.code = 400;
  result.message = 'Error';
  try {
    NFTModel.find({ onSales: true, salesStartAt: { $lte: Date.now() } }).sort({ salesStartAt: -1 })
      .limit(10).exec((err, docs) => {
        res.send(docs);
      });
  } catch (err) {
    console.log(err);
    res.send(result);
  }
});*/

/*// [GET Collection NFT onSales]
router.get('/collection', async (req, res) => {
  const result = {};
  result.message = '';
  result.code = 400;
  result.message = 'Error';
  try {
    NFTModel.find({ onSales: true, salesStartAt: { $lte: Date.now() } })
      .sort({ tokenId: -1 }).exec((err, docs) => {
        res.send(docs);
      });
  } catch (err) {
    console.log(err);
    res.send(result);
  }
});*/

module.exports = router;
