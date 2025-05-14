const express = require('express');
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('./auth');

const router = express.Router();
const COMMENTS_FILE = path.join(__dirname, '../data/comments.json');

function loadComments() {
  if (!fs.existsSync(COMMENTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf-8'));
}
function saveComments(comments) {
  fs.writeFileSync(COMMENTS_FILE, JSON.stringify(comments, null, 2));
}

// 댓글 작성
router.post('/:postId', authMiddleware, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ message: '내용을 입력하세요.' });
  const comments = loadComments();
  const newComment = {
    id: Date.now().toString(),
    postId: req.params.postId,
    author: req.user.username,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  comments.push(newComment);
  saveComments(comments);
  res.json(newComment);
});

// 댓글 목록 (특정 글)
router.get('/:postId', (req, res) => {
  const comments = loadComments();
  const result = comments.filter(c => c.postId === req.params.postId);
  res.json(result);
});

// 댓글 수정
router.put('/:commentId', authMiddleware, (req, res) => {
  const comments = loadComments();
  const comment = comments.find(c => c.id === req.params.commentId);
  if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
  if (comment.author !== req.user.username) {
    return res.status(403).json({ message: '본인 댓글만 수정할 수 있습니다.' });
  }
  comment.content = req.body.content || comment.content;
  comment.updatedAt = new Date().toISOString();
  saveComments(comments);
  res.json(comment);
});

// 댓글 삭제(완전 삭제)
router.delete('/:commentId', authMiddleware, (req, res) => {
  let comments = loadComments();
  const comment = comments.find(c => c.id === req.params.commentId);
  if (!comment) return res.status(404).json({ message: '댓글을 찾을 수 없습니다.' });
  if (comment.author !== req.user.username) {
    return res.status(403).json({ message: '본인 댓글만 삭제할 수 있습니다.' });
  }
  comments = comments.filter(c => c.id !== req.params.commentId);
  saveComments(comments);
  res.json({ message: '댓글 완전 삭제 완료' });
});

module.exports = router; 