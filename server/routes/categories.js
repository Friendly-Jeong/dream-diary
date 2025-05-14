const express = require('express');
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('./auth');

const router = express.Router();
const CATEGORIES_FILE = path.join(__dirname, '../data/categories.json');

function loadCategories() {
  if (!fs.existsSync(CATEGORIES_FILE)) return [];
  return JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf-8'));
}
function saveCategories(categories) {
  fs.writeFileSync(CATEGORIES_FILE, JSON.stringify(categories, null, 2));
}

// 카테고리 목록 조회
router.get('/', (req, res) => {
  const categories = loadCategories();
  res.json(categories);
});

// 카테고리 추가 (admin만)
router.post('/', authMiddleware, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: '카테고리명을 입력하세요.' });
  if (!['blue', 'red'].includes(req.user.role)) {
    return res.status(403).json({ message: 'admin만 카테고리를 추가할 수 있습니다.' });
  }
  const categories = loadCategories();
  if (categories.find(c => c.name === name)) {
    return res.status(409).json({ message: '이미 존재하는 카테고리입니다.' });
  }
  categories.push({ name });
  saveCategories(categories);
  res.json({ message: '카테고리 추가 완료', categories });
});

// 카테고리 순서 변경 (admin만)
router.put('/reorder', authMiddleware, (req, res) => {
  const { order } = req.body; // ["cat1", "cat2", ...]
  if (!Array.isArray(order)) return res.status(400).json({ message: '순서 배열이 필요합니다.' });
  if (!['blue', 'red'].includes(req.user.role)) {
    return res.status(403).json({ message: 'admin만 순서 변경 가능' });
  }
  const categories = loadCategories();
  const newCategories = order.map(name => categories.find(c => c.name === name)).filter(Boolean);
  if (newCategories.length !== categories.length) {
    return res.status(400).json({ message: '순서 배열이 잘못되었습니다.' });
  }
  saveCategories(newCategories);
  res.json({ message: '순서 변경 완료', categories: newCategories });
});

module.exports = router; 