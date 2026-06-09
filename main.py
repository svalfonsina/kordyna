import os
from datetime import datetime, timedelta

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session

import diff_engine
from models import (
    Base,
    ChangeEvent,
    Discipline,
    Project,
    ProjectMember,
    Review,
    SessionLocal,
    User,
    engine,
)
from seed import seed_disciplines

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

app = FastAPI(title="Kordyna", version="1.0.0")

Base.metadata.create_all(bind=engine)
seed_disciplines()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


# ── Helpers ──────────────────────────────────────────────────────────

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": str(user_id), "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


# ── Schemas ──────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    password: str
    discipline_id: int | None = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ProjectCreate(BaseModel):
    name: str
    description: str | None = None

class ProjectOut(BaseModel):
    id: int
    name: str
    description: str | None
    owner_id: int
    created_at: datetime
    class Config:
        from_attributes = True

class MemberAdd(BaseModel):
    discipline_id: int

class ReviewUpdate(BaseModel):
    status: str
    notes: str | None = None

class DisciplineOut(BaseModel):
    id: int
    name: str
    class Config:
        from_attributes = True


# ── Auth ─────────────────────────────────────────────────────────────

@app.post("/auth/register", response_model=TokenResponse)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(status_code=400, detail="Username taken")
    user = User(
        username=body.username,
        hashed_password=pwd_context.hash(body.password),
        discipline_id=body.discipline_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_token(user.id))


@app.post("/auth/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not pwd_context.verify(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Bad credentials")
    return TokenResponse(access_token=create_token(user.id))


# ── Projects ─────────────────────────────────────────────────────────

@app.post("/projects", response_model=ProjectOut, status_code=201)
def create_project(body: ProjectCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = Project(name=body.name, description=body.description, owner_id=user.id)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@app.get("/projects", response_model=list[ProjectOut])
def list_projects(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Project).all()


@app.get("/projects/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@app.post("/projects/{project_id}/members", status_code=201)
def add_member(project_id: int, body: MemberAdd, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    member = ProjectMember(project_id=project_id, discipline_id=body.discipline_id)
    db.add(member)
    db.commit()
    db.refresh(member)
    return {"id": member.id, "project_id": project_id, "discipline_id": body.discipline_id}


# ── Changes ──────────────────────────────────────────────────────────

@app.post("/projects/{project_id}/changes", status_code=201)
async def create_change(
    project_id: int,
    old_file: UploadFile = File(...),
    new_file: UploadFile = File(...),
    title: str = "Untitled change",
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    old_bytes = await old_file.read()
    new_bytes = await new_file.read()

    result = diff_engine.compare_drawings(
        old_bytes, old_file.filename or "old.png",
        new_bytes, new_file.filename or "new.png",
    )

    event = ChangeEvent(
        project_id=project_id,
        title=title,
        diff_image_path=result["overlay_path"],
        region_count=result["region_count"],
        created_by=user.id,
    )
    db.add(event)
    db.flush()

    discipline_ids = [m.discipline_id for m in db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()]
    for did in discipline_ids:
        db.add(Review(change_event_id=event.id, discipline_id=did, status="pending"))

    db.commit()
    db.refresh(event)

    return {
        "id": event.id,
        "title": event.title,
        "region_count": result["region_count"],
        "regions": result["regions"],
        "diff_image": f"/changes/{event.id}/diff-image",
        "reviews_created": len(discipline_ids),
    }


@app.get("/projects/{project_id}/changes")
def list_changes(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    events = db.query(ChangeEvent).filter(ChangeEvent.project_id == project_id).order_by(ChangeEvent.created_at.desc()).all()
    return [
        {
            "id": e.id,
            "title": e.title,
            "region_count": e.region_count,
            "created_at": e.created_at,
            "diff_image": f"/changes/{e.id}/diff-image",
        }
        for e in events
    ]


# ── Single change detail ────────────────────────────────────────────

@app.get("/changes/{change_id}")
def get_change(change_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = db.query(ChangeEvent).filter(ChangeEvent.id == change_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Change not found")
    reviews = db.query(Review).filter(Review.change_event_id == change_id).all()
    return {
        "id": event.id,
        "title": event.title,
        "project_id": event.project_id,
        "region_count": event.region_count,
        "created_at": event.created_at,
        "diff_image": f"/changes/{event.id}/diff-image",
        "reviews": [
            {
                "id": r.id,
                "discipline_id": r.discipline_id,
                "discipline": r.discipline.name,
                "status": r.status,
                "notes": r.notes,
                "updated_at": r.updated_at,
            }
            for r in reviews
        ],
    }


@app.get("/changes/{change_id}/diff-image")
def get_diff_image(change_id: int, db: Session = Depends(get_db)):
    event = db.query(ChangeEvent).filter(ChangeEvent.id == change_id).first()
    if not event or not event.diff_image_path:
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(event.diff_image_path, media_type="image/png")


# ── Reviews ──────────────────────────────────────────────────────────

@app.put("/changes/{change_id}/reviews/{discipline_id}")
def update_review(
    change_id: int,
    discipline_id: int,
    body: ReviewUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.status not in ("pending", "reviewed", "flagged"):
        raise HTTPException(status_code=400, detail="Status must be pending, reviewed, or flagged")
    review = (
        db.query(Review)
        .filter(Review.change_event_id == change_id, Review.discipline_id == discipline_id)
        .first()
    )
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    review.status = body.status
    review.notes = body.notes
    db.commit()
    db.refresh(review)
    return {
        "id": review.id,
        "change_event_id": change_id,
        "discipline_id": discipline_id,
        "status": review.status,
        "notes": review.notes,
        "updated_at": review.updated_at,
    }


@app.get("/my-reviews")
def my_reviews(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not user.discipline_id:
        return []
    reviews = (
        db.query(Review)
        .filter(Review.discipline_id == user.discipline_id, Review.status == "pending")
        .all()
    )
    return [
        {
            "id": r.id,
            "change_event_id": r.change_event_id,
            "change_title": r.change_event.title,
            "project_id": r.change_event.project_id,
            "status": r.status,
            "notes": r.notes,
        }
        for r in reviews
    ]


# ── Disciplines ──────────────────────────────────────────────────────

@app.get("/disciplines", response_model=list[DisciplineOut])
def list_disciplines(db: Session = Depends(get_db)):
    return db.query(Discipline).all()


# ── Entrypoint ───────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
