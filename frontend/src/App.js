import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';

const CATEGORIES = ['자유', '스터디', '질문', '정보', '공고'];
const AUTO_LOGOUT_TIME = 30 * 60 * 1000;
const POSTS_PER_PAGE = 5;
const inputStyle = "w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all";

const renderMedia = (url) => {
  if (!url) return null;
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.match(/\.(jpeg|jpg|gif|png|webp)$/)) return <img src={url} alt="첨부 이미지" className="max-w-full h-auto rounded-xl shadow-sm mb-6 border border-gray-100" />;
  if (lowerUrl.match(/\.(mp4|webm|mov)$/)) return <video controls src={url} className="max-w-full h-auto rounded-xl shadow-sm mb-6 bg-black" />;
  if (lowerUrl.match(/\.(mp3|wav|ogg)$/)) return <audio controls src={url} className="w-full mb-6" />;
  return <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-bold mb-6 transition-colors">📎 첨부파일 다운로드</a>;
};

const calculateDday = (deadline) => {
  if (!deadline) return "";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dDate = new Date(deadline);
  const diffTime = dDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "마감";
  if (diffDays === 0) return "D-Day";
  return `D-${diffDays}`;
};

// ==========================================
// 🧭 [새로 추가됨] 상단 네비게이션 바 (햄버거 메뉴 포함)
// ==========================================
function Navbar({ currentUser, handleLogout, notifications, setNotifications }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);
  const location = useLocation();

  // 페이지가 이동하면 열려있던 메뉴들을 자동으로 닫아줍니다.
  useEffect(() => {
    setIsMenuOpen(false);
    setShowNotiDropdown(false);
  }, [location]);

  return (
    <nav className="fixed top-0 left-0 w-full bg-white shadow-sm z-50 border-b border-gray-200">
      <div className="max-w-3xl mx-auto px-4 h-16 flex justify-between items-center">
        {/* 로고 */}
        <Link to="/" className="font-extrabold text-xl text-blue-600 tracking-tight flex items-center gap-1">
          🎙️ <span className="hidden sm:inline">아나운서 커뮤니티</span><span className="sm:hidden">아나커뮤</span>
        </Link>

        {/* 우측 아이콘 및 햄버거 메뉴 */}
        <div className="flex items-center gap-4 text-gray-700">
          {currentUser && (
            <div className="relative">
              <button onClick={() => setShowNotiDropdown(!showNotiDropdown)} className="text-2xl relative mt-1">
                🔔
                {notifications.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">{notifications.length}</span>}
              </button>
              {showNotiDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 font-bold text-sm text-gray-700 flex justify-between"><span>알림 목록</span><button onClick={() => setNotifications([])} className="text-xs text-gray-400 hover:text-red-500">모두 지우기</button></div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? <div className="p-4 text-center text-sm text-gray-500">새로운 알림이 없습니다.</div> : notifications.map((noti, idx) => <div key={idx} className="p-3 border-b border-gray-100 text-sm hover:bg-gray-50">{noti.text}</div>)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 햄버거 버튼 */}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-2xl hover:text-blue-600 transition-colors focus:outline-none">
            {isMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* 💡 햄버거 메뉴를 누르면 스르륵 내려오는 모바일 메뉴판 */}
      {isMenuOpen && (
        <div className="absolute top-16 left-0 w-full bg-white border-b border-gray-200 shadow-lg flex flex-col p-4 gap-2 animate-fade-in-down">
          {currentUser ? (
            <>
              <div className="flex items-center gap-2 mb-4 p-2 bg-gray-50 rounded-lg">
                <span className="text-xl">👤</span>
                <span className="font-bold text-gray-800">{currentUser.nickname}님</span>
                <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-1 rounded-md">{currentUser.level}</span>
              </div>
              <Link to="/write" className="w-full py-3 bg-blue-600 text-white text-center font-bold rounded-lg shadow-sm">✍️ 새 글 작성하기</Link>
              <Link to="/mypage" className="w-full py-3 bg-gray-100 text-gray-800 text-center font-bold rounded-lg">내 정보 / 마이페이지</Link>
              <button onClick={handleLogout} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-lg mt-2">로그아웃</button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 text-center mb-2">커뮤니티의 모든 기능을 이용해보세요!</p>
              <Link to="/login" className="w-full py-3 bg-blue-600 text-white text-center font-bold rounded-lg shadow-sm">🚀 로그인 / 회원가입</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

// ==========================================
// 💬 실시간 채팅 위젯 (기존 동일)
// ==========================================
function ChatWidget({ currentUser }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const ws = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      ws.current = new WebSocket('ws://announcer-project.onrender.com/ws/chat');
      ws.current.onmessage = (event) => setMessages((prev) => [...prev, JSON.parse(event.data)]);
      return () => { if (ws.current) ws.current.close(); };
    }
  }, [isOpen]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !ws.current) return;
    const messageData = { user: currentUser ? currentUser.nickname : '익명', text: inputMessage, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    ws.current.send(JSON.stringify(messageData)); setInputMessage('');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="bg-white w-[85vw] sm:w-96 h-[500px] max-h-[70vh] rounded-2xl shadow-2xl border border-gray-200 mb-4 flex flex-col overflow-hidden">
          <div className="bg-blue-600 text-white p-4 font-bold flex justify-between items-center shadow-md z-10"><span>💬 라운지</span><button onClick={() => setIsOpen(false)} className="text-blue-200 hover:text-white">✕</button></div>
          <div className="flex-1 p-4 overflow-y-auto bg-blue-50 space-y-4">
            {messages.length === 0 ? <div className="text-center text-gray-500 text-sm mt-10">채팅방에 입장했습니다. 인사를 건네보세요! 👋</div> : messages.map((msg, idx) => {
              const isMe = currentUser && msg.user === currentUser.nickname;
              return (
                <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-xs text-gray-500 mb-1 ml-1">{msg.user}</span>
                  <div className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'}`}>{msg.text}</div>
                  <span className="text-[10px] text-gray-400 mt-1">{msg.time}</span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-200 flex gap-2">
            {!currentUser ? <input type="text" disabled placeholder="로그인 후 이용 가능" className="flex-1 bg-gray-100 border border-gray-300 rounded-lg px-3 py-2 text-sm cursor-not-allowed" /> : (
              <><input type="text" placeholder="메시지 입력..." value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 outline-none" />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm">전송</button></>
            )}
          </form>
        </div>
      )}
      <button onClick={() => setIsOpen(!isOpen)} className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl transition-transform hover:scale-110">
        {isOpen ? '✕' : '💬'}
      </button>
    </div>
  );
}

// ==========================================
// 🔑 [새로 추가됨] 로그인 전용 페이지 (LoginPage)
// ==========================================
function LoginPage({ setCurrentUser }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [nickname, setNickname] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('https://announcer-project.onrender.com//login', { username: loginId, password: loginPw });
      const userData = { username: loginId, password: loginPw, nickname: response.data.nickname, level: response.data.level };
      localStorage.setItem('announcer_user', JSON.stringify(userData));
      setCurrentUser(userData);
      alert(`${response.data.nickname}님, 환영합니다!`);
      navigate('/'); // 로그인 성공 시 메인으로 이동
    } catch (error) { alert("로그인 실패: 아이디와 비밀번호를 확인해주세요."); }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      await axios.post('https://announcer-project.onrender.com//signup', { username: loginId, nickname, password: loginPw });
      alert(`${nickname}님, 가입 완료! 이제 로그인해주세요.`);
      setNickname(''); setLoginPw(''); setIsLoginMode(true);
    } catch (error) { alert("가입 실패: 이미 존재하는 아이디입니다."); }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border border-gray-100 mt-10">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">{isLoginMode ? '다시 오셨군요! 👋' : '새 스터디원 가입 🎉'}</h2>
      <form onSubmit={isLoginMode ? handleLogin : handleSignup} className="space-y-4">
        <div><label className="block text-sm font-bold text-gray-700 mb-1">아이디</label><input type="text" value={loginId} onChange={(e) => setLoginId(e.target.value)} required className={inputStyle} /></div>
        {!isLoginMode && <div><label className="block text-sm font-bold text-gray-700 mb-1">사용할 닉네임</label><input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} required className={inputStyle} /></div>}
        <div><label className="block text-sm font-bold text-gray-700 mb-1">비밀번호</label><input type="password" value={loginPw} onChange={(e) => setLoginPw(e.target.value)} required className={inputStyle} /></div>
        <button type="submit" className={`w-full py-3.5 rounded-lg font-bold text-white text-lg transition-colors shadow-md mt-4 ${isLoginMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}>
          {isLoginMode ? '로그인' : '회원가입 완료'}
        </button>
      </form>
      <button onClick={() => setIsLoginMode(!isLoginMode)} className="w-full mt-6 text-sm text-gray-500 hover:text-blue-600 underline">
        {isLoginMode ? '아직 계정이 없으신가요? 10초만에 회원가입' : '이미 계정이 있으신가요? 로그인하러 가기'}
      </button>
    </div>
  );
}

// ==========================================
// ✍️ [새로 추가됨] 글쓰기 전용 페이지 (WritePostPage)
// ==========================================
function WritePostPage({ currentUser }) {
  const navigate = useNavigate();
  const [category, setCategory] = useState('자유');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [deadline, setDeadline] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // 비로그인 유저가 접근하면 튕겨냅니다.
  useEffect(() => { if (!currentUser) { alert("로그인이 필요한 페이지입니다."); navigate('/login'); } }, [currentUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      let uploadedFileUrl = null;
      if (file) {
        const formData = new FormData(); formData.append("file", file);
        const uploadRes = await axios.post('https://announcer-project.onrender.com//upload', formData, { headers: { "Content-Type": "multipart/form-data" } });
        uploadedFileUrl = uploadRes.data.file_url;
      }
      await axios.post('https://announcer-project.onrender.com//posts', {
        username: currentUser.username, password: currentUser.password, title, content, category, file_url: uploadedFileUrl,
        deadline: category === '공고' ? deadline : null, external_link: category === '공고' ? externalLink : null
      });
      alert("글이 등록되었습니다! (+10점)");
      navigate('/'); // 작성 완료 후 메인으로 자동 이동
    } catch (error) { alert("작성 실패"); } finally { setIsUploading(false); }
  };

  if (!currentUser) return null;

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="mb-6 text-gray-500 hover:text-gray-800 font-bold">← 뒤로 가기</button>
      <h2 className="text-2xl font-extrabold mb-6 text-gray-900">✍️ 새 게시글 작성</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">게시판 카테고리</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputStyle} bg-white font-bold`}>{CATEGORIES.map(cat => <option key={cat} value={cat}>[{cat}] 게시판</option>)}</select>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">제목</label>
          <input type="text" placeholder="제목을 입력하세요" value={title} onChange={(e) => setTitle(e.target.value)} required className={inputStyle} />
        </div>

        {category === '공고' && (
          <div className="flex flex-col sm:flex-row gap-4 bg-red-50 p-5 rounded-xl border border-red-100">
            <div className="w-full sm:w-1/3">
              <label className="block text-xs font-bold text-red-700 mb-1">마감일 (D-Day용)</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className={`${inputStyle} py-2`} required />
            </div>
            <div className="w-full sm:w-2/3">
              <label className="block text-xs font-bold text-red-700 mb-1">공식 채용 사이트 링크</label>
              <input type="url" placeholder="http://..." value={externalLink} onChange={e => setExternalLink(e.target.value)} className={`${inputStyle} py-2`} required />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">내용</label>
          <textarea placeholder="내용을 자유롭게 남겨주세요" value={content} onChange={(e) => setContent(e.target.value)} required rows="6" className={`${inputStyle} resize-none`} />
        </div>

        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <label className="block text-sm font-bold text-gray-700 mb-2">📎 첨부 파일 (선택)</label>
          <input type="file" accept="image/*, audio/*, video/*" onChange={(e) => setFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
        </div>

        <div className="pt-4">
          <button type="submit" disabled={isUploading} className={`w-full py-4 text-white text-lg font-extrabold rounded-xl shadow-md transition-all ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-1'}`}>
            {isUploading ? '업로드 중...' : '게시글 등록하기'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ==========================================
// 🏠 화면 1: Home (메인 화면)
// ==========================================
function Home({ currentUser }) {
  const [posts, setPosts] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedTab, setSelectedTab] = useState('전체');
  const [sortBy, setSortBy] = useState('latest');
  const [totalPosts, setTotalPosts] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchPosts(); fetchAnnouncements(); }, [selectedTab, currentPage, searchKeyword, sortBy]);

  const fetchPosts = async () => {
    try {
      const skip = (currentPage - 1) * POSTS_PER_PAGE;
      const response = await axios.get('https://announcer-project.onrender.com//posts', { params: { skip, limit: POSTS_PER_PAGE, category: selectedTab, search: searchKeyword, sort_by: sortBy } });
      setPosts(response.data.posts); setTotalPosts(response.data.total_count);
    } catch (error) {}
  };

  const fetchAnnouncements = async () => {
    try { const response = await axios.get('https://announcer-project.onrender.com//announcements'); setAnnouncements(response.data); } catch (error) {}
  };

  const handleGenerateScript = async () => {
    if (!currentUser) return alert("로그인이 필요합니다.");
    setIsGenerating(true);
    try {
      const response = await axios.post('https://announcer-project.onrender.com//generate-script', { username: currentUser.username, password: currentUser.password }, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', `Script_${new Date().getTime()}.docx`); document.body.appendChild(link); link.click(); link.remove(); window.URL.revokeObjectURL(url);
    } catch (error) { alert("생성 실패"); } finally { setIsGenerating(false); }
  };

  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);

  return (
    <div className="space-y-8 relative">
      {/* 🚀 D-Day 전광판 */}
      <div className="bg-gray-900 rounded-2xl p-6 shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-pulse"></div>
        <h2 className="text-xl font-extrabold text-white mb-4 flex items-center gap-2 relative z-10"><span></span> <span>공채 D-Day 전광판</span></h2>
        <div className="flex space-x-4 overflow-x-auto pb-4 relative z-10 scrollbar-hide">
          {announcements.length === 0 ? <p className="text-gray-400 text-sm">진행 중인 공채가 없습니다.</p> : announcements.map(ann => {
             const dday = calculateDday(ann.마감일);
             const isUrgent = dday === 'D-Day' || dday === '마감' || (dday.startsWith('D-') && parseInt(dday.replace('D-', '')) <= 3);
             return (
               <a href={ann.링크} target="_blank" rel="noopener noreferrer" key={ann.글번호} className="flex-shrink-0 bg-white hover:bg-gray-50 transition-colors rounded-xl p-4 w-56 sm:w-60 block shadow-md border border-gray-100">
                 <div className={`text-sm font-extrabold mb-2 inline-block px-2.5 py-1 rounded-md ${isUrgent ? 'bg-red-500 text-white' : 'bg-blue-600 text-white'}`}>{dday}</div>
                 <h3 className="text-gray-900 font-bold truncate text-sm sm:text-base">{ann.제목}</h3>
                 <p className="text-gray-500 text-xs mt-2 font-medium">마감: {ann.마감일}</p>
               </a>
             )
          })}
        </div>
      </div>

      {currentUser && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 sm:p-8 rounded-2xl shadow-sm border border-blue-100 text-center space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-blue-800">오늘의 원고 뽑기 (약 1~2분 소요)</h2>
          <button onClick={handleGenerateScript} disabled={isGenerating} className={`w-full sm:w-auto px-8 py-4 rounded-full font-bold text-white text-base sm:text-lg transition-all shadow-md ${isGenerating ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>{isGenerating ? '수집 중...' : ' 대본 다운로드'}</button>
        </div>
      )}

      {/* 💡 [핵심] 우측 하단 둥근 글쓰기 플로팅 버튼 (모바일에 최적화!) */}
      {currentUser && (
        <button
          onClick={() => navigate('/write')}
          className="fixed bottom-24 right-6 sm:bottom-6 sm:right-28 z-40 w-14 h-14 sm:w-16 sm:h-16 bg-gray-900 hover:bg-black text-white rounded-full shadow-2xl flex items-center justify-center text-3xl font-light transition-transform hover:scale-110 active:scale-95"
          title="새 글 작성"
        >
          +
        </button>
      )}

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-1 mb-2 gap-4">
          <h2 className="text-xl font-bold text-gray-800 shrink-0">{sortBy === 'popular' ? '🔥 핫 게시판' : '게시글 목록'}</h2>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
              <button onClick={() => {setSelectedTab('전체'); setCurrentPage(1);}} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${selectedTab === '전체' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>전체</button>
              {CATEGORIES.map(cat => <button key={cat} onClick={() => {setSelectedTab(cat); setCurrentPage(1);}} className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap ${selectedTab === cat ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>{cat}</button>)}
            </div>
            <div className="flex bg-gray-200 rounded-lg p-1 shrink-0 self-start sm:self-auto">
              <button onClick={() => { setSortBy('latest'); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-bold ${sortBy === 'latest' ? 'bg-white shadow text-blue-600' : 'text-gray-500'}`}>🕒 최신순</button>
              <button onClick={() => { setSortBy('popular'); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-md text-xs sm:text-sm font-bold ${sortBy === 'popular' ? 'bg-white shadow text-red-500' : 'text-gray-500'}`}>🔥 핫게시판</button>
            </div>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); setSearchKeyword(searchInput); setCurrentPage(1); }} className="flex gap-2 mb-6">
          <input type="text" placeholder="검색어를 입력하세요" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className={`${inputStyle} py-2`} />
          <button type="submit" className="px-6 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-900 whitespace-nowrap">검색</button>
        </form>

        {posts.length === 0 ? <div className="bg-white p-10 rounded-2xl text-center text-gray-500 border border-gray-100">게시글이 없습니다.</div> : (
          posts.map((post) => (
            <div key={post.글번호} className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden cursor-pointer" onClick={() => navigate(`/post/${post.글번호}`)}>
              {sortBy === 'popular' && <div className="absolute top-0 right-0 bg-red-50 text-red-500 text-[10px] font-bold px-2 py-1 rounded-bl-lg border-b border-l border-red-100">HOT🔥</div>}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] sm:text-xs font-extrabold rounded-md">{post.카테고리}</span>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate flex-1">{post.제목}</h3>
                {post.file_url && <span className="text-sm text-gray-400">📎</span>}
              </div>
              <p className="text-gray-600 text-sm truncate mb-4">{post.내용}</p>
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center text-xs text-gray-500 pt-4 border-t border-gray-50 gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-700 flex items-center gap-1">
                    <span className="text-[10px] bg-gray-200 px-1 py-0.5 rounded-sm">{post.작성자등급}</span>{post.작성자}
                  </span>
                  <span>•</span><span>{post.작성시간}</span>
                </div>
                <div className="flex items-center gap-3"><span className="font-bold text-red-500">❤️ {post.좋아요수}</span><span className="font-medium text-blue-500">💬 상세 보기</span></div>
              </div>
            </div>
          ))
        )}
        {totalPages > 0 && <div className="flex justify-center space-x-2 mt-8 pb-10">{Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`w-10 h-10 rounded-full font-bold ${currentPage === pageNum ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'}`}>{pageNum}</button>)}</div>}
      </div>
    </div>
  );
}

// ==========================================
// 📄 화면 2: PostDetail, 화면 3: MyPage (기존과 동일하게 유지)
// ==========================================
// (지면상 PostDetail과 MyPage 컴포넌트는 직전에 작성하신 코드와 100% 동일하므로 그대로 복사해 넣으시면 됩니다!
// 코드가 너무 길어져서 잘릴 수 있으니 App 컴포넌트 바로 위까지 기존 코드를 유지해 주세요.)

function PostDetail({ currentUser }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentSortBy, setCommentSortBy] = useState('latest');
  const [replyingTo, setReplyingTo] = useState(null);

  useEffect(() => { fetchPostDetail(); fetchComments(); }, [id, commentSortBy]);
  const fetchPostDetail = async () => { try { const response = await axios.get(`https://announcer-project.onrender.com//posts/${id}`); setPost(response.data); } catch (error) { navigate('/'); } };
  const fetchComments = async () => { try { const response = await axios.get(`https://announcer-project.onrender.com//posts/${id}/comments`, { params: { sort_by: commentSortBy } }); setComments(response.data); } catch (error) {} };
  const handleLikePost = async () => { if (!currentUser) return alert("로그인해주세요."); try { await axios.post(`https://announcer-project.onrender.com//posts/${id}/like?username=${currentUser.username}`); fetchPostDetail(); } catch (error) {} };
  const handleLikeComment = async (commentId) => { if (!currentUser) return alert("로그인해주세요."); try { await axios.post(`https://announcer-project.onrender.com//comments/${commentId}/like?username=${currentUser.username}`); fetchComments(); } catch (error) {} };

  const handleAddComment = async () => {
    if (!currentUser) return alert("로그인이 필요합니다.");
    if (!newComment.trim()) return alert("내용을 입력하세요.");
    try { await axios.post('https://announcer-project.onrender.com//comments', { username: currentUser.username, password: currentUser.password, post_id: id, content: newComment, parent_id: replyingTo }); setNewComment(''); setReplyingTo(null); fetchComments(); } catch (error) { alert("댓글 작성 실패"); }
  };
  const handleDeletePost = async () => { if (!window.confirm("삭제하시겠습니까?")) return; try { await axios.delete(`https://announcer-project.onrender.com//posts/${id}?username=${currentUser.username}`); alert("삭제됨"); navigate('/'); } catch (error) {} };
  const handleDeleteComment = async (commentId) => { if (!window.confirm("삭제하시겠습니까?")) return; try { await axios.delete(`https://announcer-project.onrender.com//comments/${commentId}?username=${currentUser.username}`); fetchComments(); } catch (error) {} };

  if (!post) return <div className="text-center py-20 font-bold text-gray-500">로딩 중...</div>;
  const isPostLiked = currentUser && post.좋아요누른사람들.includes(currentUser.nickname);
  const parentComments = comments.filter(c => c.부모댓글번호 === null);
  const childComments = comments.filter(c => c.부모댓글번호 !== null);

  return (
    <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-100 mb-20 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="mb-6 text-gray-500 hover:text-gray-800 font-bold">← 뒤로 가기</button>
      <div className="border-b border-gray-200 pb-6 mb-6">
        <div className="flex justify-between items-start mb-4 gap-2">
          <div><span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] sm:text-xs font-extrabold rounded-md mb-3 inline-block">{post.카테고리}</span><h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 break-keep">{post.제목}</h1></div>
          {currentUser && currentUser.nickname === post.작성자 && <button onClick={handleDeletePost} className="text-red-500 bg-red-50 px-3 py-1 rounded font-bold text-xs shrink-0 mt-1">삭제</button>}
        </div>

        {post.카테고리 === '공고' && post.deadline && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left"><p className="text-xs text-red-500 font-bold mb-1">지원 마감일</p><p className="text-xl font-extrabold text-red-700">{post.deadline}</p></div>
            <a href={post.external_link} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto text-center bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-sm">공식 사이트 지원하기 →</a>
          </div>
        )}

        <div className="flex items-center gap-2 mb-8 text-xs sm:text-sm text-gray-500">
          <span className="font-bold text-gray-800 flex items-center gap-1"><span className="text-[10px] bg-gray-200 px-1 py-0.5 rounded-sm">{post.작성자등급}</span>{post.작성자}</span><span>|</span><span>{post.작성시간}</span>
        </div>

        {post.file_url && renderMedia(post.file_url)}
        <div className="text-base sm:text-lg text-gray-800 whitespace-pre-wrap min-h-[100px] leading-relaxed break-keep">{post.내용}</div>
        <div className="mt-10 flex justify-center">
          <button onClick={handleLikePost} className={`flex flex-col items-center p-3 sm:p-4 rounded-xl border-2 transition-all hover:scale-105 ${isPostLiked ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white hover:border-red-300'}`}>
            <span className="text-2xl sm:text-3xl mb-1">{isPostLiked ? '❤️' : '🤍'}</span><span className={`text-sm sm:text-base font-bold ${isPostLiked ? 'text-red-600' : 'text-gray-500'}`}>좋아요 {post.좋아요수}</span>
          </button>
        </div>
      </div>

      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800">댓글 {comments.length}개</h3>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setCommentSortBy('latest')} className={`px-3 py-1.5 rounded-md text-xs font-bold ${commentSortBy === 'latest' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>과거순</button>
            <button onClick={() => setCommentSortBy('popular')} className={`px-3 py-1.5 rounded-md text-xs font-bold ${commentSortBy === 'popular' ? 'bg-white shadow text-red-500' : 'text-gray-500'}`}>인기순🔥</button>
          </div>
        </div>

        <div className="space-y-4 mb-24 sm:mb-8">
          {parentComments.map(parent => {
            const isParentLiked = currentUser && parent.좋아요누른사람들.includes(currentUser.nickname);
            const replies = childComments.filter(child => child.부모댓글번호 === parent.댓글번호);
            return (
              <div key={parent.댓글번호} className="space-y-2">
                <div className="p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex justify-between mb-2">
                    <div className="flex items-center gap-2"><span className="font-bold text-sm text-gray-800 flex items-center gap-1"><span className="text-[10px] bg-gray-200 px-1 py-0.5 rounded-sm">{parent.작성자등급}</span>{parent.작성자}</span><span className="text-[10px] text-gray-400">{parent.작성시간}</span></div>
                    {currentUser && currentUser.nickname === parent.작성자 && <button onClick={() => handleDeleteComment(parent.댓글번호)} className="text-[10px] text-red-400 hover:text-red-600 font-bold">삭제</button>}
                  </div>
                  <p className="text-gray-800 mb-3 text-sm sm:text-base break-keep">{parent.내용}</p>
                  <div className="flex gap-4 items-center">
                    <button onClick={() => handleLikeComment(parent.댓글번호)} className={`flex items-center gap-1 text-xs sm:text-sm font-bold ${isParentLiked ? 'text-red-500' : 'text-gray-500'}`}><span>{isParentLiked ? '❤️' : '🤍'}</span><span>{parent.좋아요수}</span></button>
                    {currentUser && <button onClick={() => setReplyingTo(replyingTo === parent.댓글번호 ? null : parent.댓글번호)} className="text-[10px] sm:text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded">{replyingTo === parent.댓글번호 ? '답글 취소' : '답글 달기'}</button>}
                  </div>
                </div>
                {replies.length > 0 && (
                  <div className="ml-4 sm:ml-8 space-y-2 border-l-2 border-blue-200 pl-3 sm:pl-4">
                    {replies.map(reply => {
                      const isReplyLiked = currentUser && reply.좋아요누른사람들.includes(currentUser.nickname);
                      return (
                        <div key={reply.댓글번호} className="p-2 sm:p-3 bg-white rounded-lg border border-gray-200 shadow-sm relative">
                          <span className="absolute -left-[16px] sm:-left-[20px] top-3 sm:top-4 text-blue-200 text-sm sm:text-base">↳</span>
                          <div className="flex justify-between mb-1"><div className="flex items-center gap-2"><span className="font-bold text-xs text-gray-800 flex items-center gap-1"><span className="text-[8px] sm:text-[10px] bg-gray-200 px-1 py-0.5 rounded-sm">{reply.작성자등급}</span>{reply.작성자}</span><span className="text-[10px] text-gray-400">{reply.작성시간}</span></div>{currentUser && currentUser.nickname === reply.작성자 && <button onClick={() => handleDeleteComment(reply.댓글번호)} className="text-[10px] text-red-400 hover:text-red-600">삭제</button>}</div>
                          <p className="text-gray-700 text-xs sm:text-sm mb-2 break-keep">{reply.내용}</p>
                          <button onClick={() => handleLikeComment(reply.댓글번호)} className={`flex items-center gap-1 text-[10px] sm:text-xs font-bold ${isReplyLiked ? 'text-red-500' : 'text-gray-400'}`}><span>{isReplyLiked ? '❤️' : '🤍'}</span><span>{reply.좋아요수}</span></button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {currentUser && (
          <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-3 sm:p-4 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-40">
            <div className="max-w-2xl mx-auto flex flex-col gap-2">
              {replyingTo && <div className="flex justify-between items-center text-[10px] sm:text-xs text-blue-600 font-bold bg-blue-50 p-2 rounded-md"><span>↳ 선택한 댓글에 답글 작성 중</span><button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600">✕ 취소</button></div>}
              <div className="flex gap-2">
                <input type="text" placeholder={replyingTo ? "답글 입력..." : "댓글을 남겨보세요..."} value={newComment} onChange={(e) => setNewComment(e.target.value)} className={`${inputStyle} py-2 sm:py-3 text-sm`} />
                <button onClick={handleAddComment} className="px-4 sm:px-8 bg-gray-800 hover:bg-gray-900 text-white text-sm font-bold rounded-lg whitespace-nowrap transition-colors">등록</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MyPage({ currentUser, setCurrentUser }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [activity, setActivity] = useState({ my_posts: [], my_comments: [], liked_posts: [], points: 0, level: '🌱 씨앗' });
  const [newNickname, setNewNickname] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (!currentUser) { alert("로그인이 필요합니다."); navigate('/'); return; }
    const fetchActivity = async () => { try { const response = await axios.get(`https://announcer-project.onrender.com//users/${currentUser.username}/activity`); setActivity(response.data); } catch (error) {} };
    fetchActivity();
  }, [currentUser, navigate]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!newNickname && !newPassword) return alert("변경할 내용을 입력해주세요.");
    try {
      const response = await axios.put(`https://announcer-project.onrender.com//users/${currentUser.username}`, { new_nickname: newNickname, new_password: newPassword });
      alert("정보 수정 완료!");
      const updatedUser = { ...currentUser, nickname: response.data.new_nickname };
      if (newPassword) updatedUser.password = newPassword;
      localStorage.setItem('announcer_user', JSON.stringify(updatedUser)); setCurrentUser(updatedUser);
      setNewNickname(''); setNewPassword('');
    } catch (error) { alert("수정 실패."); }
  };

  if (!currentUser) return null;

  return (
    <div className="bg-white p-5 sm:p-8 rounded-2xl shadow-sm border border-gray-100 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6 border-b border-gray-200 pb-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">👤 마이페이지</h2>
        <button onClick={() => navigate('/')} className="text-sm text-gray-500 font-bold hover:text-blue-600">메인으로 가기</button>
      </div>
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 sm:p-6 text-white mb-8 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <div><p className="text-blue-100 text-xs sm:text-sm mb-1">나의 커뮤니티 등급</p><h3 className="text-2xl sm:text-3xl font-extrabold">{activity.level}</h3></div>
          <div className="text-right"><p className="text-blue-100 text-xs sm:text-sm mb-1">현재 포인트</p><h3 className="text-2xl sm:text-3xl font-bold">{activity.points} <span className="text-sm sm:text-lg">P</span></h3></div>
        </div>
      </div>
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <button onClick={() => setActiveTab('profile')} className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'profile' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>내 정보 수정</button>
        <button onClick={() => setActiveTab('posts')} className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'posts' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>내가 쓴 글 ({activity.my_posts.length})</button>
        <button onClick={() => setActiveTab('comments')} className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${activeTab === 'comments' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}>작성한 댓글 ({activity.my_comments.length})</button>
      </div>
      <div className="min-h-[300px]">
        {activeTab === 'profile' && (
          <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500 mb-6">현재 닉네임: <strong className="text-blue-600">{currentUser.nickname}</strong></p>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div><label className="block text-xs font-bold text-gray-700 mb-1">새로운 닉네임</label><input type="text" value={newNickname} onChange={(e) => setNewNickname(e.target.value)} className={`${inputStyle} py-2`} /></div>
              <div><label className="block text-xs font-bold text-gray-700 mb-1">새로운 비밀번호</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={`${inputStyle} py-2`} /></div>
              <button type="submit" className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-sm">정보 수정하기</button>
            </form>
          </div>
        )}
        {activeTab === 'posts' && <div className="space-y-3">{activity.my_posts.map(post => <Link to={`/post/${post.글번호}`} key={post.글번호} className="block p-4 bg-gray-50 hover:bg-indigo-50 rounded-lg border border-gray-200"><div className="flex justify-between items-center"><h4 className="font-bold text-sm text-gray-800 truncate">{post.제목}</h4><span className="text-[10px] text-gray-500 shrink-0 ml-2">{post.작성시간}</span></div></Link>)}</div>}
        {activeTab === 'comments' && <div className="space-y-3">{activity.my_comments.map(comment => <Link to={`/post/${comment.원문번호}`} key={comment.댓글번호} className="block p-4 bg-gray-50 hover:bg-indigo-50 rounded-lg border border-gray-200"><div className="flex justify-between items-center"><p className="text-sm text-gray-800 truncate pr-4">{comment.내용}</p><span className="text-[10px] text-gray-500 whitespace-nowrap">{comment.작성시간}</span></div></Link>)}</div>}
      </div>
    </div>
  );
}

// ==========================================
// 🔌 메인 컴포넌트 (Router & 레이아웃 합체)
// ==========================================
function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('announcer_user');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  // 글로벌 웹소켓 알림 수신기
  useEffect(() => {
    let wsNotify;
    if (currentUser) {
      wsNotify = new WebSocket(`ws://announcer-project.onrender.com/ws/notify/${currentUser.username}`);
      wsNotify.onmessage = (event) => {
        const data = JSON.parse(event.data);
        setNotifications((prev) => [data, ...prev]);
        // 간단한 네이티브 브라우저 알림 (모바일에서 효과적)
        if (Notification.permission === 'granted') {
          new Notification('새로운 알림', { body: data.text });
        }
      };
      // 알림 권한 요청 (처음 1회)
      if (Notification.permission !== 'denied') Notification.requestPermission();
    }
    return () => { if (wsNotify) wsNotify.close(); };
  }, [currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('announcer_user');
    setCurrentUser(null);
    alert("로그아웃 되었습니다.");
    window.location.href = '/';
  };

  return (
    <BrowserRouter>
      {/* 💡 상단 고정 네비게이션 바 */}
      <Navbar
        currentUser={currentUser}
        handleLogout={handleLogout}
        notifications={notifications}
        setNotifications={setNotifications}
      />

      <ChatWidget currentUser={currentUser} />

      {/* 💡 상단 Navbar(높이 64px) 때문에 콘텐츠가 가려지지 않도록 pt-24 (패딩 탑) 추가 */}
      <div className="min-h-screen bg-gray-50 pt-24 pb-10 px-4 font-sans text-gray-800">
        <div className="max-w-3xl mx-auto">
          <Routes>
            <Route path="/" element={<Home currentUser={currentUser} />} />
            {/* 💡 로그인과 글쓰기를 별도 페이지로 분리! */}
            <Route path="/login" element={<LoginPage setCurrentUser={setCurrentUser} />} />
            <Route path="/write" element={<WritePostPage currentUser={currentUser} />} />
            <Route path="/post/:id" element={<PostDetail currentUser={currentUser} />} />
            <Route path="/mypage" element={<MyPage currentUser={currentUser} setCurrentUser={setCurrentUser} />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;