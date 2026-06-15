import os
from datetime import datetime, timedelta

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import func, inspect, text
from sqlalchemy.orm import Session

import diff_engine
from models import (
    Base,
    ChangeEvent,
    Discipline,
    Document,
    Message,
    Project,
    ProjectMember,
    Review,
    SessionLocal,
    User,
    engine,
)
from seed import DEFAULTS as DISCIPLINE_ORDER, seed_disciplines

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

# Point UPLOAD_DIR at a persistent volume in production (e.g. /data/uploads
# on Railway) — the default lands on the ephemeral container disk and is
# wiped on every redeploy.
UPLOAD_DIR = os.getenv(
    "UPLOAD_DIR",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads"),
)

app = FastAPI(title="Kordyna", version="1.0.0")

Base.metadata.create_all(bind=engine)


def ensure_user_columns() -> None:
    """create_all() never alters existing tables, so add profile columns
    to the users table on databases that predate them (SQLite + Postgres
    both support ALTER TABLE ADD COLUMN)."""
    existing = {c["name"] for c in inspect(engine).get_columns("users")}
    additions = {
        "full_name": "VARCHAR(200)",
        "email": "VARCHAR(200)",
        "phone": "VARCHAR(50)",
        "company": "VARCHAR(200)",
        "avatar_path": "VARCHAR(500)",
    }
    with engine.begin() as conn:
        for name, ddl in additions.items():
            if name not in existing:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {name} {ddl}"))


ensure_user_columns()
seed_disciplines()

app.mount("/static", StaticFiles(directory="static"), name="static")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.get("/", response_class=HTMLResponse)
def landing():
    with open("static/landing.html") as f:
        return f.read()


@app.get("/app", response_class=HTMLResponse)
def app_page():
    with open("static/index.html", encoding="utf-8") as f:
        return HTMLResponse(f.read(), headers={"Cache-Control": "no-cache"})

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

    member_disc_ids = {m.discipline_id for m in db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()}
    all_disc_ids = [d.id for d in db.query(Discipline).all()]
    discipline_ids = list(member_disc_ids) if member_disc_ids else all_disc_ids
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
            "creator": e.creator.username if e.creator else None,
            "reviews_total": len(e.reviews),
            "reviews_done": sum(1 for r in e.reviews if r.status == "reviewed"),
            "reviews_flagged": sum(1 for r in e.reviews if r.status == "flagged"),
        }
        for e in events
    ]


@app.get("/projects/{project_id}/summary")
def project_summary(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    change_ids = [cid for (cid,) in db.query(ChangeEvent.id).filter(ChangeEvent.project_id == project_id).all()]
    pending = flagged = reviewed = 0
    if change_ids:
        rows = (
            db.query(Review.status, func.count(Review.id))
            .filter(Review.change_event_id.in_(change_ids))
            .group_by(Review.status)
            .all()
        )
        counts = {status: n for status, n in rows}
        pending = counts.get("pending", 0)
        flagged = counts.get("flagged", 0)
        reviewed = counts.get("reviewed", 0)
    docs = (
        db.query(func.count(func.distinct(Document.title)))
        .filter(Document.project_id == project_id)
        .scalar()
        or 0
    )
    total = pending + flagged + reviewed
    confidence = 100 if total == 0 else max(0, round(reviewed / total * 100) - flagged * 5)
    return {
        "changes": len(change_ids),
        "documents": docs,
        "reviews_pending": pending,
        "reviews_flagged": flagged,
        "reviews_total": total,
        "confidence": confidence,
    }


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
    if not os.path.exists(event.diff_image_path):
        raise HTTPException(status_code=404, detail="File no longer available on server")
    return FileResponse(event.diff_image_path, media_type="image/png")


@app.delete("/changes/{change_id}", status_code=204)
def delete_change(change_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    event = db.query(ChangeEvent).filter(ChangeEvent.id == change_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Change not found")
    if event.diff_image_path and os.path.exists(event.diff_image_path):
        os.remove(event.diff_image_path)
    db.query(Review).filter(Review.change_event_id == change_id).delete()
    db.delete(event)
    db.commit()


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

def serialize_me(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "discipline": user.discipline.name if user.discipline else None,
        "discipline_id": user.discipline_id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "company": user.company,
        "avatar_url": f"/users/{user.id}/avatar" if user.avatar_path else None,
        "created_at": user.created_at,
    }


class ProfileUpdate(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    company: str | None = None
    discipline_id: int | None = None


@app.get("/me")
def me(user: User = Depends(get_current_user)):
    return serialize_me(user)


@app.put("/me")
def update_me(body: ProfileUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if body.discipline_id is not None:
        if not db.query(Discipline).filter(Discipline.id == body.discipline_id).first():
            raise HTTPException(status_code=400, detail="Unknown discipline")
        user.discipline_id = body.discipline_id
    user.full_name = (body.full_name or "").strip() or None
    user.email = (body.email or "").strip() or None
    user.phone = (body.phone or "").strip() or None
    user.company = (body.company or "").strip() or None
    db.commit()
    db.refresh(user)
    return serialize_me(user)


@app.post("/me/avatar")
async def upload_avatar(file: UploadFile = File(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    ext = os.path.splitext(file.filename or "avatar.png")[1].lower()
    if ext not in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
        raise HTTPException(status_code=400, detail="Please choose a PNG, JPG, WEBP, or GIF image")
    import uuid
    stored_name = f"avatar_{uuid.uuid4().hex[:12]}{ext}"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    path = os.path.join(UPLOAD_DIR, stored_name)
    content = await file.read()
    with open(path, "wb") as f:
        f.write(content)
    # remove the previous avatar file if any
    if user.avatar_path and os.path.exists(user.avatar_path):
        try:
            os.remove(user.avatar_path)
        except OSError:
            pass
    user.avatar_path = path
    db.commit()
    db.refresh(user)
    return serialize_me(user)


@app.delete("/me/avatar")
def remove_avatar(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user.avatar_path and os.path.exists(user.avatar_path):
        try:
            os.remove(user.avatar_path)
        except OSError:
            pass
    user.avatar_path = None
    db.commit()
    db.refresh(user)
    return serialize_me(user)


@app.get("/users/{user_id}/avatar")
def get_avatar(user_id: int, db: Session = Depends(get_db)):
    u = db.query(User).filter(User.id == user_id).first()
    if not u or not u.avatar_path or not os.path.exists(u.avatar_path):
        raise HTTPException(status_code=404, detail="No avatar")
    ext = os.path.splitext(u.avatar_path)[1].lower()
    media = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif"}
    return FileResponse(u.avatar_path, media_type=media.get(ext, "application/octet-stream"), content_disposition_type="inline")


@app.get("/notifications")
def notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = []

    if user.discipline_id:
        pending = (
            db.query(Review)
            .filter(Review.discipline_id == user.discipline_id, Review.status == "pending")
            .order_by(Review.updated_at.desc())
            .limit(10)
            .all()
        )
        for r in pending:
            items.append({
                "type": "review",
                "text": f'Review requested: "{r.change_event.title}"',
                "project_id": r.change_event.project_id,
                "change_id": r.change_event_id,
                "at": r.change_event.created_at,
            })

    flagged = (
        db.query(Review)
        .filter(Review.status == "flagged")
        .order_by(Review.updated_at.desc())
        .limit(10)
        .all()
    )
    for r in flagged:
        items.append({
            "type": "conflict",
            "text": f'{r.discipline.name} flagged a conflict on "{r.change_event.title}"',
            "project_id": r.change_event.project_id,
            "change_id": r.change_event_id,
            "at": r.updated_at,
        })

    changes = db.query(ChangeEvent).order_by(ChangeEvent.created_at.desc()).limit(10).all()
    for c in changes:
        who = c.creator.username if c.creator else "Someone"
        items.append({
            "type": "change",
            "text": f'{who} uploaded "{c.title}" — {c.region_count} change regions',
            "project_id": c.project_id,
            "change_id": c.id,
            "at": c.created_at,
        })

    docs = db.query(Document).order_by(Document.created_at.desc()).limit(10).all()
    for d in docs:
        who = d.uploader.username if d.uploader else "Someone"
        items.append({
            "type": "document",
            "text": f'{who} uploaded {d.title} (Rev {d.revision})',
            "project_id": d.project_id,
            "change_id": None,
            "at": d.created_at,
        })

    items.sort(key=lambda i: i["at"] or datetime.min, reverse=True)
    return items[:15]


@app.get("/disciplines", response_model=list[DisciplineOut])
def list_disciplines(db: Session = Depends(get_db)):
    order = {name: i for i, name in enumerate(DISCIPLINE_ORDER)}
    discs = db.query(Discipline).all()
    return sorted(discs, key=lambda d: order.get(d.name, len(order)))


# ── Messages ────────────────────────────────────────────────────────

class MessageCreate(BaseModel):
    content: str
    project_id: int | None = None


@app.post("/messages", status_code=201)
def send_message(body: MessageCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    msg = Message(content=body.content, user_id=user.id, project_id=body.project_id)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {
        "id": msg.id,
        "content": msg.content,
        "user_id": msg.user_id,
        "username": user.username,
        "project_id": msg.project_id,
        "created_at": msg.created_at,
    }


@app.get("/messages")
def get_messages(
    project_id: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Message)
    if project_id is not None:
        q = q.filter(Message.project_id == project_id)
    else:
        q = q.filter(Message.project_id.is_(None))
    messages = q.order_by(Message.created_at.asc()).limit(200).all()
    return [
        {
            "id": m.id,
            "content": m.content,
            "user_id": m.user_id,
            "username": m.user.username,
            "project_id": m.project_id,
            "created_at": m.created_at,
        }
        for m in messages
    ]


# ── Impact Map Data ─────────────────────────────────────────────────

@app.get("/projects/{project_id}/impact-map")
def get_impact_map(project_id: int, change_id: int | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    disciplines = db.query(Discipline).all()
    changes = db.query(ChangeEvent).filter(ChangeEvent.project_id == project_id).order_by(ChangeEvent.created_at.desc()).all()

    target_change = None
    if change_id:
        target_change = db.query(ChangeEvent).filter(ChangeEvent.id == change_id).first()
    elif changes:
        target_change = changes[0]

    nodes = []
    reviews_data = []

    if target_change:
        reviews = db.query(Review).filter(Review.change_event_id == target_change.id).all()
        reviewed_disc_ids = {r.discipline_id for r in reviews}
        reviews_data = [
            {
                "discipline_id": r.discipline_id,
                "discipline": r.discipline.name,
                "status": r.status,
                "notes": r.notes,
            }
            for r in reviews
        ]

        for d in disciplines:
            if d.id in reviewed_disc_ids:
                review = next(r for r in reviews if r.discipline_id == d.id)
                impact = "direct"
                nodes.append({"id": d.id, "name": d.name, "impact": impact, "review_status": review.status})
            else:
                nodes.append({"id": d.id, "name": d.name, "impact": "none", "review_status": None})
    else:
        for d in disciplines:
            nodes.append({"id": d.id, "name": d.name, "impact": "none", "review_status": None})

    direct_count = sum(1 for n in nodes if n["impact"] == "direct")
    indirect_count = sum(1 for n in nodes if n["impact"] == "indirect")
    none_count = sum(1 for n in nodes if n["impact"] == "none")
    reviewed_count = sum(1 for r in reviews_data if r["status"] == "reviewed")

    return {
        "project": {"id": project.id, "name": project.name},
        "change_event": {
            "id": target_change.id,
            "title": target_change.title,
            "created_at": target_change.created_at,
            "region_count": target_change.region_count,
            "diff_image": f"/changes/{target_change.id}/diff-image",
        } if target_change else None,
        "nodes": nodes,
        "reviews": reviews_data,
        "summary": {
            "direct": direct_count,
            "indirect": indirect_count,
            "none": none_count,
            "reviewed": reviewed_count,
            "total_reviews": len(reviews_data),
        },
        "changes": [
            {"id": c.id, "title": c.title, "created_at": c.created_at}
            for c in changes
        ],
    }


# ── Documents / Archive ─────────────────────────────────────────────

ALLOWED_DOC_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".dwg", ".dxf"}


@app.post("/projects/{project_id}/documents", status_code=201)
async def upload_document(
    project_id: int,
    discipline_id: int,
    title: str,
    file: UploadFile = File(...),
    notes: str | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    disc = db.query(Discipline).filter(Discipline.id == discipline_id).first()
    if not disc:
        raise HTTPException(status_code=404, detail="Discipline not found")

    existing = (
        db.query(Document)
        .filter(
            Document.project_id == project_id,
            Document.discipline_id == discipline_id,
            Document.title == title,
        )
        .order_by(Document.revision.desc())
        .first()
    )
    next_rev = (existing.revision + 1) if existing else 1

    import uuid
    ext = os.path.splitext(file.filename or "file.pdf")[1].lower()
    stored_name = f"doc_{uuid.uuid4().hex[:12]}{ext}"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(UPLOAD_DIR, stored_name)

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    doc = Document(
        project_id=project_id,
        discipline_id=discipline_id,
        title=title,
        filename=file.filename or "file",
        file_path=file_path,
        revision=next_rev,
        uploaded_by=user.id,
        notes=notes,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {
        "id": doc.id,
        "project_id": project_id,
        "discipline_id": discipline_id,
        "discipline": disc.name,
        "title": doc.title,
        "filename": doc.filename,
        "revision": doc.revision,
        "notes": doc.notes,
        "created_at": doc.created_at,
    }


@app.get("/projects/{project_id}/documents")
def list_documents(
    project_id: int,
    discipline_id: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Document).filter(Document.project_id == project_id)
    if discipline_id is not None:
        q = q.filter(Document.discipline_id == discipline_id)
    docs = q.order_by(Document.title, Document.revision.desc()).all()
    return [
        {
            "id": d.id,
            "title": d.title,
            "filename": d.filename,
            "discipline_id": d.discipline_id,
            "discipline": d.discipline.name,
            "revision": d.revision,
            "notes": d.notes,
            "uploaded_by": d.uploader.username,
            "created_at": d.created_at,
        }
        for d in docs
    ]


@app.get("/documents/{doc_id}/file")
def get_document_file(doc_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc or not doc.file_path:
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File no longer available on server")
    ext = os.path.splitext(doc.file_path)[1].lower()
    media_types = {
        ".pdf": "application/pdf",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".tiff": "image/tiff",
    }
    return FileResponse(
        doc.file_path,
        media_type=media_types.get(ext, "application/octet-stream"),
        filename=doc.filename,
        content_disposition_type="inline",
    )


@app.get("/projects/{project_id}/documents/history")
def document_history(
    project_id: int,
    title: str,
    discipline_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    docs = (
        db.query(Document)
        .filter(
            Document.project_id == project_id,
            Document.discipline_id == discipline_id,
            Document.title == title,
        )
        .order_by(Document.revision.desc())
        .all()
    )
    return [
        {
            "id": d.id,
            "title": d.title,
            "filename": d.filename,
            "revision": d.revision,
            "notes": d.notes,
            "uploaded_by": d.uploader.username,
            "created_at": d.created_at,
        }
        for d in docs
    ]


@app.delete("/documents/{doc_id}", status_code=204)
def delete_document(doc_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
    db.delete(doc)
    db.commit()


# ── Entrypoint ───────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
