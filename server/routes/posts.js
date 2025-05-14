const express = require('express');
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('./auth');

const router = express.Router();
const POSTS_FILE = path.join(__dirname, '../data/posts.json');

function loadPosts() {
  if (!fs.existsSync(POSTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(POSTS_FILE, 'utf-8'));
}
function savePosts(posts) {
  fs.writeFileSync(POSTS_FILE, JSON.stringify(posts, null, 2));
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
  const { title, content, isPublic } = req.body;
  if (!title || !content) return res.status(400).json({ message: '제목과 내용을 입력하세요.' });
  const posts = loadPosts();
  const newPost = {
    id: Date.now().toString(),
    title,
    content,
    isPublic: !!isPublic,
    author: req.user.username,
    createdAt: new Date().toISOString()
  };
  posts.push(newPost);
  savePosts(posts);
  res.json(newPost);
});

// 글 상세
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
  res.json({ message: '삭제 완료' });
});

module.exports = router; 