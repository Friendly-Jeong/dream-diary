const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const USERS_FILE = path.join(__dirname, '../data/users.json');
const JWT_SECRET = 'dream-diary-secret-key';

// 유저 데이터 로드/저장
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// 회원가입
router.post('/register', (req, res) => {
  const { username, password, nickname } = req.body;
  if (!username || !password) return res.status(400).json({ message: '이름과 비밀번호(토큰)를 입력하세요.' });
  if (typeof username !== 'string' || typeof password !== 'string') return res.status(400).json({ message: '입력값 형식 오류' });
  if (username.length < 3 || username.length > 20) return res.status(400).json({ message: '아이디는 3~20자여야 합니다.' });
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ message: '아이디는 영문, 숫자, 언더스코어만 허용' });
  if (password.length < 4 || password.length > 32) return res.status(400).json({ message: '비밀번호는 4~32자여야 합니다.' });
  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ message: '이미 존재하는 사용자입니다.' });
  }
  let role = 'user';
  if ((username === 'blue' || username === 'red')) {
    // blue, red는 최초 1회만 admin 권한
    if (!users.find(u => u.username === username)) {
      role = username;
    }
  }
  const hashed = bcrypt.hashSync(password, 8);
  const user = {
    id: uuidv4(),
    username,
    nickname: nickname || username,
    passwordHash: hashed,
    profileImages: [],
    role
  };
  users.push(user);
  saveUsers(users);
  res.json({ message: '회원가입 성공' });
});

// 로그인
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: '이름과 비밀번호(토큰)를 입력하세요.' });
  if (typeof username !== 'string' || typeof password !== 'string') return res.status(400).json({ message: '입력값 형식 오류' });
  const users = loadUsers();
  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).json({ message: '사용자를 찾을 수 없습니다.' });
  if (!bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ message: '비밀번호(토큰)가 일치하지 않습니다.' });
  }
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ token, username: user.username, nickname: user.nickname, role: user.role });
});

// JWT 인증 미들웨어
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ message: '인증 필요' });
  const token = auth.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ message: '토큰이 유효하지 않습니다.' });
  }
}

module.exports = router;
module.exports.authMiddleware = authMiddleware; 