const express = require('express');
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('./auth');

const router = express.Router();
const POSTS_FILE = path.join(__dirname, '../data/posts.json');
const TRASH_FILE = path.join(__dirname, '../data/trash.json');

// 글 데이터 구조: id, title, content, isPublic, category, author, createdAt, updatedAt
// 삭제 시 trash.json(휴지통)에 영구보관

function loadPosts() {
  if (!fs.existsSync(POSTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(POSTS_FILE, 'utf-8'));
}
function savePosts(posts) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
}

function loadTrash() {
  if (!fs.existsSync(TRASH_FILE)) return [];
  return JSON.parse(fs.readFileSync(TRASH_FILE, 'utf-8'));
}
function saveTrash(trash) {
  fs.writeFileSync(TRASH_FILE, JSON.stringify(trash, null, 2));
}

// 글 목록 (공개글 + 내 비공개글)
router.get('/', authMiddleware, (req, res) => {
  const posts = loadPosts();
  const username = req.user.username;
  const result = posts.filter(p => p.isPublic || p.author === username);
  res.json(result.reverse()); // 최신글이 위로
});

// 글 작성
router.post('/', authMiddleware, (req, res) => {
  const { title, content, isPublic, category } = req.body;
  if (!title || !content) return res.status(400).json({ message: '제목과 내용을 입력하세요.' });
  const posts = loadPosts();
  const newPost = {
    id: Date.now().toString(),
    title,
    content,
    isPublic: !!isPublic,
    category: category || null,
    author: req.user.username,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  posts.push(newPost);
  savePosts(posts);
  res.json(newPost);
});

// 글 상세 (비공개 글은 작성자만 열람, admin도 불가)
router.get('/:id', authMiddleware, (req, res) => {
  const posts = loadPosts();
  const post = posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ message: '글을 찾을 수 없습니다.' });
  if (!post.isPublic && post.author !== req.user.username) {
    return res.status(403).json({ message: '비공개 글은 작성자만 볼 수 있습니다.' });
  }
  res.json(post);
});

// 글 수정
router.put('/:id', authMiddleware, (req, res) => {
  const posts = loadPosts();
  const post = posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ message: '글을 찾을 수 없습니다.' });
  if (post.author !== req.user.username) {
    return res.status(403).json({ message: '본인 글만 수정할 수 있습니다.' });
  }
  post.title = req.body.title || post.title;
  post.content = req.body.content || post.content;
  post.isPublic = req.body.isPublic !== undefined ? !!req.body.isPublic : post.isPublic;
  post.category = req.body.category !== undefined ? req.body.category : post.category;
  post.updatedAt = new Date().toISOString();
  savePosts(posts);
  res.json(post);
});

// 글 삭제
router.delete('/:id', authMiddleware, (req, res) => {
  let posts = loadPosts();
  const post = posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ message: '글을 찾을 수 없습니다.' });
  if (post.author !== req.user.username) {
    return res.status(403).json({ message: '본인 글만 삭제할 수 있습니다.' });
  }
  posts = posts.filter(p => p.id !== req.params.id);
  savePosts(posts);
  // 휴지통에 영구보관
  const trash = loadTrash();
  trash.push(post);
  saveTrash(trash);
  res.json({ message: '삭제 완료(휴지통으로 이동)' });
});

// 카테고리별 글 목록
router.get('/category/:category', authMiddleware, (req, res) => {
  const posts = loadPosts();
  const username = req.user.username;
  const category = req.params.category;
  const result = posts.filter(p => (p.category === category) && (p.isPublic || p.author === username));
  res.json(result.reverse());
});

// 휴지통(삭제된 글) 목록
router.get('/trash/list', authMiddleware, (req, res) => {
  const trash = loadTrash();
  const username = req.user.username;
  const result = trash.filter(p => p.author === username);
  res.json(result.reverse());
});

// 휴지통(삭제된 글) 복원
router.post('/trash/restore/:id', authMiddleware, (req, res) => {
  let trash = loadTrash();
  let posts = loadPosts();
  const username = req.user.username;
  const idx = trash.findIndex(p => p.id === req.params.id && p.author === username);
  if (idx === -1) return res.status(404).json({ message: '복원할 글을 찾을 수 없습니다.' });
  const post = trash[idx];
  posts.push(post);
  savePosts(posts);
  trash.splice(idx, 1);
  saveTrash(trash);
  res.json({ message: '복원 완료', post });
});

// 휴지통(삭제된 글) 완전 삭제
router.delete('/trash/delete/:id', authMiddleware, (req, res) => {
  let trash = loadTrash();
  const username = req.user.username;
  const idx = trash.findIndex(p => p.id === req.params.id && p.author === username);
  if (idx === -1) return res.status(404).json({ message: '삭제할 글을 찾을 수 없습니다.' });
  trash.splice(idx, 1);
  saveTrash(trash);
  res.json({ message: '완전 삭제 완료' });
});

module.exports = router; 