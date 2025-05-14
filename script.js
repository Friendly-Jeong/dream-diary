// 로그인 관련 상수
const LOGIN_KEY = 'dream_blog_login';
const VALID_TOKEN = 'dream123';
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
  return localStorage.getItem(LOGIN_KEY) === '1';
}
function setLogin(val) {
  if (val) localStorage.setItem(LOGIN_KEY, '1');
  else localStorage.removeItem(LOGIN_KEY);
}

function showUserName() {
  if (userNameSpan) {
    const name = localStorage.getItem(NAME_KEY) || '';
    userNameSpan.textContent = name ? `${name} 님의 꿈 일기장` : '';
  }
}

// 로그인 폼 이벤트
if (loginForm) {
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const name = loginName.value.trim();
    if (!name) {
      loginError.textContent = '이름을 입력하세요.';
      return;
    }
    if (loginPw.value === VALID_TOKEN) {
      setLogin(true);
      localStorage.setItem(NAME_KEY, name);
      showBlog();
      loginError.textContent = '';
      renderPosts();
      showUserName();
    } else {
      loginError.textContent = '토큰이 올바르지 않습니다.';
    }
  });
}
if (logoutBtn) {
  logoutBtn.addEventListener('click', function() {
    setLogin(false);
    showLogin();
    loginPw.value = '';
    loginName.value = '';
    loginError.textContent = '';
    localStorage.removeItem(NAME_KEY);
    if (userNameSpan) userNameSpan.textContent = '';
  });
}

// 페이지 로드 시 로그인 상태 확인
if (isLoggedIn()) {
  showBlog();
  renderPosts();
  showUserName();
} else {
  showLogin();
}

// 블로그 글 localStorage 키
const STORAGE_KEY = 'dente_blog_posts';

// DOM 요소 참조
const postList = document.getElementById('post-list');
const writeForm = document.getElementById('write-form');
const categorySelect = document.getElementById('category-select');
const contentInput = document.getElementById('content-input');

// 저장된 글 불러오기
function loadPosts() {
  const posts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  return posts;
}

// 글 목록 렌더링
function renderPosts() {
  const posts = loadPosts();
  postList.innerHTML = '';
  posts.forEach(post => {
    const li = document.createElement('li');
    li.className = 'post-item';
    li.innerHTML = `
      <span class="post-category">${post.category}</span>
      <span class="post-content">${escapeHTML(post.content)}</span>
    `;
    postList.appendChild(li);
  });
  if (posts.length === 0) {
    postList.innerHTML = '<li style="text-align:center; color:#aaa;">아직 작성된 꿈 일기가 없습니다.</li>';
  }
}

// HTML 이스케이프 (XSS 방지)
function escapeHTML(str) {
  return str.replace(/[&<>"']/g, function(m) {
    return ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m];
  });
}

// 글쓰기 폼 제출 이벤트
writeForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const category = categorySelect.value;
  const content = contentInput.value.trim();
  if (!category || !content) return;

  const posts = loadPosts();
  posts.push({ category, content });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  renderPosts();

  // 입력값 초기화
  categorySelect.selectedIndex = 0;
  contentInput.value = '';
});

// 카테고리 클릭 시 필터링
document.querySelectorAll('.category-list li').forEach(li => {
  li.addEventListener('click', function() {
    const selected = this.getAttribute('data-category');
    if (selected === '전체') {
      renderPosts();
      return;
    }
    const posts = loadPosts();
    postList.innerHTML = '';
    posts.filter(post => post.category === selected).forEach(post => {
      const li = document.createElement('li');
      li.className = 'post-item';
      li.innerHTML = `
        <span class="post-category">${post.category}</span>
        <span class="post-content">${escapeHTML(post.content)}</span>
      `;
      postList.appendChild(li);
    });
    if (postList.children.length === 0) {
      postList.innerHTML = '<li style="text-align:center; color:#aaa;">해당 카테고리의 꿈 일기가 없습니다.</li>';
    }
  });
});

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

// 페이지 로드 시 로그인 상태 확인
if (isLoggedIn()) {
  showBlog();
  renderPosts();
  showUserName();
} else {
  showLogin();
} 