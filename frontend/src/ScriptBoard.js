import React, { useState, useEffect } from 'react';
import axios from 'axios';

// 💡 수정됨: 올바른 Render 백엔드 주소로 변경
const API_URL = "https://announcer-project.onrender.com";

function ScriptBoard() {
  const [scripts, setScripts] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  
  // 'announcer_user' 보관함에서 정확하게 아이디를 꺼내옵니다.
  const savedUser = localStorage.getItem('announcer_user');
  const currentUser = savedUser ? JSON.parse(savedUser) : null;
  const currentUsername = currentUser ? currentUser.username : null;
  
  // 💡 수정됨: 백엔드 main.py의 아이디와 동일하게 "sabrinaia"로 변경
  const isAdmin = currentUsername === "sabrinaia";

  // 화면이 켜지면 대본 목록을 서버에서 불러옵니다.
  useEffect(() => {
    fetchScripts();
  }, []);

  const fetchScripts = async () => {
    try {
      const response = await axios.get(`${API_URL}/scripts`);
      setScripts(response.data);
    } catch (error) {
      console.error("대본을 불러오는 중 에러 발생:", error);
    }
  };

  // 대본 업로드 함수 (관리자만 실행 가능)
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title || !content) {
      alert("제목과 내용을 입력해주세요.");
      return;
    }

    const formData = new FormData();
    formData.append("username", currentUsername);
    formData.append("title", title);
    formData.append("content", content);
    if (file) {
      formData.append("file", file);
    }

    try {
      await axios.post(`${API_URL}/scripts`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      alert("대본이 성공적으로 업로드되었습니다!");
      setTitle('');
      setContent('');
      setFile(null);
      fetchScripts(); // 목록 새로고침
    } catch (error) {
      if (error.response && error.response.status === 403) {
        alert("권한이 없습니다. 관리자만 업로드 가능합니다.");
      } else {
        alert("업로드 중 오류가 발생했습니다.");
      }
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2>🎙️ 오늘의 대본 (연습용)</h2>
      <p>매일 업데이트되는 고퀄리티 아나운서 대본으로 연습해보세요!</p>

      {/* 👑 관리자에게만 보이는 대본 업로드 폼 */}
      {isAdmin && (
        <div style={{ border: '2px solid #007bff', padding: '20px', borderRadius: '10px', marginBottom: '30px' }}>
          <h3 style={{ color: '#007bff', marginTop: 0 }}>👑 관리자 전용 업로드</h3>
          <form onSubmit={handleUpload}>
            <input 
              type="text" placeholder="대본 제목 (예: [KBS] 9시 뉴스 단신)" 
              value={title} onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
            />
            <textarea 
              placeholder="대본 본문 내용" 
              value={content} onChange={(e) => setContent(e.target.value)}
              style={{ width: '100%', padding: '10px', height: '150px', marginBottom: '10px' }}
            />
            <input 
              type="file" onChange={(e) => setFile(e.target.files[0])} 
              style={{ display: 'block', marginBottom: '10px' }}
            />
            <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}>
              대본 등록하기
            </button>
          </form>
        </div>
      )}

      {/* 📄 모두가 볼 수 있는 대본 리스트 */}
      <div>
        {scripts.map(script => (
          <div key={script.id} style={{ border: '1px solid #ddd', padding: '20px', marginBottom: '15px', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0 }}>{script.title}</h3>
            <p style={{ whiteSpace: 'pre-wrap', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '5px' }}>
              {script.content}
            </p>
            {script.file_url && (
              <a 
                href={`${API_URL}${script.file_url}`} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ display: 'inline-block', marginTop: '10px', padding: '8px 15px', backgroundColor: '#28a745', color: 'white', textDecoration: 'none', borderRadius: '5px' }}
              >
                💾 첨부파일 다운로드
              </a>
            )}
          </div>
        ))}
        {scripts.length === 0 && <p>아직 등록된 대본이 없습니다.</p>}
      </div>
    </div>
  );
}

export default ScriptBoard;
