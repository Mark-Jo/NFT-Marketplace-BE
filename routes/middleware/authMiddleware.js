const jwt = require('jsonwebtoken');
require('dotenv').config();

const { ACCESS_SECRET_KEY } = process.env;
const { REFRESH_SECRET_KEY } = process.env;

const AuthModel = require('../../models/auth');

const authMiddleware = async (req, res, next) => {
  if (req.cookies.accessToken === undefined) return res.status(404).json({ error: 'AuthMiddleware Token Undefined!!' });
  const { accessToken } = req.cookies;
  const { refreshToken } = req.cookies;

  const accessTokenDecoded = jwt.verify(req.cookies.accessToken, ACCESS_SECRET_KEY);
  const refreshTokenDecoded = jwt.verify(req.cookies.refreshToken, REFRESH_SECRET_KEY);

  if (accessToken === null || accessToken === undefined) {
    if (refreshToken === undefined) { //  access token과 refresh token 모두 만료된 경우
      res.status(401).send({ message: 'Token Expired!!!' });
    } else { // access token 만료, refresh token 유효
      AuthModel.findOne({ refreshToken })
        .exec((err, user) => {
          if (err) {
            res.status(500).send({ message: 'No User!!' });
            return;
          }

          const newAccessToken = jwt.sign(
            { walletAddress: user.walletAddress },
            ACCESS_SECRET_KEY,
            {
              expiresIn: '1d',
              issuer: 'song',
            },
          );
          res.cookie('accessToken', newAccessToken);
          req.cookies.accessToken = newAccessToken;
          next();
        });
    }
  } else if (refreshToken === null || refreshToken === undefined) { // refresh토큰 만료, access토큰 유효
    const newRefreshToken = jwt.sign(
      {},
      REFRESH_SECRET_KEY,
      {
        expiresIn: '14d',
        issuer: 'song',
      },
    );
    AuthModel.findOne({ walletAddress: accessTokenDecoded.walletAddress })
      .exec((err, user) => {
        if (err) {
          res.status(500).send({ message: 'DB ERROR' });
          return;
        }
        user.refreshToken = newRefreshToken;
        user.save((err) => {
          if (err) {
            res.status(500).json({ err: 'Update refreshToken Failed!!' });
            console.log(err);
          }
        });
        res.cookie('refreshToken', newRefreshToken);
        req.cookies.refreshToken = newRefreshToken;
        next();
      });
  } else { //  access, refresh 모두 유효
    next();
  }
};

/* const authMiddleware = async (req, res, next) => {
  if (req.cookies.accessToken === undefined) return next();

  const accessToken = jwt.verify(req.cookies.accessToken, ACCESS_SECRET_KEY);
  const refreshToken = jwt.verify(req.cookies.refreshToken, REFRESH_SECRET_KEY);

  if (accessToken === null || accessToken === undefined) {
    if (refreshToken === undefined) { //  access token과 refresh token 모두 만료된 경우
      res.status(404).send({ message: 'Access Token & Refresh Token Undefined!!' });
    } else { // access token 만료, refresh token 유효
      AuthModel.findOne({ refreshToken: req.cookies.refreshToken })
        .exec((err, user) => {
          if (err) {
            res.status(500).send({ message: 'DB ERROR' });
            return;
          }
          if (accessToken.walletAddress === user.walletAddress) {
            const newAccessToken = jwt.sign(
              { walletAddress: user.walletAddress },
              ACCESS_SECRET_KEY,
              {
                expiresIn: '1d',
                issuer: 'song',
              },
            );
            res.cookie('accessToken', newAccessToken);
            req.cookies.accessToken = newAccessToken;
            next();
          }
        });
    }
  } else if (refreshToken === null || refreshToken === undefined) {
    const newRefreshToken = jwt.sign(
      {},
      REFRESH_SECRET_KEY,
      {
        expiresIn: '14d',
        issuer: 'song',
      },
    );
    AuthModel.findOne({ walletAddress: accessToken.walletAddress })
      .exec((err, user) => {
        if (err) {
          res.status(500).send({ message: 'DB ERROR' });
          return;
        }
        user.refreshToken = refreshToken;
        user.save((err) => {
          if (err) {
            res.status(500).json({ err: 'Update refreshToken Failed!!' });
            console.log(err);
          }
        });
        res.cookie('refreshToken', newRefreshToken);
        req.cookies.refreshToken = newRefreshToken;
        next();
      });
  } else { //  access, refresh 모두 유효
    next();
  }
}; */

module.exports = authMiddleware;
