import os, shutil, uuid, json
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, status, File, UploadFile, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pydantic import BaseModel

import database
import auth
from database import get_db

app = FastAPI()

# 1. CORS 설정 (프론트엔드 연결 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# 2. 이미지/첨부파일 저장용 폴더 세팅
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# 3. DB 테이블 생성
database.create_tables()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_user_level(points: int):
    if points < 50:
        return "🌱 씨앗"
    elif points < 150:
        return "🌿 새싹"
    elif points < 300:
        return "🍀 잎새"
    elif points < 500:
        return "🌳 나무"
    else:
        return "👑 열매"


class NotificationManager:
    def __init__(self):
        self.connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, username: str):
        await websocket.accept(); self.connections[username] = websocket

    def disconnect(self, username: str):
        if username in self.connections: del self.connections[username]

    async def send_personal_message(self, message: str, username: str):
        if username in self.connections: await self.connections[username].send_text(message)


notifier = NotificationManager()


@app.websocket("/ws/notify/{username}")
async def websocket_notify(websocket: WebSocket, username: str):
    await notifier.connect(websocket, username)
    try:
        while True: await websocket.receive_text()
    except WebSocketDisconnect:
        notifier.disconnect(username)


class ConnectionManager:
    def __init__(self): self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket): await websocket.accept(); self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket): self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections: await connection.send_text(message)


chat_manager = ConnectionManager()


@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await chat_manager.connect(websocket)
    try:
        while True: data = await websocket.receive_text(); await chat_manager.broadcast(data)
    except WebSocketDisconnect:
        chat_manager.disconnect(websocket)


class UserCreate(BaseModel): username: str; nickname: str; password: str


class UserLogin(BaseModel): username: str; password: str


class PostCreate(BaseModel):
    username: str;
    password: str;
    title: str;
    content: str;
    category: str;
    file_url: Optional[str] = None
    # 💡 [새로 추가됨] 공고일 경우 들어오는 데이터
    deadline: Optional[str] = None
    external_link: Optional[str] = None


class PostUpdate(BaseModel):
    username: str;
    title: str;
    content: str;
    category: str;
    file_url: Optional[str] = None
    deadline: Optional[str] = None
    external_link: Optional[str] = None


class CommentCreate(BaseModel): username: str; password: str; post_id: int; content: str; parent_id: Optional[
    int] = None


class CommentUpdate(BaseModel): username: str; content: str


class UserUpdateInfo(BaseModel): new_nickname: Optional[str] = None; new_password: Optional[str] = None


@app.post("/upload")
def upload_file(file: UploadFile = File(...)):
    ext = file.filename.split('.')[-1];
    filename = f"{uuid.uuid4()}.{ext}";
    file_path = f"uploads/{filename}"
    with open(file_path, "wb") as buffer: shutil.copyfileobj(file.file, buffer)
    return {"file_url": f"https://announcer-project.onrender.com/{file_path}"}


@app.post("/signup")
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(database.User).filter(database.User.username == user_data.username).first()
    if existing_user: raise HTTPException(status_code=400, detail="이미 존재하는 아이디입니다.")
    hashed_pw = auth.get_password_hash(user_data.password)
    new_user = database.User(username=user_data.username, nickname=user_data.nickname, hashed_password=hashed_pw,
                             points=0)
    db.add(new_user);
    db.commit()
    return {"message": "회원가입 완료"}


@app.post("/login")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(database.User).filter(database.User.username == user_data.username).first()
    if not user or not auth.verify_password(user_data.password, user.hashed_password): raise HTTPException(
        status_code=401)
    return {"message": "로그인 성공", "nickname": user.nickname, "level": get_user_level(user.points), "points": user.points}


@app.post("/posts")
def create_post(post_data: PostCreate, db: Session = Depends(get_db)):
    user = db.query(database.User).filter(database.User.username == post_data.username).first()
    if not user or not auth.verify_password(post_data.password, user.hashed_password): raise HTTPException(
        status_code=401)

    # 💡 [수정됨] 마감일과 외부 링크도 DB에 저장
    new_post = database.Post(
        title=post_data.title, content=post_data.content, category=post_data.category,
        file_url=post_data.file_url, deadline=post_data.deadline, external_link=post_data.external_link,
        user_id=user.id
    )
    db.add(new_post);
    user.points += 10;
    db.commit()
    return {"message": "등록 완료"}


# ==========================================
# 🚨 [새로 추가됨] 공채 D-Day 전광판 전용 API
# ==========================================
@app.get("/announcements", summary="공채 전광판용 데이터 조회")
def get_announcements(db: Session = Depends(get_db)):
    # 카테고리가 '공고'인 글만 모두 가져옵니다.
    announcements = db.query(database.Post).filter(database.Post.category == '공고').all()

    result = []
    for post in announcements:
        if post.deadline:
            result.append({
                "글번호": post.id, "제목": post.title,
                "마감일": post.deadline, "링크": post.external_link
            })

    # 마감일(문자열) 순서대로 오름차순 정렬 (가장 촉박한 게 앞으로 오게)
    result.sort(key=lambda x: x["마감일"])
    return result


@app.get("/posts")
def get_posts(skip: int = 0, limit: int = 5, search: Optional[str] = None, category: Optional[str] = "전체",
              sort_by: Optional[str] = "latest", db: Session = Depends(get_db)):
    query = db.query(database.Post)
    if category and category != '전체': query = query.filter(database.Post.category == category)
    if search:
        search_formatted = f"%{search}%"
        query = query.filter(database.Post.title.like(search_formatted) | database.Post.content.like(search_formatted))
    all_posts = query.all()
    if sort_by == "popular":
        all_posts.sort(key=lambda x: len(x.likes), reverse=True)
    else:
        all_posts.sort(key=lambda x: x.id, reverse=True)
    total_count = len(all_posts)
    paged_posts = all_posts[skip: skip + limit]

    result = []
    for post in paged_posts:
        result.append({
            "글번호": post.id, "제목": post.title, "내용": post.content, "카테고리": getattr(post, 'category', '자유'),
            "file_url": post.file_url, "deadline": post.deadline, "external_link": post.external_link,
            "작성자": post.author.nickname, "작성자등급": get_user_level(post.author.points),
            "작성시간": post.created_at.strftime("%Y-%m-%d %H:%M"),
            "좋아요수": len(post.likes), "좋아요누른사람들": [like.user.nickname for like in post.likes]
        })
    return {"total_count": total_count, "posts": result}


@app.get("/posts/{post_id}")
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(database.Post).filter(database.Post.id == post_id).first()
    if not post: raise HTTPException(status_code=404)
    return {
        "글번호": post.id, "제목": post.title, "내용": post.content, "카테고리": getattr(post, 'category', '자유'),
        "file_url": post.file_url, "deadline": post.deadline, "external_link": post.external_link,
        "작성자": post.author.nickname, "작성자등급": get_user_level(post.author.points),
        "작성시간": post.created_at.strftime("%Y-%m-%d %H:%M"),
        "좋아요수": len(post.likes), "좋아요누른사람들": [like.user.nickname for like in post.likes]
    }


@app.put("/posts/{post_id}")
def update_post(post_id: int, post_data: PostUpdate, db: Session = Depends(get_db)):
    post = db.query(database.Post).filter(database.Post.id == post_id).first()
    if not post: raise HTTPException(status_code=404)
    if post.author.username != post_data.username: raise HTTPException(status_code=403)
    post.title = post_data.title;
    post.content = post_data.content;
    post.category = post_data.category
    if post_data.file_url: post.file_url = post_data.file_url
    if post_data.deadline: post.deadline = post_data.deadline
    if post_data.external_link: post.external_link = post_data.external_link
    db.commit()
    return {"message": "수정 완료"}


@app.delete("/posts/{post_id}")
def delete_post(post_id: int, username: str, db: Session = Depends(get_db)):
    post = db.query(database.Post).filter(database.Post.id == post_id).first()
    if not post: raise HTTPException(status_code=404)
    if post.author.username != username: raise HTTPException(status_code=403)
    post.author.points = max(0, post.author.points - 10)
    db.delete(post);
    db.commit()
    return {"message": "삭제 완료"}


@app.post("/posts/{post_id}/like")
async def toggle_like(post_id: int, username: str, db: Session = Depends(get_db)):
    user = db.query(database.User).filter(database.User.username == username).first()
    post = db.query(database.Post).filter(database.Post.id == post_id).first()
    if not user or not post: raise HTTPException(status_code=404)

    existing_like = db.query(database.PostLike).filter(database.PostLike.post_id == post_id,
                                                       database.PostLike.user_id == user.id).first()
    if existing_like:
        post.author.points = max(0, post.author.points - 3)
        db.delete(existing_like);
        db.commit()
        return {"message": "좋아요 취소"}
    else:
        db.add(database.PostLike(user_id=user.id, post_id=post_id))
        if post.author.username != username:
            post.author.points += 3
            msg = json.dumps({"text": f"❤️ {user.nickname}님이 회원님의 [{post.title}] 글을 좋아합니다. (+3점)"})
            await notifier.send_personal_message(msg, post.author.username)
        db.commit();
        return {"message": "좋아요 완료"}


@app.post("/comments")
async def create_comment(comment_data: CommentCreate, db: Session = Depends(get_db)):
    user = db.query(database.User).filter(database.User.username == comment_data.username).first()
    if not user or not auth.verify_password(comment_data.password, user.hashed_password): raise HTTPException(
        status_code=401)

    new_comment = database.Comment(content=comment_data.content, user_id=user.id, post_id=comment_data.post_id,
                                   parent_id=comment_data.parent_id)
    db.add(new_comment);
    user.points += 5;
    db.commit()

    post = db.query(database.Post).filter(database.Post.id == comment_data.post_id).first()
    if post and post.author.username != user.username:
        msg = json.dumps({"text": f"💬 {user.nickname}님이 회원님의 글에 댓글을 남겼습니다."})
        await notifier.send_personal_message(msg, post.author.username)
    return {"message": "등록 완료"}


@app.get("/posts/{post_id}/comments")
def get_comments(post_id: int, sort_by: str = "latest", db: Session = Depends(get_db)):
    comments = db.query(database.Comment).filter(database.Comment.post_id == post_id).all()
    if sort_by == "popular":
        comments.sort(key=lambda x: len(x.likes), reverse=True)
    else:
        comments.sort(key=lambda x: x.id, reverse=False)
    result = []
    for c in comments:
        result.append({
            "댓글번호": c.id, "내용": c.content, "작성자": c.author.nickname, "작성자등급": get_user_level(c.author.points),
            "작성시간": c.created_at.strftime("%Y-%m-%d %H:%M"), "좋아요수": len(c.likes),
            "좋아요누른사람들": [like.user.nickname for like in c.likes], "부모댓글번호": c.parent_id
        })
    return result


@app.put("/comments/{comment_id}")
def update_comment(comment_id: int, comment_data: CommentUpdate, db: Session = Depends(get_db)):
    comment = db.query(database.Comment).filter(database.Comment.id == comment_id).first()
    if not comment: raise HTTPException(status_code=404)
    if comment.author.username != comment_data.username: raise HTTPException(status_code=403)
    comment.content = comment_data.content;
    db.commit();
    return {"message": "수정 완료"}


@app.delete("/comments/{comment_id}")
def delete_comment(comment_id: int, username: str, db: Session = Depends(get_db)):
    comment = db.query(database.Comment).filter(database.Comment.id == comment_id).first()
    if not comment: raise HTTPException(status_code=404)
    if comment.author.username != username: raise HTTPException(status_code=403)
    comment.author.points = max(0, comment.author.points - 5)
    db.delete(comment);
    db.commit();
    return {"message": "삭제 완료"}


@app.post("/comments/{comment_id}/like")
async def toggle_comment_like(comment_id: int, username: str, db: Session = Depends(get_db)):
    user = db.query(database.User).filter(database.User.username == username).first()
    comment = db.query(database.Comment).filter(database.Comment.id == comment_id).first()
    if not user or not comment: raise HTTPException(status_code=404)
    existing = db.query(database.CommentLike).filter(database.CommentLike.comment_id == comment_id,
                                                     database.CommentLike.user_id == user.id).first()
    if existing:
        comment.author.points = max(0, comment.author.points - 2)
        db.delete(existing);
        db.commit();
        return {"message": "좋아요 취소"}
    else:
        db.add(database.CommentLike(user_id=user.id, comment_id=comment_id))
        if comment.author.username != username:
            comment.author.points += 2
            msg = json.dumps({"text": f"👍 {user.nickname}님이 회원님의 댓글을 좋아합니다. (+2점)"})
            await notifier.send_personal_message(msg, comment.author.username)
        db.commit();
        return {"message": "좋아요 완료"}


@app.get("/users/{username}/activity")
def get_user_activity(username: str, db: Session = Depends(get_db)):
    user = db.query(database.User).filter(database.User.username == username).first()
    if not user: raise HTTPException(status_code=404)
    my_posts = [{"글번호": p.id, "제목": p.title, "작성시간": p.created_at.strftime("%Y-%m-%d %H:%M")} for p in user.posts]
    my_comments = [{"댓글번호": c.id, "내용": c.content, "원문번호": c.post_id, "작성시간": c.created_at.strftime("%Y-%m-%d %H:%M")}
                   for c in user.comments]
    liked_post_records = db.query(database.PostLike).filter(database.PostLike.user_id == user.id).all()
    liked_posts = [{"글번호": rec.post.id, "제목": rec.post.title, "작성자": rec.post.author.nickname} for rec in
                   liked_post_records]
    return {"nickname": user.nickname, "points": user.points, "level": get_user_level(user.points),
            "my_posts": my_posts[::-1], "my_comments": my_comments[::-1], "liked_posts": liked_posts[::-1]}


@app.put("/users/{username}")
def update_user_info(username: str, update_data: UserUpdateInfo, db: Session = Depends(get_db)):
    user = db.query(database.User).filter(database.User.username == username).first()
    if not user: raise HTTPException(status_code=404)
    if update_data.new_nickname: user.nickname = update_data.new_nickname
    if update_data.new_password: user.hashed_password = auth.get_password_hash(update_data.new_password)
    db.commit();
    return {"message": "수정 완료", "new_nickname": user.nickname}


class GenerateRequest(BaseModel): username: str; password: str


# ==========================================
# 🎙️ [새로 추가됨] 관리자 전용 대본 게시판 API
# ==========================================

# (💡 주의: 관리자로 사용할 아이디를 아래 변수에 정확히 적어주세요!)
ADMIN_USERNAME = "admin" 

# 1. [모든 유저] 대본 목록 불러오기 API
@app.get("/scripts")
def get_scripts(db: Session = Depends(get_db)):
    # 최신 글이 맨 위에 오도록 정렬해서 가져옵니다.
    scripts = db.query(database.Script).order_by(database.Script.created_at.desc()).all()
    return scripts

# 2. [관리자 전용] 새 대본 업로드 API
@app.post("/scripts")
def create_script(
    username: str = Form(...),  # 프론트엔드에서 보내는 현재 로그인한 아이디
    title: str = Form(...),
    content: str = Form(...),
    file: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    # 🚨 관리자 아이디가 아니면 에러를 뱉고 쫓아냅니다!
    if username != ADMIN_USERNAME:
        raise HTTPException(status_code=403, detail="관리자만 대본을 업로드할 수 있습니다.")

    file_url = None
    if file:
        # 파일 이름이 겹치지 않게 고유한 이름(uuid)을 붙여줍니다.
        os.makedirs("uploads", exist_ok=True)
        file_extension = file.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = f"uploads/{unique_filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        file_url = f"/uploads/{unique_filename}"

    # DB에 저장
    new_script = database.Script(
        title=title,
        content=content,
        file_url=file_url
    )
    db.add(new_script)
    db.commit()
    db.refresh(new_script)
    
    return {"message": "대본이 성공적으로 업로드되었습니다!"}
  
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
