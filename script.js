// 서버 API 연동 기반 JS (JWT, fetch)
const LOGIN_KEY = 'dream_blog_login';
const TOKEN_KEY = 'dream_blog_token';
const NAME_KEY = 'dream_blog_name';
const THEME_KEY = 'dream_blog_theme';

const loginContainer = document.getElementById('login-container');
const blogContainer = document.getElementById('blog-container');
const loginForm = document.getElementById('login-form');
const loginPw = document.getElementById('login-pw');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const userNameSpan = document.getElementById('user-name');
const loginName = document.getElementById('login-name');
const themeToggleBtn = document.getElementById('theme-toggle-btn');

let isDark = false;
let snowInterval = null;
let starInterval = null;

function showBlog() {
  loginContainer.style.display = 'none';
  blogContainer.style.display = '';
}
function showLogin() {
  blogContainer.style.display = 'none';
  loginContainer.style.display = '';
}
function isLoggedIn() {
  return !!localStorage.getItem(TOKEN_KEY);
}
function setLogin(token, name) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(LOGIN_KEY, '1');
    if (name) localStorage.setItem(NAME_KEY, name);
  } else {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LOGIN_KEY);
    localStorage.removeItem(NAME_KEY);
  }
}
function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}
function showUserName() {
  if (userNameSpan) {
    const name = localStorage.getItem(NAME_KEY) || '';
    userNameSpan.textContent = name ? `${name} 님의 꿈 일기장` : '';
  }
}

// 로그인 폼 이벤트 (서버 연동)
if (loginForm) {
  loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = loginName.value.trim();
    const password = loginPw.value;
    if (!username || !password) {
      loginError.textContent = '이름과 비밀번호(토큰)를 입력하세요.';
      return;
    }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        loginError.textContent = data.message || '로그인 실패';
        return;
      }
      setLogin(data.token, data.nickname || data.username);
      showBlog();
      loginError.textContent = '';
      await loadAndRenderAll();
      showUserName();
    } catch (err) {
      loginError.textContent = '서버 오류';
    }
  });
}
if (logoutBtn) {
  logoutBtn.addEventListener('click', function() {
    setLogin(null);
    showLogin();
    loginPw.value = '';
    loginName.value = '';
    loginError.textContent = '';
    if (userNameSpan) userNameSpan.textContent = '';
  });
}

// 페이지 로드 시 로그인 상태 확인
if (isLoggedIn()) {
  showBlog();
  loadAndRenderAll();
  showUserName();
} else {
  showLogin();
}

// 글/카테고리/댓글 관련 DOM
const postList = document.getElementById('post-list');
const writeForm = document.getElementById('write-form');
const categorySelect = document.getElementById('category-select');
const contentInput = document.getElementById('content-input');

// 서버에서 카테고리 목록 불러오기
async function loadCategories() {
  const res = await fetch('/api/categories');
  if (!res.ok) return [];
  return await res.json();
}
// 카테고리 select, nav 렌더링
async function renderCategories() {
  const categories = await loadCategories();
  // select
  if (categorySelect) {
    categorySelect.innerHTML = '<option value="" disabled selected>카테고리 선택</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.name;
      opt.textContent = cat.name;
      categorySelect.appendChild(opt);
    });
  }
  // nav
  const navList = document.querySelector('.category-list');
  if (navList) {
    navList.innerHTML = '';
    const allLi = document.createElement('li');
    allLi.textContent = '전체';
    allLi.setAttribute('data-category', '전체');
    navList.appendChild(allLi);
    categories.forEach(cat => {
      const li = document.createElement('li');
      li.textContent = cat.name;
      li.setAttribute('data-category', cat.name);
      navList.appendChild(li);
    });
    // 카테고리 클릭 이벤트
    navList.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', function() {
        const selected = this.getAttribute('data-category');
        renderPosts(selected === '전체' ? null : selected);
      });
    });
  }
}

// 서버에서 글 목록 불러오기
async function loadPosts(category = null) {
  let url = '/api/posts';
  if (category) url = `/api/posts/category/${encodeURIComponent(category)}`;
  const res = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + getToken() }
  });
  if (!res.ok) return [];
  return await res.json();
}
// 글 목록 렌더링
async function renderPosts(category = null) {
  const posts = await loadPosts(category);
  postList.innerHTML = '';
  posts.forEach(post => {
    const li = document.createElement('li');
    li.className = 'post-item';
    li.innerHTML = `
      <span class="post-category">${post.category || ''}</span>
      <span class="post-content">${escapeHTML(post.content)}</span>
    `;
    postList.appendChild(li);
  });
  if (posts.length === 0) {
    postList.innerHTML = '<li style="text-align:center; color:#aaa;">아직 작성된 꿈 일기가 없습니다.</li>';
  }
}

// 글쓰기 폼 제출 이벤트 (서버 연동)
if (writeForm) {
  writeForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    const category = categorySelect.value;
    const content = contentInput.value.trim();
    if (!category || !content) return;
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + getToken()
        },
        body: JSON.stringify({ title: '', content, isPublic: true, category })
      });
      if (!res.ok) {
        alert('글 작성 실패');
        return;
      }
      await renderPosts();
      categorySelect.selectedIndex = 0;
      contentInput.value = '';
    } catch (err) {
      alert('서버 오류');
    }
  });
}

// HTML 이스케이프 (XSS 방지)
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, function(m) {
    return ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m];
  });
}

// 전체 데이터 로드 및 렌더링
async function loadAndRenderAll() {
  await renderCategories();
  await renderPosts();
}

// ❄ 눈 내리는 애니메이션
const snowContainer = document.getElementById('snow-container');

// 별/눈 파티클 관리 (이모지 대신 흰색 원형)
function createParticle() {
  let el;
  if (isDark) {
    // 밤: ❄, ★ 랜덤
    el = document.createElement('span');
    if (Math.random() < 0.5) {
      el.className = 'snowflake';
      el.textContent = '❄';
    } else {
      el.className = 'star';
      el.textContent = '★';
    }
  } else {
    // 라이트: ❄만
    el = document.createElement('span');
    el.className = 'snowflake';
    el.textContent = '❄';
  }
  const size = isDark ? (Math.random() * 14 + 18) : (Math.random() * 10 + 16);
  el.style.fontSize = size + 'px';
  el.style.left = Math.random() * 100 + 'vw';
  el.style.opacity = Math.random() * 0.4 + 0.6;
  el.style.animationDuration = (isDark ? (Math.random() * 2 + 4) : (Math.random() * 2 + 3)) + 's';
  el.style.top = '-40px';
  snowContainer.appendChild(el);
  // 바닥에 닿으면 페이드아웃
  setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => { el.remove(); }, 1200);
  }, (parseFloat(el.style.animationDuration) * 1000) - 1200);
}
function startParticleAnimation() {
  if (snowInterval) clearInterval(snowInterval);
  snowInterval = setInterval(createParticle, isDark ? 420 : 350);
}
function stopParticleAnimation() {
  if (snowInterval) clearInterval(snowInterval);
  snowInterval = null;
}

// setTheme에서 파티클 애니메이션만 관리
function setTheme(dark) {
  isDark = dark;
  if (dark) {
    document.body.classList.add('dark-mode');
    themeToggleBtn.textContent = '☀️';
    localStorage.setItem(THEME_KEY, 'dark');
    startParticleAnimation();
  } else {
    document.body.classList.remove('dark-mode');
    themeToggleBtn.textContent = '🌙';
    localStorage.setItem(THEME_KEY, 'light');
    startParticleAnimation();
  }
}
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', function() {
    setTheme(!isDark);
  });
}
function loadTheme() {
  const t = localStorage.getItem(THEME_KEY);
  setTheme(t === 'dark');
}

// 페이지 로드 시 테마 적용
loadTheme(); 