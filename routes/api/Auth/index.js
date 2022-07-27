const express = require('express');

const router = express.Router();
require('dotenv').config();

// 인증
// const bcrypt = require('bcryptjs');
// JWT
const jwt = require('jsonwebtoken');

const { ACCESS_SECRET_KEY } = process.env;
const { REFRESH_SECRET_KEY } = process.env;
const authMiddleware = require('../../middleware/authMiddleware');

// DB
const AuthModel = require('../../../models/auth');

// const NFTModel = require('../../../models/nftmockup');

// 회원가입 API
router.post('/signup', async (req, res) => {
  const {
    userName,
    userId,
    walletType,
    walletAddress,
  } = req.body;

  AuthModel.findOne({ walletAddress }, (err, user) => {
    if (user) {
      const accessToken = jwt.sign(
        {
          walletAddress: user.walletAddress,
        },
        ACCESS_SECRET_KEY,
        {
          expiresIn: '1d',
        },
      );
      res.cookie('accessToken', accessToken);
      res.cookie('refreshToken', user.refreshToken);
      res.status(200).json({
        message: 'Login Success!!',
        id: user.userId,
        name: user.userName,
        addr: user.walletAddress,
        accessToken,
        refreshToken: user.refreshToken,
      });
    } else {
      try {
        const newUser = new AuthModel({
          userName,
          userId,
          walletType,
          walletAddress,
        });

        const refreshToken = jwt.sign(
          {},
          REFRESH_SECRET_KEY,
          {
            expiresIn: '14d',
            issuer: 'song',
          },
        );
        newUser.refreshToken = refreshToken;

        newUser.save((err) => {
          if (err) {
            console.error(err);
            res.json({ result: 'Cannot save User data' });
          }
        });

        const accessToken = jwt.sign(
          {
            walletAddress: user.walletAddress,
          },
          ACCESS_SECRET_KEY,
          {
            expiresIn: '1d',
          },
        );
        res.cookie('accessToken', accessToken);
        res.cookie('refreshToken', refreshToken);
        res.status(200).json({
          message: 'Signup Success!!',
          id: user.userId,
          name: user.userName,
          addr: user.walletAddress,
          accessToken,
          refreshToken,
        });
        // result = user;
        // res.send(result);
      } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error!');
      }
    }
  });
});

// 로그인
/* router.post('/login', authMiddleware, async (req, res) => {
  const { walletAddress } = req.query;
  const result = {};
  AuthModel.findOne({ walletAddress }, (err, user) => {
    if (err) return res.status(500).json({ error: 'DB failure' });
    if (!user) return res.status(401).json(result);
    const accessToken = jwt.sign(
      {
        walletAddress: user.walletAddress,
      },
      ACCESS_SECRET_KEY,
      {
        expiresIn: '1d',
      },
    );
    res.cookie('refreshToken', user.refreshToken);
    res.cookie('accessToken', accessToken);
    return res.send(user);
  });
}); */

// 지갑주소로 회원가입 여부 검사
router.get('/isSignedUp', async (req, res) => {
  const { walletAddress } = req.query;
  const result = {};
  AuthModel.findOne({ walletAddress }, (err, user) => {
    if (err) return res.status(500).json({ error: 'DB failure' });
    if (!user) return res.status(401).json(result);
    return res.send(user);
  });
});

// 유저정보 업데이트
router.put('/updateUserInfo', async (req, res) => {
  const { walletAddress } = req.query;
  let result = {};
  AuthModel.findOne({ walletAddress }, (err, user) => {
    if (err) return res.status(500).json({ error: 'DB failure' });
    if (!user) return res.status(401).json(result);

    if (req.body.userId) user.userId = req.body.userId;
    if (req.body.userName) user.userName = req.body.userName;

    user.save((error) => {
      if (error) {
        res.status(500).json({ error: 'failed to update' });
        console.log(error);
      }
    });
    result = user;
    res.send(result);
  });
});

// accessToken 쿠키로 회원정보 조회
router.get('/userInfo', authMiddleware, async (req, res) => {
  if (req.cookies.accessToken === undefined) return res.status(404).json({ error: 'API Token Undefined!!' });
  jwt.verify(req.cookies.accessToken, ACCESS_SECRET_KEY, (err, decoded) => {
    if (err) throw err;
    console.log(decoded.walletAddress);
    let result = {};
    AuthModel.findOne({ walletAddress: decoded.walletAddress }, (err, user) => {
      if (err) return res.status(500).json({ error: 'DB failure' });
      if (!user) return res.status(401).json(result);
      result = user;
      return res.send(result);
    });
  });
  // console.log(accessToken);
});

module.exports = router;
