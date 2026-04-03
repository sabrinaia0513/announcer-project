from passlib.context import CryptContext

# 💡 핵심: schemes를 bcrypt에서 pbkdf2_sha256으로 변경합니다.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def get_password_hash(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)