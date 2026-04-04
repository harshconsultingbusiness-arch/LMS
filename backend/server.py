from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Header, Query, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import requests
from bson import ObjectId

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ.get("JWT_SECRET", "default-secret-change-me")

# Object Storage
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = "school-lms"
storage_key = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ========================
# PASSWORD HASHING
# ========================
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# ========================
# JWT TOKENS
# ========================
def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

# ========================
# AUTH HELPER
# ========================
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_teacher(request: Request) -> dict:
    user = await get_current_user(request)
    if user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Teacher access required")
    return user

# ========================
# OBJECT STORAGE
# ========================
def init_storage():
    global storage_key
    if storage_key:
        return storage_key
    try:
        resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        resp.raise_for_status()
        storage_key = resp.json()["storage_key"]
        logger.info("Storage initialized successfully")
        return storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data, timeout=120
    )
    resp.raise_for_status()
    return resp.json()

def get_object(path: str) -> tuple:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not available")
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key}, timeout=60
    )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")

# ========================
# PYDANTIC MODELS
# ========================
class LoginRequest(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str  # student or parent
    student_id: Optional[str] = None  # For parent linking to student

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    student_id: Optional[str] = None
    created_at: str

class SubjectCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class ChapterCreate(BaseModel):
    subject_id: str
    name: str
    description: Optional[str] = ""
    order: int

class TopicCreate(BaseModel):
    chapter_id: str
    name: str
    content: Optional[str] = ""
    video_link: Optional[str] = ""
    questions: Optional[str] = ""

class SubmissionUpdate(BaseModel):
    status: str  # approved, rejected
    remarks: Optional[str] = ""

class AttendanceCreate(BaseModel):
    student_id: str
    date: str
    present: bool

class FeeCreate(BaseModel):
    student_id: str
    amount: float
    description: str
    due_date: str
    paid: bool = False

class RemarkCreate(BaseModel):
    student_id: str
    content: str

# ========================
# AUTH ENDPOINTS
# ========================
@api_router.post("/auth/login")
async def login(request: LoginRequest, response: Response):
    email = request.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, user["email"], user["role"])
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": user_id,
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "student_id": user.get("student_id")
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

# ========================
# USER MANAGEMENT (Teacher only)
# ========================
@api_router.post("/users", response_model=UserResponse)
async def create_user(user_data: UserCreate, request: Request):
    await require_teacher(request)
    
    if user_data.role not in ["student", "parent"]:
        raise HTTPException(status_code=400, detail="Role must be student or parent")
    
    email = user_data.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    if user_data.role == "parent" and not user_data.student_id:
        raise HTTPException(status_code=400, detail="Parent must be linked to a student")
    
    user_doc = {
        "email": email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "role": user_data.role,
        "student_id": user_data.student_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.users.insert_one(user_doc)
    return UserResponse(
        id=str(result.inserted_id),
        email=email,
        name=user_data.name,
        role=user_data.role,
        student_id=user_data.student_id,
        created_at=user_doc["created_at"]
    )

@api_router.get("/users")
async def list_users(request: Request, role: Optional[str] = None):
    await require_teacher(request)
    
    query = {}
    if role:
        query["role"] = role
    
    users = await db.users.find(query, {"password_hash": 0}).to_list(1000)
    for user in users:
        user["id"] = str(user.pop("_id"))
    return users

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, request: Request):
    await require_teacher(request)
    
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user["id"] = str(user.pop("_id"))
    return user

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, request: Request):
    await require_teacher(request)
    
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

# ========================
# SUBJECTS (Teacher)
# ========================
@api_router.post("/subjects")
async def create_subject(subject: SubjectCreate, request: Request):
    await require_teacher(request)
    
    doc = {
        "name": subject.name,
        "description": subject.description,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.subjects.insert_one(doc)
    return {
        "id": str(result.inserted_id),
        "name": subject.name,
        "description": subject.description,
        "created_at": doc["created_at"]
    }

@api_router.get("/subjects")
async def list_subjects(request: Request):
    await get_current_user(request)  # Any authenticated user
    
    subjects = await db.subjects.find({}).to_list(100)
    for s in subjects:
        s["id"] = str(s.pop("_id"))
    return subjects

@api_router.delete("/subjects/{subject_id}")
async def delete_subject(subject_id: str, request: Request):
    await require_teacher(request)
    
    await db.subjects.delete_one({"_id": ObjectId(subject_id)})
    await db.chapters.delete_many({"subject_id": subject_id})
    return {"message": "Subject deleted"}

# ========================
# CHAPTERS
# ========================
@api_router.post("/chapters")
async def create_chapter(chapter: ChapterCreate, request: Request):
    await require_teacher(request)
    
    doc = {
        "subject_id": chapter.subject_id,
        "name": chapter.name,
        "description": chapter.description,
        "order": chapter.order,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.chapters.insert_one(doc)
    return {
        "id": str(result.inserted_id),
        "subject_id": chapter.subject_id,
        "name": chapter.name,
        "description": chapter.description,
        "order": chapter.order,
        "created_at": doc["created_at"]
    }

@api_router.get("/chapters")
async def list_chapters(request: Request, subject_id: Optional[str] = None):
    await get_current_user(request)
    
    query = {}
    if subject_id:
        query["subject_id"] = subject_id
    
    chapters = await db.chapters.find(query).sort("order", 1).to_list(100)
    for c in chapters:
        c["id"] = str(c.pop("_id"))
    return chapters

@api_router.delete("/chapters/{chapter_id}")
async def delete_chapter(chapter_id: str, request: Request):
    await require_teacher(request)
    
    await db.chapters.delete_one({"_id": ObjectId(chapter_id)})
    await db.topics.delete_many({"chapter_id": chapter_id})
    return {"message": "Chapter deleted"}

# ========================
# TOPICS
# ========================
@api_router.post("/topics")
async def create_topic(topic: TopicCreate, request: Request):
    await require_teacher(request)
    
    doc = {
        "chapter_id": topic.chapter_id,
        "name": topic.name,
        "content": topic.content,
        "video_link": topic.video_link,
        "questions": topic.questions,
        "material_path": None,
        "question_sheet_path": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.topics.insert_one(doc)
    return {
        "id": str(result.inserted_id),
        "chapter_id": topic.chapter_id,
        "name": topic.name,
        "content": topic.content,
        "video_link": topic.video_link,
        "questions": topic.questions,
        "material_path": None,
        "question_sheet_path": None,
        "created_at": doc["created_at"]
    }

@api_router.get("/topics")
async def list_topics(request: Request, chapter_id: Optional[str] = None):
    await get_current_user(request)
    
    query = {}
    if chapter_id:
        query["chapter_id"] = chapter_id
    
    topics = await db.topics.find(query).to_list(100)
    for t in topics:
        t["id"] = str(t.pop("_id"))
    return topics

@api_router.delete("/topics/{topic_id}")
async def delete_topic(topic_id: str, request: Request):
    await require_teacher(request)
    
    await db.topics.delete_one({"_id": ObjectId(topic_id)})
    return {"message": "Topic deleted"}

# ========================
# FILE UPLOADS
# ========================
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "gif"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

MIME_TYPES = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "pdf": "application/pdf"
}

@api_router.post("/upload/material/{topic_id}")
async def upload_material(topic_id: str, request: Request, file: UploadFile = File(...)):
    await require_teacher(request)
    
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File type not allowed")
    
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    
    path = f"{APP_NAME}/materials/{topic_id}/{uuid.uuid4()}.{ext}"
    content_type = MIME_TYPES.get(ext, "application/octet-stream")
    
    result = put_object(path, data, content_type)
    
    await db.topics.update_one(
        {"_id": ObjectId(topic_id)},
        {"$set": {"material_path": result["path"]}}
    )
    
    await db.files.insert_one({
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result["size"],
        "type": "material",
        "topic_id": topic_id,
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"path": result["path"], "filename": file.filename}

@api_router.post("/upload/question-sheet/{topic_id}")
async def upload_question_sheet(topic_id: str, request: Request, file: UploadFile = File(...)):
    await require_teacher(request)
    
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File type not allowed")
    
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    
    path = f"{APP_NAME}/questions/{topic_id}/{uuid.uuid4()}.{ext}"
    content_type = MIME_TYPES.get(ext, "application/octet-stream")
    
    result = put_object(path, data, content_type)
    
    await db.topics.update_one(
        {"_id": ObjectId(topic_id)},
        {"$set": {"question_sheet_path": result["path"]}}
    )
    
    await db.files.insert_one({
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result["size"],
        "type": "question_sheet",
        "topic_id": topic_id,
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"path": result["path"], "filename": file.filename}

@api_router.get("/files/{path:path}")
async def download_file(path: str, request: Request, auth: str = Query(None)):
    # Support query param auth for img tags
    if auth:
        request.headers._list.append((b"authorization", f"Bearer {auth}".encode()))
    
    await get_current_user(request)
    
    record = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not record:
        # Try fetching from storage directly
        try:
            data, content_type = get_object(path)
            return Response(content=data, media_type=content_type)
        except:
            raise HTTPException(status_code=404, detail="File not found")
    
    data, content_type = get_object(path)
    return Response(content=data, media_type=record.get("content_type", content_type))

# ========================
# STUDENT SUBMISSIONS
# ========================
@api_router.post("/submissions/{topic_id}")
async def submit_answer(topic_id: str, request: Request, file: UploadFile = File(...)):
    user = await get_current_user(request)
    if user["role"] != "student":
        raise HTTPException(status_code=403, detail="Students only")
    
    # Check if chapter is unlocked
    topic = await db.topics.find_one({"_id": ObjectId(topic_id)})
    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")
    
    chapter = await db.chapters.find_one({"_id": ObjectId(topic["chapter_id"])})
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    
    # Check chapter unlock status
    is_unlocked = await check_chapter_unlocked(user["_id"], chapter)
    if not is_unlocked:
        raise HTTPException(status_code=403, detail="Chapter is locked")
    
    ext = file.filename.split(".")[-1].lower() if "." in file.filename else "bin"
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File type not allowed")
    
    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")
    
    path = f"{APP_NAME}/submissions/{user['_id']}/{topic_id}/{uuid.uuid4()}.{ext}"
    content_type = MIME_TYPES.get(ext, "application/octet-stream")
    
    result = put_object(path, data, content_type)
    
    submission_doc = {
        "student_id": user["_id"],
        "student_name": user["name"],
        "topic_id": topic_id,
        "chapter_id": topic["chapter_id"],
        "subject_id": chapter.get("subject_id"),
        "file_path": result["path"],
        "original_filename": file.filename,
        "status": "pending",
        "remarks": "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "reviewed_at": None
    }
    
    insert_result = await db.submissions.insert_one(submission_doc)
    
    await db.files.insert_one({
        "storage_path": result["path"],
        "original_filename": file.filename,
        "content_type": content_type,
        "size": result["size"],
        "type": "submission",
        "topic_id": topic_id,
        "student_id": user["_id"],
        "is_deleted": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"id": str(insert_result.inserted_id), "status": "pending", "path": result["path"]}

async def check_chapter_unlocked(student_id: str, chapter: dict) -> bool:
    # First chapter is always unlocked
    if chapter["order"] == 1:
        return True
    
    # Find previous chapter
    prev_chapter = await db.chapters.find_one({
        "subject_id": chapter["subject_id"],
        "order": chapter["order"] - 1
    })
    
    if not prev_chapter:
        return True  # No previous chapter, unlock
    
    # Check if there's an approved submission for any topic in the previous chapter
    prev_chapter_topics = await db.topics.find({"chapter_id": str(prev_chapter["_id"])}).to_list(100)
    
    for topic in prev_chapter_topics:
        approved = await db.submissions.find_one({
            "student_id": student_id,
            "topic_id": str(topic["_id"]),
            "status": "approved"
        })
        if approved:
            return True
    
    return False

@api_router.get("/submissions")
async def list_submissions(request: Request, student_id: Optional[str] = None, status: Optional[str] = None):
    user = await get_current_user(request)
    
    query = {}
    if user["role"] == "student":
        query["student_id"] = user["_id"]
    elif user["role"] == "parent":
        query["student_id"] = user.get("student_id")
    elif student_id:
        query["student_id"] = student_id
    
    if status:
        query["status"] = status
    
    submissions = await db.submissions.find(query).sort("created_at", -1).to_list(500)
    for s in submissions:
        s["id"] = str(s.pop("_id"))
    return submissions

@api_router.put("/submissions/{submission_id}")
async def review_submission(submission_id: str, update: SubmissionUpdate, request: Request):
    await require_teacher(request)
    
    if update.status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be approved or rejected")
    
    result = await db.submissions.update_one(
        {"_id": ObjectId(submission_id)},
        {"$set": {
            "status": update.status,
            "remarks": update.remarks,
            "reviewed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    return {"message": "Submission reviewed", "status": update.status}

# ========================
# CHAPTER PROGRESS (for students)
# ========================
@api_router.get("/progress")
async def get_progress(request: Request, student_id: Optional[str] = None):
    user = await get_current_user(request)
    
    if user["role"] == "student":
        target_student_id = user["_id"]
    elif user["role"] == "parent":
        target_student_id = user.get("student_id")
    elif user["role"] == "teacher" and student_id:
        target_student_id = student_id
    else:
        raise HTTPException(status_code=400, detail="Student ID required")
    
    subjects = await db.subjects.find({}).to_list(100)
    progress_data = []
    
    for subject in subjects:
        subject_id = str(subject["_id"])
        chapters = await db.chapters.find({"subject_id": subject_id}).sort("order", 1).to_list(50)
        
        chapter_progress = []
        for chapter in chapters:
            chapter_id = str(chapter["_id"])
            chapter_obj = await db.chapters.find_one({"_id": chapter["_id"]})
            
            is_unlocked = await check_chapter_unlocked(target_student_id, chapter_obj)
            
            # Get submission status for this chapter
            topics = await db.topics.find({"chapter_id": chapter_id}).to_list(50)
            submissions = []
            for topic in topics:
                sub = await db.submissions.find_one({
                    "student_id": target_student_id,
                    "topic_id": str(topic["_id"])
                }, sort=[("created_at", -1)])
                if sub:
                    submissions.append({
                        "topic_id": str(topic["_id"]),
                        "topic_name": topic["name"],
                        "status": sub["status"],
                        "remarks": sub.get("remarks", "")
                    })
            
            chapter_progress.append({
                "id": chapter_id,
                "name": chapter["name"],
                "order": chapter["order"],
                "is_unlocked": is_unlocked,
                "submissions": submissions
            })
        
        progress_data.append({
            "id": subject_id,
            "name": subject["name"],
            "chapters": chapter_progress
        })
    
    return progress_data

# ========================
# ATTENDANCE
# ========================
@api_router.post("/attendance")
async def mark_attendance(attendance: AttendanceCreate, request: Request):
    await require_teacher(request)
    
    # Upsert attendance for the date
    await db.attendance.update_one(
        {"student_id": attendance.student_id, "date": attendance.date},
        {"$set": {
            "student_id": attendance.student_id,
            "date": attendance.date,
            "present": attendance.present,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"message": "Attendance marked"}

@api_router.get("/attendance")
async def get_attendance(request: Request, student_id: Optional[str] = None, month: Optional[str] = None):
    user = await get_current_user(request)
    
    query = {}
    if user["role"] == "student":
        query["student_id"] = user["_id"]
    elif user["role"] == "parent":
        query["student_id"] = user.get("student_id")
    elif student_id:
        query["student_id"] = student_id
    
    if month:
        query["date"] = {"$regex": f"^{month}"}
    
    records = await db.attendance.find(query).sort("date", -1).to_list(500)
    for r in records:
        r["id"] = str(r.pop("_id"))
    return records

# ========================
# FEES
# ========================
@api_router.post("/fees")
async def create_fee(fee: FeeCreate, request: Request):
    await require_teacher(request)
    
    doc = {
        "student_id": fee.student_id,
        "amount": fee.amount,
        "description": fee.description,
        "due_date": fee.due_date,
        "paid": fee.paid,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.fees.insert_one(doc)
    return {
        "id": str(result.inserted_id),
        "student_id": fee.student_id,
        "amount": fee.amount,
        "description": fee.description,
        "due_date": fee.due_date,
        "paid": fee.paid,
        "created_at": doc["created_at"]
    }

@api_router.get("/fees")
async def get_fees(request: Request, student_id: Optional[str] = None):
    user = await get_current_user(request)
    
    query = {}
    if user["role"] == "student":
        query["student_id"] = user["_id"]
    elif user["role"] == "parent":
        query["student_id"] = user.get("student_id")
    elif student_id:
        query["student_id"] = student_id
    
    fees = await db.fees.find(query).sort("due_date", -1).to_list(100)
    for f in fees:
        f["id"] = str(f.pop("_id"))
    return fees

@api_router.put("/fees/{fee_id}")
async def update_fee(fee_id: str, request: Request, paid: bool = True):
    await require_teacher(request)
    
    await db.fees.update_one(
        {"_id": ObjectId(fee_id)},
        {"$set": {"paid": paid}}
    )
    return {"message": "Fee updated"}

# ========================
# REMARKS
# ========================
@api_router.post("/remarks")
async def create_remark(remark: RemarkCreate, request: Request):
    teacher = await require_teacher(request)
    
    doc = {
        "student_id": remark.student_id,
        "content": remark.content,
        "teacher_name": teacher["name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.remarks.insert_one(doc)
    return {
        "id": str(result.inserted_id),
        "student_id": remark.student_id,
        "content": remark.content,
        "teacher_name": teacher["name"],
        "created_at": doc["created_at"]
    }

@api_router.get("/remarks")
async def get_remarks(request: Request, student_id: Optional[str] = None):
    user = await get_current_user(request)
    
    query = {}
    if user["role"] == "student":
        query["student_id"] = user["_id"]
    elif user["role"] == "parent":
        query["student_id"] = user.get("student_id")
    elif student_id:
        query["student_id"] = student_id
    
    remarks = await db.remarks.find(query).sort("created_at", -1).to_list(100)
    for r in remarks:
        r["id"] = str(r.pop("_id"))
    return remarks

# ========================
# STARTUP / SHUTDOWN
# ========================
@app.on_event("startup")
async def startup():
    # Initialize storage
    try:
        init_storage()
    except Exception as e:
        logger.warning(f"Storage init on startup: {e}")
    
    # Seed teacher account
    teacher_email = os.environ.get("TEACHER_EMAIL", "teacher@school.com")
    teacher_password = os.environ.get("TEACHER_PASSWORD", "teacher123")
    
    existing = await db.users.find_one({"email": teacher_email})
    if existing is None:
        hashed = hash_password(teacher_password)
        await db.users.insert_one({
            "email": teacher_email,
            "password_hash": hashed,
            "name": "Admin Teacher",
            "role": "teacher",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Teacher account created: {teacher_email}")
    elif not verify_password(teacher_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": teacher_email},
            {"$set": {"password_hash": hash_password(teacher_password)}}
        )
        logger.info("Teacher password updated")
    
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.submissions.create_index([("student_id", 1), ("topic_id", 1)])
    await db.attendance.create_index([("student_id", 1), ("date", 1)])
    
    # Write test credentials
    try:
        os.makedirs("/app/memory", exist_ok=True)
        with open("/app/memory/test_credentials.md", "w") as f:
            f.write(f"# Test Credentials\n\n")
            f.write(f"## Teacher (Admin)\n")
            f.write(f"- Email: {teacher_email}\n")
            f.write(f"- Password: {teacher_password}\n")
            f.write(f"- Role: teacher\n\n")
            f.write(f"## Auth Endpoints\n")
            f.write(f"- POST /api/auth/login\n")
            f.write(f"- POST /api/auth/logout\n")
            f.write(f"- GET /api/auth/me\n")
    except Exception as e:
        logger.warning(f"Could not write test credentials: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Include the router in the main app
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000")],
    allow_methods=["*"],
    allow_headers=["*"],
)
