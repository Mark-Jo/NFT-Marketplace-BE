const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');
require('dotenv').config();

const router = express.Router();

const s3 = new AWS.S3({
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  region: process.env.S3_RESION,
});

const upload = multer({
  storage: multerS3({
    s3,
    bucket: 'nft-bucket-mzc',
    key(req, file, cb) {
      const ext = file.mimetype.split('/')[1];
      if (!['png', 'jpg', 'jpeg', 'gif', 'bmp'].includes(ext)) {
        return cb(new Error('Only images are allowed'));
      }
      return cb(null, `${Date.now()}.${file.originalname.split('.').pop()}`);
    },
  }),
  acl: 'public-read-write',
  limits: { fileSize: 5 * 1024 * 1024 },
});

// 이미지 업로드 요청
router.post('/upload', upload.single('file'), async (req, res) => {
  console.log(req.file.location);
  res.send(req.file.location);
});
module.exports = router;
