from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    nickname = Column(String)
    hashed_password = Column(String)
    # 💡 [새로 추가됨] 유저의 포인트를 저장하는 칸 (가입 시 기본값 0점)
    points = Column(Integer, default=0)
    posts = relationship("Post", back_populates="author")
    comments = relationship("Comment", back_populates="author")

class PostLike(Base):
    __tablename__ = "post_likes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    post_id = Column(Integer, ForeignKey("posts.id"))
    user = relationship("User")
    post = relationship("Post", back_populates="likes")

# 💡 [새로 추가됨] 댓글 좋아요 기록 장부
class CommentLike(Base):
    __tablename__ = "comment_likes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    comment_id = Column(Integer, ForeignKey("comments.id"))
    user = relationship("User")
    comment = relationship("Comment", back_populates="likes")

# (database.py 내부)
class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(String)
    category = Column(String, default="자유")
    file_url = Column(String, nullable=True)

    # 💡 [새로 추가됨] 공채 전광판용 데이터
    deadline = Column(String, nullable=True)  # "YYYY-MM-DD" 형태로 저장
    external_link = Column(String, nullable=True)  # 외부 구직 사이트 링크

    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    author = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")

class Comment(Base):
    __tablename__ = "comments"
    id = Column(Integer, primary_key=True, index=True)
    content = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    post_id = Column(Integer, ForeignKey("posts.id"))

    # 💡 [새로 추가됨] 이 댓글이 대댓글일 경우, 어떤 부모 댓글에 달렸는지 기억합니다.
    parent_id = Column(Integer, ForeignKey("comments.id"), nullable=True)

    author = relationship("User", back_populates="comments")
    post = relationship("Post", back_populates="comments")
    likes = relationship("CommentLike", back_populates="comment", cascade="all, delete-orphan")

class Script(Base):
    __tablename__ = "scripts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)       # 대본 제목 (예: [KBS] 9시 뉴스 앵커멘트)
    content = Column(Text)                   # 대본 본문 내용
    file_url = Column(String, nullable=True) # 첨부된 원고 파일(PDF, docx 등) 주소
    created_at = Column(DateTime, default=datetime.utcnow) # 올린 시간

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
SQLALCHEMY_DATABASE_URL = "sqlite:///./community.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def create_tables():
    Base.metadata.create_all(bind=engine)
