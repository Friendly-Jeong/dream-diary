const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const { authMiddleware } = require('./auth');

const router = express.Router();
const PROFILE_DIR = path.join(__dirname, '../data/profiles');
if (!fs.existsSync(PROFILE_DIR)) fs.mkdirSync(PROFILE_DIR);

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 }, // 500KB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('이미지 파일만 업로드 가능합니다.'));
    cb(null, true);
  }
});

// 프로필 이미지 업로드
router.post('/upload', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    const username = req.user.username;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const filename = `${username}_${Date.now()}${ext}`;
    const filepath = path.join(PROFILE_DIR, filename);
    // sharp로 리사이즈(최대 256x256, jpeg)
    await sharp(req.file.buffer)
      .resize(256, 256, { fit: 'inside' })
      .jpeg({ quality: 80 })
      .toFile(filepath);
    // users.json에 이미지 경로 추가
    const usersFile = path.join(__dirname, '../data/users.json');
    const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
    const user = users.find(u => u.username === username);
    if (!user.profileImages) user.profileImages = [];
    user.profileImages.push(filename);
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    res.json({ message: '업로드 성공', filename });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// 프로필 이미지 목록
router.get('/list', authMiddleware, (req, res) => {
  const username = req.user.username;
  const usersFile = path.join(__dirname, '../data/users.json');
  const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
  const user = users.find(u => u.username === username);
  res.json({ images: user && user.profileImages ? user.profileImages : [] });
});

// 프로필 이미지 파일 제공
router.get('/:filename', (req, res) => {
  const filepath = path.join(PROFILE_DIR, req.params.filename);
  if (!fs.existsSync(filepath)) return res.status(404).end();
  res.sendFile(filepath);
});

module.exports = router; 