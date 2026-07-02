import os
import random
import smtplib
from email.message import EmailMessage
from datetime import date, datetime, timedelta

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import func, inspect, or_, text
from sqlalchemy.orm import Session

import diff_engine
from models import (
    ActivityEvent,
    Base,
    ChangeEvent,
    Collaborator,
    Company,
    Discipline,
    Document,
    DocumentFolder,
    Invitation,
    Message,
    OpsPriority,
    OpsSite,
    Project,
    ProjectMember,
    Review,
    SessionLocal,
    SupportRequest,
    Task,
    Team,
    TeamMembership,
    User,
    engine,
)
from seed import DEFAULTS as DISCIPLINE_ORDER, seed_disciplines

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30  # 30 days

# Point UPLOAD_DIR at a persistent volume in production (e.g. /data/uploads
# on Railway) — the default lands on the ephemeral container disk and is
# wiped on every redeploy.
UPLOAD_DIR = os.getenv(
    "UPLOAD_DIR",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads"),
)

app = FastAPI(title="Kordyna", version="1.0.0")

Base.metadata.create_all(bind=engine)


def _add_missing_columns(table: str, cols: dict) -> None:
    """create_all() never alters existing tables, so add new columns
    in place (SQLite + Postgres both support ALTER TABLE ADD COLUMN)."""
    existing = {c["name"] for c in inspect(engine).get_columns(table)}
    with engine.begin() as conn:
        for name, ddl in cols.items():
            if name not in existing:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))


def run_migrations() -> None:
    _add_missing_columns("users", {
        "full_name": "VARCHAR(200)",
        "email": "VARCHAR(200)",
        "phone": "VARCHAR(50)",
        "company": "VARCHAR(200)",
        "avatar_path": "VARCHAR(500)",
        "company_id": "INTEGER",
        "role": "VARCHAR(40)",
        "is_verified": "BOOLEAN",
        "verification_code": "VARCHAR(12)",
        "verification_expires": "TIMESTAMP",
    })
    _add_missing_columns("projects", {"company_id": "INTEGER", "archived": "BOOLEAN DEFAULT FALSE"})
    _add_missing_columns("documents", {"folder_id": "INTEGER"})
    _add_missing_columns("ops_sites", {"location": "VARCHAR(300)", "notes": "TEXT"})
    _add_missing_columns("change_events", {"folder_id": "INTEGER"})


def ensure_default_company() -> None:
    """One shared company: every user and project belongs to it, so the
    whole team collaborates in the same workspace."""
    db = SessionLocal()
    try:
        company = db.query(Company).order_by(Company.id).first()
        if not company:
            company = Company(name=os.getenv("COMPANY_NAME", "Kordyna"))
            db.add(company)
            db.commit()
            db.refresh(company)
        # Backfill any users/projects that predate companies.
        for u in db.query(User).filter(User.company_id.is_(None)).all():
            u.company_id = company.id
            if not u.role:
                u.role = "contributor"
        for p in db.query(Project).filter(Project.company_id.is_(None)).all():
            p.company_id = company.id
        # Make the earliest account the company admin if none is set yet.
        if not db.query(User).filter(User.role == "company_admin").first():
            first = db.query(User).order_by(User.id).first()
            if first:
                first.role = "company_admin"
        db.commit()
    finally:
        db.close()


def ensure_activity_backfill() -> None:
    """Seed the audit log once from existing changes and documents so the
    activity history isn't blank for projects that predate logging."""
    db = SessionLocal()
    try:
        if db.query(ActivityEvent.id).first():
            return
        for c in db.query(ChangeEvent).all():
            creator = db.query(User).filter(User.id == c.created_by).first()
            db.add(ActivityEvent(
                company_id=creator.company_id if creator else None,
                project_id=c.project_id, actor_id=c.created_by,
                verb="created", object_type="change", object_label=c.title,
                created_at=c.created_at,
            ))
        for d in db.query(Document).all():
            uploader = db.query(User).filter(User.id == d.uploaded_by).first()
            db.add(ActivityEvent(
                company_id=uploader.company_id if uploader else None,
                project_id=d.project_id, actor_id=d.uploaded_by,
                verb="uploaded", object_type="document",
                object_label=f"{d.title} (Rev {d.revision})",
                created_at=d.created_at,
            ))
        db.commit()
    finally:
        db.close()


def ensure_ops_seed() -> None:
    """Seed the Landscape Operations page once so it starts with the same
    content it shipped with — now real, editable rows instead of mock data."""
    db = SessionLocal()
    try:
        if db.query(OpsPriority.id).first() or db.query(OpsSite.id).first():
            return
        company = db.query(Company).order_by(Company.id).first()
        cid = company.id if company else None
        priorities = [
            dict(location="Lot 14", project="Lakeside Mixed Use", issue="Needs Water",
                 detail="Last watered 6 days ago", severity="high", due="Due today",
                 action="Mark Watered", last_watered="6 days ago", last_inspection="8 days ago",
                 team="Maintenance", risk="High",
                 notes="Plant material showing signs of drought stress. Irrigation line near front bed may be clogged."),
            dict(location="Nursery Area A", project="Oak Ridge", issue="Inspection Due",
                 detail="Nursery stock check required", severity="medium", due="Due today",
                 action="Complete Inspection", last_watered="2 days ago", last_inspection="14 days ago",
                 team="Nursery Crew", risk="Medium",
                 notes="Quarterly nursery stock inspection due. Verify plant counts and check for pest activity."),
            dict(location="Irrigation Zone 3", project="Lakeside Mixed Use", issue="Possible Line Clog",
                 detail="Low pressure reported near front beds", severity="high", due="Review today",
                 action="View Issue", last_watered="1 day ago", last_inspection="3 days ago",
                 team="Irrigation", risk="High",
                 notes="Low pressure reported near front beds. Possible clog in the main supply line — needs on-site diagnosis."),
        ]
        for p in priorities:
            db.add(OpsPriority(company_id=cid, **p))
        sites = [
            dict(name="Lakeside Mixed Use", open_count=8, status="Needs Attention"),
            dict(name="Riverfront Townhomes", open_count=4, status="On Track"),
            dict(name="Oak Ridge", open_count=7, status="Needs Attention"),
            dict(name="Town Center", open_count=2, status="On Track"),
        ]
        for s in sites:
            db.add(OpsSite(company_id=cid, **s))
        db.commit()
    finally:
        db.close()


run_migrations()
ensure_default_company()
ensure_activity_backfill()
ensure_ops_seed()
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


# Signed, short-lived URLs for file access — issued only after a permission
# check, so <img>/<iframe> tags (which can't send auth headers) stay private.
def create_file_token(kind: str, obj_id: int) -> str:
    expire = datetime.utcnow() + timedelta(hours=24)
    return jwt.encode({"typ": kind, "id": obj_id, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def file_token_ok(token: str | None, kind: str, obj_id: int) -> bool:
    if not token:
        return False
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("typ") == kind and int(payload.get("id")) == obj_id
    except (JWTError, KeyError, ValueError, TypeError):
        return False


def user_from_bearer(authorization: str | None, db: Session) -> User | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    raw = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(raw, SECRET_KEY, algorithms=[ALGORITHM])
        return db.query(User).filter(User.id == int(payload["sub"])).first()
    except (JWTError, KeyError, ValueError):
        return None


def require_project_in_company(project_id: int, user: User, db: Session) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.company_id is not None and project.company_id != user.company_id:
        raise HTTPException(status_code=403, detail="Not authorized for this project")
    return project


def log_event(db: Session, actor: User | None, verb: str, object_type: str, label: str | None, project_id: int | None = None) -> None:
    """Record an audit event. Added to the session; the caller commits."""
    db.add(ActivityEvent(
        company_id=actor.company_id if actor else None,
        project_id=project_id,
        actor_id=actor.id if actor else None,
        verb=verb,
        object_type=object_type,
        object_label=label,
    ))


def event_text(actor_name: str, e: ActivityEvent) -> str:
    label = e.object_label or ""
    v, o = e.verb, e.object_type
    if v == "uploaded":
        return f"{actor_name} uploaded {label}"
    if v == "deleted":
        return f"{actor_name} deleted {o} {label}".rstrip()
    if v == "renamed":
        return f"{actor_name} renamed a project to {label}"
    if v == "archived":
        return f"{actor_name} archived project {label}"
    if v == "restored":
        return f"{actor_name} restored project {label}"
    if v == "completed_review":
        return f"{actor_name} completed {label} review"
    if v == "flagged_conflict":
        return f"{actor_name} flagged a conflict on {label}"
    if v == "completed_task":
        return f"{actor_name} completed task {label}"
    if v == "added_collaborator":
        return f"{actor_name} added a collaborator: {label}"
    if v == "created":
        article = {"change": "change", "task": "task", "project": "project"}.get(o, o)
        return f"{actor_name} created {article} {label}"
    return f"{actor_name} {v} {label}".strip()


def serialize_event(e: ActivityEvent) -> dict:
    actor_name = (e.actor.full_name or e.actor.username) if e.actor else "Someone"
    return {
        "id": e.id,
        "type": e.object_type,
        "verb": e.verb,
        "label": e.object_label,
        "project_id": e.project_id,
        "at": e.created_at,
        "text": event_text(actor_name, e),
    }


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
    first_name: str
    last_name: str
    password: str
    email: str
    discipline_id: int | None = None

class VerifyRequest(BaseModel):
    username: str
    code: str

class ResendRequest(BaseModel):
    username: str

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

def _gen_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def send_verification_email(to_email: str, code: str) -> str:
    """Email a verification code via SMTP (settings from env). Returns '' on
    success, or a short non-sensitive reason on failure so the caller can fall
    back to demo mode (show the code) and report what went wrong."""
    host = os.getenv("SMTP_HOST")
    if not host:
        return "not_configured"
    if not to_email:
        return "no_recipient"
    try:
        port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER")
        smtp_pass = os.getenv("SMTP_PASS")
        sender = os.getenv("SMTP_FROM") or smtp_user or "no-reply@kordyna.com"
        msg = EmailMessage()
        msg["Subject"] = "Your Kordyna verification code"
        msg["From"] = sender
        msg["To"] = to_email
        msg.set_content(f"Welcome to Kordyna.\n\nYour verification code is: {code}\n\nIt expires in 15 minutes.")
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.ehlo()
            try:
                server.starttls()
                server.ehlo()
            except smtplib.SMTPException:
                pass  # server may not support STARTTLS
            if smtp_user and smtp_pass:
                server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        return ""
    except Exception as e:
        return f"{type(e).__name__}: {str(e)[:140]}"


@app.post("/auth/register", response_model=TokenResponse)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    email = (body.email or "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
    # Email is the login identifier (stored as username too for uniqueness).
    if db.query(User).filter(
        or_(func.lower(User.username) == email.lower(), func.lower(User.email) == email.lower())
    ).first():
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    full_name = f"{body.first_name.strip()} {body.last_name.strip()}".strip()
    # One shared company: new accounts join it and collaborate immediately.
    company = db.query(Company).order_by(Company.id).first()
    # Email verification is disabled for now — sign new accounts straight in.
    user = User(
        username=email,
        full_name=full_name or None,
        hashed_password=pwd_context.hash(body.password),
        email=email,
        discipline_id=body.discipline_id,
        company_id=company.id if company else None,
        role="contributor",
        is_verified=True,
    )
    db.add(user)
    # Accept any pending invite for this email.
    if body.email:
        db.query(Invitation).filter(
            func.lower(Invitation.email) == body.email.strip().lower(),
            Invitation.status == "pending",
        ).update({Invitation.status: "accepted"}, synchronize_session=False)
    db.commit()
    db.refresh(user)
    return TokenResponse(access_token=create_token(user.id))


@app.post("/auth/verify", response_model=TokenResponse)
def verify_email(body: VerifyRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")
    if user.is_verified:
        return TokenResponse(access_token=create_token(user.id))
    if not user.verification_code or user.verification_code != body.code.strip():
        raise HTTPException(status_code=400, detail="Invalid code")
    if user.verification_expires and datetime.utcnow() > user.verification_expires:
        raise HTTPException(status_code=400, detail="Code expired — request a new one")
    user.is_verified = True
    user.verification_code = None
    user.verification_expires = None
    db.commit()
    return TokenResponse(access_token=create_token(user.id))


@app.post("/auth/resend")
def resend_code(body: ResendRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")
    if user.is_verified:
        return {"status": "already_verified"}
    code = _gen_code()
    user.verification_code = code
    user.verification_expires = datetime.utcnow() + timedelta(minutes=15)
    db.commit()
    reason = send_verification_email(user.email, code)
    resp = {"status": "verification_sent"}
    if reason:
        resp["demo_code"] = code
        resp["email_status"] = reason
    return resp


@app.post("/auth/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # New accounts log in with email; legacy accounts may use their old username.
    ident = (form.username or "").strip()
    user = db.query(User).filter(
        or_(func.lower(User.username) == ident.lower(), func.lower(User.email) == ident.lower())
    ).first()
    if not user or not pwd_context.verify(form.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Bad credentials")
    # Email verification is disabled for now — no is_verified gate on login.
    return TokenResponse(access_token=create_token(user.id))


# ── Projects ─────────────────────────────────────────────────────────

@app.post("/projects", response_model=ProjectOut, status_code=201)
def create_project(body: ProjectCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = Project(name=body.name, description=body.description, owner_id=user.id, company_id=user.company_id)
    db.add(project)
    db.flush()
    log_event(db, user, "created", "project", project.name, project.id)
    db.commit()
    db.refresh(project)
    return project


@app.get("/projects", response_model=list[ProjectOut])
def list_projects(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Projects are shared across the company so the whole team collaborates.
    # Archived projects are hidden but not deleted.
    return (
        db.query(Project)
        .filter(Project.company_id == user.company_id, Project.archived.isnot(True))
        .order_by(Project.created_at)
        .all()
    )


@app.get("/projects/archived", response_model=list[ProjectOut])
def list_archived_projects(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(Project)
        .filter(Project.company_id == user.company_id, Project.archived.is_(True))
        .order_by(Project.created_at.desc())
        .all()
    )


@app.put("/projects/{project_id}/archive", response_model=ProjectOut)
def archive_project(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = require_project_in_company(project_id, user, db)
    project.archived = True
    log_event(db, user, "archived", "project", project.name, project_id)
    db.commit()
    db.refresh(project)
    return project


@app.put("/projects/{project_id}/restore", response_model=ProjectOut)
def restore_project(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = require_project_in_company(project_id, user, db)
    project.archived = False
    log_event(db, user, "restored", "project", project.name, project_id)
    db.commit()
    db.refresh(project)
    return project


@app.get("/projects/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


class ProjectUpdate(BaseModel):
    name: str
    description: str | None = None


@app.put("/projects/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, body: ProjectUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    project.name = name
    if body.description is not None:
        project.description = body.description.strip() or None
    log_event(db, user, "renamed", "project", name, project.id)
    db.commit()
    db.refresh(project)
    return project


@app.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Remove dependent rows and any files they own, so no orphans remain.
    changes = db.query(ChangeEvent).filter(ChangeEvent.project_id == project_id).all()
    for c in changes:
        if c.diff_image_path and os.path.exists(c.diff_image_path):
            try:
                os.remove(c.diff_image_path)
            except OSError:
                pass
        db.query(Review).filter(Review.change_event_id == c.id).delete()
        db.delete(c)

    for d in db.query(Document).filter(Document.project_id == project_id).all():
        if d.file_path and os.path.exists(d.file_path):
            try:
                os.remove(d.file_path)
            except OSError:
                pass
        db.delete(d)

    db.query(ProjectMember).filter(ProjectMember.project_id == project_id).delete()
    db.query(Message).filter(Message.project_id == project_id).delete()
    db.query(Task).filter(Task.project_id == project_id).delete()
    db.query(ActivityEvent).filter(ActivityEvent.project_id == project_id).delete()
    project_name = project.name
    db.delete(project)
    log_event(db, user, "deleted", "project", project_name, project_id=None)
    db.commit()


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
    folder_id: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if folder_id is not None:
        folder = db.query(DocumentFolder).filter(
            DocumentFolder.id == folder_id, DocumentFolder.project_id == project_id
        ).first()
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found for this project")

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
        folder_id=folder_id,
    )
    db.add(event)
    db.flush()

    member_disc_ids = {m.discipline_id for m in db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()}
    all_disc_ids = [d.id for d in db.query(Discipline).all()]
    discipline_ids = list(member_disc_ids) if member_disc_ids else all_disc_ids
    for did in discipline_ids:
        db.add(Review(change_event_id=event.id, discipline_id=did, status="pending"))

    log_event(db, user, "created", "change", event.title, project_id)
    db.commit()
    db.refresh(event)

    return {
        "id": event.id,
        "title": event.title,
        "region_count": result["region_count"],
        "regions": result["regions"],
        "diff_image": f"/changes/{event.id}/diff-image",
        "reviews_created": len(discipline_ids),
        "folder_id": event.folder_id,
    }


@app.get("/projects/{project_id}/changes")
def list_changes(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    events = db.query(ChangeEvent).filter(ChangeEvent.project_id == project_id).order_by(ChangeEvent.created_at.desc()).all()
    folders = {f.id: f.name for f in db.query(DocumentFolder).filter(DocumentFolder.project_id == project_id).all()}
    return [
        {
            "id": e.id,
            "title": e.title,
            "region_count": e.region_count,
            "created_at": e.created_at,
            "diff_image": f"/changes/{e.id}/diff-image?token={create_file_token('diff', e.id)}",
            "creator": (e.creator.full_name or e.creator.username) if e.creator else None,
            "folder_id": e.folder_id,
            "folder": folders.get(e.folder_id),
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
        "diff_image": f"/changes/{event.id}/diff-image?token={create_file_token('diff', event.id)}",
        "folder_id": event.folder_id,
        "folder": (db.query(DocumentFolder.name).filter(DocumentFolder.id == event.folder_id).scalar() if event.folder_id else None),
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
def get_diff_image(change_id: int, token: str | None = None, authorization: str | None = Header(None), db: Session = Depends(get_db)):
    event = db.query(ChangeEvent).filter(ChangeEvent.id == change_id).first()
    if not event or not event.diff_image_path:
        raise HTTPException(status_code=404, detail="Image not found")
    authorized = file_token_ok(token, "diff", change_id)
    if not authorized:
        u = user_from_bearer(authorization, db)
        authorized = bool(u and event.project and event.project.company_id == u.company_id)
    if not authorized:
        raise HTTPException(status_code=401, detail="Not authorized")
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
    title = event.title
    proj_id = event.project_id
    db.delete(event)
    log_event(db, user, "deleted", "change", title, proj_id)
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
    if user.discipline_id != review.discipline_id:
        raise HTTPException(status_code=403, detail="Only members of this discipline can update its review")
    review.status = body.status
    review.notes = body.notes
    if body.status in ("reviewed", "flagged"):
        ce = db.query(ChangeEvent).filter(ChangeEvent.id == change_id).first()
        label = f"{review.discipline.name} · CE-{change_id}"
        if body.status == "reviewed":
            log_event(db, user, "completed_review", "review", label, ce.project_id if ce else None)
        else:
            log_event(db, user, "flagged_conflict", "review", label, ce.project_id if ce else None)
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


@app.get("/my-activity")
def my_activity(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """The signed-in user's own actions from the audit log, newest first."""
    events = (
        db.query(ActivityEvent)
        .filter(ActivityEvent.actor_id == user.id)
        .order_by(ActivityEvent.created_at.desc())
        .limit(30)
        .all()
    )
    return [serialize_event(e) for e in events]


@app.get("/projects/{project_id}/activity")
def project_activity(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Project-wide audit log, newest first."""
    require_project_in_company(project_id, user, db)
    events = (
        db.query(ActivityEvent)
        .filter(ActivityEvent.project_id == project_id)
        .order_by(ActivityEvent.created_at.desc())
        .limit(50)
        .all()
    )
    return [serialize_event(e) for e in events]


# ── Tasks / Schedule ─────────────────────────────────────────────────

TASK_STATUSES = ("complete", "on_track", "at_risk", "delayed")


class TaskCreate(BaseModel):
    title: str
    discipline_id: int | None = None
    assignee_id: int | None = None
    start_date: date | None = None
    due_date: date | None = None
    status: str = "on_track"


class TaskUpdate(BaseModel):
    title: str | None = None
    discipline_id: int | None = None
    assignee_id: int | None = None
    start_date: date | None = None
    due_date: date | None = None
    status: str | None = None


def serialize_task(t: Task) -> dict:
    return {
        "id": t.id,
        "project_id": t.project_id,
        "title": t.title,
        "discipline_id": t.discipline_id,
        "discipline": t.discipline.name if t.discipline else None,
        "assignee_id": t.assignee_id,
        "assignee": (t.assignee.full_name or t.assignee.username) if t.assignee else None,
        "start_date": t.start_date.isoformat() if t.start_date else None,
        "due_date": t.due_date.isoformat() if t.due_date else None,
        "status": t.status,
    }


@app.get("/projects/{project_id}/tasks")
def list_tasks(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.project_id == project_id).order_by(Task.start_date, Task.id).all()
    return [serialize_task(t) for t in tasks]


@app.post("/projects/{project_id}/tasks", status_code=201)
def create_task(project_id: int, body: TaskCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    status = body.status if body.status in TASK_STATUSES else "on_track"
    task = Task(
        project_id=project_id,
        title=body.title.strip(),
        discipline_id=body.discipline_id,
        assignee_id=body.assignee_id,
        start_date=body.start_date,
        due_date=body.due_date,
        status=status,
        created_by=user.id,
    )
    db.add(task)
    db.flush()
    log_event(db, user, "created", "task", task.title, project_id)
    db.commit()
    db.refresh(task)
    return serialize_task(task)


@app.put("/tasks/{task_id}")
def update_task(task_id: int, body: TaskUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if body.title is not None:
        task.title = body.title.strip()
    if body.discipline_id is not None:
        task.discipline_id = body.discipline_id
    if body.assignee_id is not None:
        task.assignee_id = body.assignee_id
    if body.start_date is not None:
        task.start_date = body.start_date
    if body.due_date is not None:
        task.due_date = body.due_date
    if body.status is not None and body.status in TASK_STATUSES:
        became_complete = body.status == "complete" and task.status != "complete"
        task.status = body.status
        if became_complete:
            log_event(db, user, "completed_task", "task", task.title, task.project_id)
    db.commit()
    db.refresh(task)
    return serialize_task(task)


@app.delete("/tasks/{task_id}", status_code=204)
def delete_task(task_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    title = task.title
    proj_id = task.project_id
    db.delete(task)
    log_event(db, user, "deleted", "task", title, proj_id)
    db.commit()


@app.get("/my-tasks")
def my_tasks(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = (
        db.query(Task)
        .filter(Task.assignee_id == user.id, Task.status != "complete")
        .order_by(Task.due_date, Task.id)
        .all()
    )
    return [serialize_task(t) for t in tasks]


@app.get("/workspace/summary")
def workspace_summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Everything the Home dashboard needs in one round trip: pending reviews
    by discipline, my task buckets, schedule items due, project health, and
    the company-wide activity feed."""
    today = date.today()
    week_end = today + timedelta(days=7)
    projects = (
        db.query(Project)
        .filter(Project.company_id == user.company_id, Project.archived.isnot(True))
        .order_by(Project.created_at)
        .all()
    )
    pids = [p.id for p in projects]

    pending_rows, review_items, flagged_by_project = [], [], {}
    if pids:
        pending_rows = (
            db.query(Discipline.name, func.count(Review.id))
            .join(Review, Review.discipline_id == Discipline.id)
            .join(ChangeEvent, Review.change_event_id == ChangeEvent.id)
            .filter(ChangeEvent.project_id.in_(pids), Review.status == "pending")
            .group_by(Discipline.name)
            .order_by(func.count(Review.id).desc())
            .all()
        )
        review_items = (
            db.query(Review)
            .join(ChangeEvent, Review.change_event_id == ChangeEvent.id)
            .filter(ChangeEvent.project_id.in_(pids), Review.status == "pending")
            .order_by(Review.updated_at.desc())
            .limit(20)
            .all()
        )
        flagged_by_project = dict(
            db.query(ChangeEvent.project_id, func.count(Review.id))
            .join(Review, Review.change_event_id == ChangeEvent.id)
            .filter(ChangeEvent.project_id.in_(pids), Review.status == "flagged")
            .group_by(ChangeEvent.project_id)
            .all()
        )

    my_open = db.query(Task).filter(Task.assignee_id == user.id, Task.status != "complete").all()
    company_tasks = (
        db.query(Task).filter(Task.project_id.in_(pids), Task.status != "complete").all() if pids else []
    )
    due_soon = [t for t in company_tasks if t.due_date and t.due_date <= week_end]

    def buckets(tasks):
        return {
            "total": len(tasks),
            "due_today": sum(1 for t in tasks if t.due_date == today),
            "due_this_week": sum(1 for t in tasks if t.due_date and today < t.due_date <= week_end),
            "overdue": sum(1 for t in tasks if t.due_date and t.due_date < today),
        }

    tasks_by_project = {}
    for t in company_tasks:
        tasks_by_project.setdefault(t.project_id, []).append(t)

    def project_status(p):
        ts = tasks_by_project.get(p.id, [])
        if any(t.status == "delayed" or (t.due_date and t.due_date < today) for t in ts):
            return "delayed"
        if flagged_by_project.get(p.id) or any(t.status == "at_risk" for t in ts):
            return "at_risk"
        return "on_track"

    activity = (
        db.query(ActivityEvent)
        .filter(ActivityEvent.company_id == user.company_id)
        .order_by(ActivityEvent.created_at.desc())
        .limit(8)
        .all()
    )

    def task_item(t):
        return {"id": t.id, "title": t.title, "project_id": t.project_id, "due_date": t.due_date, "status": t.status}

    return {
        "reviews": {
            "total": sum(n for _, n in pending_rows),
            "by_discipline": [{"discipline": d, "count": n} for d, n in pending_rows],
            "items": [
                {
                    "change_id": r.change_event_id,
                    "change_title": r.change_event.title,
                    "project_id": r.change_event.project_id,
                    "discipline": r.discipline.name if r.discipline else None,
                }
                for r in review_items
            ],
        },
        "my_tasks": {
            **buckets(my_open),
            "items": [task_item(t) for t in sorted(my_open, key=lambda t: (t.due_date is None, t.due_date or today))[:20]],
        },
        "schedule": {
            **buckets(due_soon),
            "items": [task_item(t) for t in sorted(due_soon, key=lambda t: t.due_date)[:20]],
        },
        "projects": [{"id": p.id, "name": p.name, "status": project_status(p)} for p in projects],
        "activity": [serialize_event(e) for e in activity],
    }


@app.get("/company/members")
def company_members(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    members = db.query(User).filter(User.company_id == user.company_id).order_by(User.id).all()
    return [
        {
            "id": m.id,
            "name": m.full_name or m.username,
            "discipline": m.discipline.name if m.discipline else None,
        }
        for m in members
    ]


# ── Team ─────────────────────────────────────────────────────────────

class InviteRequest(BaseModel):
    email: str
    name: str | None = None
    discipline_id: int | None = None


def send_invite_email(to_email: str, inviter: str, company_name: str) -> bool:
    host = os.getenv("SMTP_HOST")
    if not host or not to_email:
        return False
    try:
        port = int(os.getenv("SMTP_PORT", "587"))
        smtp_user = os.getenv("SMTP_USER")
        smtp_pass = os.getenv("SMTP_PASS")
        sender = os.getenv("SMTP_FROM") or smtp_user or "no-reply@kordyna.com"
        msg = EmailMessage()
        msg["Subject"] = f"{inviter} invited you to {company_name} on Kordyna"
        msg["From"] = sender
        msg["To"] = to_email
        msg.set_content(
            f"{inviter} has invited you to join {company_name} on Kordyna.\n\n"
            f"Create your account here: https://www.kordyna.com/app\n\n"
            f"You'll verify your email with a code during signup."
        )
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.ehlo()
            try:
                server.starttls(); server.ehlo()
            except smtplib.SMTPException:
                pass
            if smtp_user and smtp_pass:
                server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        return True
    except Exception:
        return False


@app.get("/team")
def get_team(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    members = db.query(User).filter(User.company_id == user.company_id).order_by(User.id).all()
    invites = (
        db.query(Invitation)
        .filter(Invitation.company_id == user.company_id, Invitation.status == "pending")
        .order_by(Invitation.created_at.desc())
        .all()
    )
    return {
        "members": [
            {
                "id": m.id,
                "name": m.full_name or m.username,
                "email": m.email,
                "discipline": m.discipline.name if m.discipline else None,
                "discipline_id": m.discipline_id,
                "role": m.role,
                "is_you": m.id == user.id,
            }
            for m in members
        ],
        "invites": [
            {
                "id": iv.id,
                "email": iv.email,
                "name": iv.name,
                "discipline": iv.discipline.name if iv.discipline else None,
                "created_at": iv.created_at,
            }
            for iv in invites
        ],
    }


@app.post("/team/invite", status_code=201)
def invite_member(body: InviteRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    email = (body.email or "").strip().lower()
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="A valid email is required")
    existing_user = db.query(User).filter(func.lower(User.email) == email, User.company_id == user.company_id).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="That person is already on your team")
    if db.query(Invitation).filter(func.lower(Invitation.email) == email, Invitation.company_id == user.company_id, Invitation.status == "pending").first():
        raise HTTPException(status_code=400, detail="An invite is already pending for that email")
    inv = Invitation(
        company_id=user.company_id,
        email=email,
        name=body.name,
        discipline_id=body.discipline_id,
        invited_by=user.id,
        status="pending",
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    company = db.query(Company).filter(Company.id == user.company_id).first()
    sent = send_invite_email(email, user.full_name or user.username, company.name if company else "Kordyna")
    resp = {"id": inv.id, "email": inv.email, "status": "invited"}
    if not sent:
        # SMTP not configured — surface the signup link so you can share it manually.
        resp["demo_link"] = "https://www.kordyna.com/app"
    return resp


@app.delete("/team/invite/{invite_id}")
def cancel_invite(invite_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Invitation).filter(Invitation.id == invite_id, Invitation.company_id == user.company_id).delete()
    db.commit()
    return {"ok": True}


# ── Collaborators ────────────────────────────────────────────────────

COLLAB_TYPES = {"project", "document", "change"}


def _collab_object(db: Session, object_type: str, object_id: int):
    """Resolve a collaborator target to (object, display_label)."""
    if object_type == "project":
        o = db.query(Project).filter(Project.id == object_id).first()
        return o, (o.name if o else None)
    if object_type == "document":
        o = db.query(Document).filter(Document.id == object_id).first()
        return o, (o.title if o else None)
    if object_type == "change":
        o = db.query(ChangeEvent).filter(ChangeEvent.id == object_id).first()
        return o, (o.title if o else None)
    return None, None


def _collab_project_id(obj, object_type: str):
    if object_type == "project":
        return obj.id
    return getattr(obj, "project_id", None)


def _collab_owner_id(db: Session, obj, object_type: str):
    """The project owner controls collaborators for the project and for
    everything inside it (its documents and change events)."""
    if object_type == "project":
        return obj.owner_id
    pid = getattr(obj, "project_id", None)
    if pid is None:
        return None
    proj = db.query(Project).filter(Project.id == pid).first()
    return proj.owner_id if proj else None


class CollaboratorAdd(BaseModel):
    user_id: int


@app.get("/collaborators/{object_type}/{object_id}")
def list_collaborators(object_type: str, object_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if object_type not in COLLAB_TYPES:
        raise HTTPException(status_code=400, detail="Invalid object type")
    rows = (
        db.query(Collaborator)
        .filter(Collaborator.object_type == object_type, Collaborator.object_id == object_id)
        .order_by(Collaborator.created_at)
        .all()
    )
    out = []
    for c in rows:
        u = c.user
        if not u:
            continue
        out.append({
            "user_id": u.id,
            "name": u.full_name or u.username,
            "discipline": u.discipline.name if u.discipline else None,
            "added_at": c.created_at,
        })
    return out


@app.post("/collaborators/{object_type}/{object_id}", status_code=201)
def add_collaborator(object_type: str, object_id: int, body: CollaboratorAdd, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if object_type not in COLLAB_TYPES:
        raise HTTPException(status_code=400, detail="Invalid object type")
    obj, label = _collab_object(db, object_type, object_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Object not found")
    owner_id = _collab_owner_id(db, obj, object_type)
    if owner_id is not None and owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can add collaborators")
    target = db.query(User).filter(User.id == body.user_id, User.company_id == user.company_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    existing = (
        db.query(Collaborator)
        .filter(
            Collaborator.object_type == object_type,
            Collaborator.object_id == object_id,
            Collaborator.user_id == body.user_id,
        )
        .first()
    )
    if existing:
        return {"ok": True, "already": True}
    db.add(Collaborator(object_type=object_type, object_id=object_id, user_id=body.user_id, added_by=user.id))
    db.add(ActivityEvent(
        company_id=user.company_id,
        project_id=_collab_project_id(obj, object_type),
        actor_id=user.id,
        verb="added_collaborator",
        object_type=object_type,
        object_label=f"{target.full_name or target.username} → {label}",
    ))
    db.commit()
    return {"ok": True}


@app.delete("/collaborators/{object_type}/{object_id}/{collab_user_id}")
def remove_collaborator(object_type: str, object_id: int, collab_user_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    obj, _ = _collab_object(db, object_type, object_id)
    if obj is not None:
        owner_id = _collab_owner_id(db, obj, object_type)
        if owner_id is not None and owner_id != user.id:
            raise HTTPException(status_code=403, detail="Only the project owner can manage collaborators")
    db.query(Collaborator).filter(
        Collaborator.object_type == object_type,
        Collaborator.object_id == object_id,
        Collaborator.user_id == collab_user_id,
    ).delete()
    db.commit()
    return {"ok": True}


# ── Landscape Operations ─────────────────────────────────────────────

class OpsPriorityIn(BaseModel):
    location: str
    project: str | None = None
    issue: str | None = None
    detail: str | None = None
    severity: str = "medium"
    due: str | None = None
    action: str | None = None
    last_watered: str | None = None
    last_inspection: str | None = None
    team: str | None = None
    risk: str | None = None
    notes: str | None = None


class OpsSiteIn(BaseModel):
    name: str
    location: str | None = None
    open_count: int = 0
    status: str = "On Track"
    notes: str | None = None


def serialize_ops_priority(p: OpsPriority) -> dict:
    return {
        "id": p.id, "location": p.location, "project": p.project, "issue": p.issue,
        "detail": p.detail, "severity": p.severity, "due": p.due, "action": p.action,
        "lastWatered": p.last_watered, "lastInspection": p.last_inspection,
        "team": p.team, "risk": p.risk, "notes": p.notes,
    }


def serialize_ops_site(s: OpsSite) -> dict:
    return {"id": s.id, "name": s.name, "location": s.location, "open": s.open_count, "status": s.status, "notes": s.notes}


@app.get("/ops/priorities")
def list_ops_priorities(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(OpsPriority).filter(OpsPriority.company_id == user.company_id).order_by(OpsPriority.id).all()
    return [serialize_ops_priority(p) for p in rows]


@app.post("/ops/priorities", status_code=201)
def create_ops_priority(body: OpsPriorityIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = OpsPriority(company_id=user.company_id, **body.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return serialize_ops_priority(p)


@app.put("/ops/priorities/{item_id}")
def update_ops_priority(item_id: int, body: OpsPriorityIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(OpsPriority).filter(OpsPriority.id == item_id, OpsPriority.company_id == user.company_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Priority not found")
    for k, v in body.model_dump().items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return serialize_ops_priority(p)


@app.delete("/ops/priorities/{item_id}")
def delete_ops_priority(item_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(OpsPriority).filter(OpsPriority.id == item_id, OpsPriority.company_id == user.company_id).delete()
    db.commit()
    return {"ok": True}


@app.get("/ops/sites")
def list_ops_sites(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(OpsSite).filter(OpsSite.company_id == user.company_id).order_by(OpsSite.id).all()
    return [serialize_ops_site(s) for s in rows]


@app.post("/ops/sites", status_code=201)
def create_ops_site(body: OpsSiteIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = OpsSite(company_id=user.company_id, name=body.name, location=body.location, open_count=body.open_count, status=body.status, notes=body.notes)
    db.add(s)
    db.commit()
    db.refresh(s)
    return serialize_ops_site(s)


@app.put("/ops/sites/{item_id}")
def update_ops_site(item_id: int, body: OpsSiteIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    s = db.query(OpsSite).filter(OpsSite.id == item_id, OpsSite.company_id == user.company_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Site not found")
    s.name = body.name
    s.location = body.location
    s.open_count = body.open_count
    s.status = body.status
    s.notes = body.notes
    db.commit()
    db.refresh(s)
    return serialize_ops_site(s)


@app.delete("/ops/sites/{item_id}")
def delete_ops_site(item_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(OpsSite).filter(OpsSite.id == item_id, OpsSite.company_id == user.company_id).delete()
    db.commit()
    return {"ok": True}


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
        "company_name": user.company_ref.name if user.company_ref else None,
        "role": user.role,
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


@app.post("/support")
async def submit_support(
    what_happened: str = Form(...),
    desired_fix: str = Form(""),
    file: UploadFile | None = File(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not (what_happened or "").strip():
        raise HTTPException(status_code=400, detail="Please describe what happened")
    screenshot_path = None
    if file and file.filename:
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
            raise HTTPException(status_code=400, detail="Screenshot must be a PNG, JPG, WEBP, or GIF image")
        import uuid
        stored_name = f"support_{uuid.uuid4().hex[:12]}{ext}"
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        screenshot_path = os.path.join(UPLOAD_DIR, stored_name)
        content = await file.read()
        with open(screenshot_path, "wb") as f:
            f.write(content)
    req = SupportRequest(
        user_id=user.id,
        what_happened=what_happened.strip(),
        desired_fix=(desired_fix or "").strip() or None,
        screenshot_path=screenshot_path,
    )
    db.add(req)
    db.commit()
    return {"status": "received"}


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
        who = (c.creator.full_name or c.creator.username) if c.creator else "Someone"
        items.append({
            "type": "change",
            "text": f'{who} uploaded "{c.title}" — {c.region_count} change regions',
            "project_id": c.project_id,
            "change_id": c.id,
            "at": c.created_at,
        })

    docs = db.query(Document).order_by(Document.created_at.desc()).limit(10).all()
    for d in docs:
        who = (d.uploader.full_name or d.uploader.username) if d.uploader else "Someone"
        items.append({
            "type": "document",
            "text": f'{who} uploaded {d.title} (Rev {d.revision})',
            "project_id": d.project_id,
            "change_id": None,
            "at": d.created_at,
        })

    # Schedule notifications: tasks the user is assigned to (tagged on).
    my_tasks = (
        db.query(Task)
        .filter(Task.assignee_id == user.id, Task.status != "complete")
        .order_by(Task.created_at.desc())
        .limit(10)
        .all()
    )
    for t in my_tasks:
        due = f" — due {t.due_date.isoformat()}" if t.due_date else ""
        items.append({
            "type": "task",
            "text": f'You were assigned to "{t.title}"{due}',
            "project_id": t.project_id,
            "change_id": None,
            "at": t.created_at,
        })

    # Collaborations: objects you've been explicitly added to follow.
    my_collabs = (
        db.query(Collaborator)
        .filter(Collaborator.user_id == user.id)
        .order_by(Collaborator.created_at.desc())
        .limit(10)
        .all()
    )
    for c in my_collabs:
        obj, label = _collab_object(db, c.object_type, c.object_id)
        if not label:
            continue
        items.append({
            "type": "collaborator",
            "text": f'You were added as a collaborator on "{label}"',
            "project_id": _collab_project_id(obj, c.object_type) if obj else None,
            "change_id": c.object_id if c.object_type == "change" else None,
            "at": c.created_at,
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
    folder_id: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    disc = db.query(Discipline).filter(Discipline.id == discipline_id).first()
    if not disc:
        raise HTTPException(status_code=404, detail="Discipline not found")
    if folder_id is not None:
        folder = db.query(DocumentFolder).filter(
            DocumentFolder.id == folder_id,
            DocumentFolder.project_id == project_id,
            DocumentFolder.discipline_id == discipline_id,
        ).first()
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found for this discipline")

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
    # New revisions stay in the same folder unless a folder was specified.
    if folder_id is None and existing is not None:
        folder_id = existing.folder_id

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
        folder_id=folder_id,
    )
    db.add(doc)
    db.flush()
    log_event(db, user, "uploaded", "document", f"{doc.title} (Rev {doc.revision})", project_id)
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
        "folder_id": doc.folder_id,
        "created_at": doc.created_at,
    }


@app.get("/projects/{project_id}/documents")
def list_documents(
    project_id: int,
    discipline_id: int | None = None,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_project_in_company(project_id, user, db)
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
            "uploaded_by": d.uploader.full_name or d.uploader.username,
            "created_at": d.created_at,
            "folder_id": d.folder_id,
            "file_url": f"/documents/{d.id}/file?token={create_file_token('doc', d.id)}",
        }
        for d in docs
    ]


# ── Document Folders ─────────────────────────────────────────────────

class FolderIn(BaseModel):
    discipline_id: int
    name: str


class FolderRename(BaseModel):
    name: str


class DocFolderMove(BaseModel):
    folder_id: int | None = None


def _serialize_folder(f: DocumentFolder) -> dict:
    return {"id": f.id, "project_id": f.project_id, "discipline_id": f.discipline_id, "name": f.name}


@app.get("/projects/{project_id}/folders")
def list_folders(project_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_project_in_company(project_id, user, db)
    rows = db.query(DocumentFolder).filter(DocumentFolder.project_id == project_id).order_by(DocumentFolder.name).all()
    return [_serialize_folder(f) for f in rows]


@app.post("/projects/{project_id}/folders", status_code=201)
def create_folder(project_id: int, body: FolderIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    require_project_in_company(project_id, user, db)
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Folder name required")
    if not db.query(Discipline).filter(Discipline.id == body.discipline_id).first():
        raise HTTPException(status_code=404, detail="Discipline not found")
    f = DocumentFolder(project_id=project_id, discipline_id=body.discipline_id, name=name)
    db.add(f)
    db.commit()
    db.refresh(f)
    return _serialize_folder(f)


@app.put("/folders/{folder_id}")
def rename_folder(folder_id: int, body: FolderRename, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    f = db.query(DocumentFolder).filter(DocumentFolder.id == folder_id).first()
    if not f:
        raise HTTPException(status_code=404, detail="Folder not found")
    require_project_in_company(f.project_id, user, db)
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Folder name required")
    f.name = name
    db.commit()
    return _serialize_folder(f)


@app.delete("/folders/{folder_id}")
def delete_folder(folder_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    f = db.query(DocumentFolder).filter(DocumentFolder.id == folder_id).first()
    if not f:
        return {"ok": True}
    require_project_in_company(f.project_id, user, db)
    # Documents in a deleted folder fall back to loose (folder_id = NULL).
    db.query(Document).filter(Document.folder_id == folder_id).update({Document.folder_id: None})
    db.delete(f)
    db.commit()
    return {"ok": True}


@app.put("/documents/{doc_id}/folder")
def move_document(doc_id: int, body: DocFolderMove, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    require_project_in_company(doc.project_id, user, db)
    if body.folder_id is not None:
        folder = db.query(DocumentFolder).filter(
            DocumentFolder.id == body.folder_id,
            DocumentFolder.project_id == doc.project_id,
            DocumentFolder.discipline_id == doc.discipline_id,
        ).first()
        if not folder:
            raise HTTPException(status_code=404, detail="Folder not found for this discipline")
    # Move every revision of this document together.
    db.query(Document).filter(
        Document.project_id == doc.project_id,
        Document.discipline_id == doc.discipline_id,
        Document.title == doc.title,
    ).update({Document.folder_id: body.folder_id})
    db.commit()
    return {"ok": True}


@app.get("/documents/{doc_id}/file")
def get_document_file(doc_id: int, token: str | None = None, authorization: str | None = Header(None), db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc or not doc.file_path:
        raise HTTPException(status_code=404, detail="Document not found")
    # Authorize: a signed file token, or a logged-in user in the same company.
    authorized = file_token_ok(token, "doc", doc_id)
    if not authorized:
        u = user_from_bearer(authorization, db)
        authorized = bool(u and doc.project and doc.project.company_id == u.company_id)
    if not authorized:
        raise HTTPException(status_code=401, detail="Not authorized")
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
    # CAD/Revit files can't render in a browser — serve them as a download so
    # the OS opens them in the associated desktop app (AutoCAD / Revit).
    cad_revit = {".dwg", ".dxf", ".rvt", ".rfa", ".rte", ".rft", ".nwd", ".nwc"}
    disposition = "attachment" if ext in cad_revit else "inline"
    return FileResponse(
        doc.file_path,
        media_type=media_types.get(ext, "application/octet-stream"),
        filename=doc.filename,
        content_disposition_type=disposition,
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
            "uploaded_by": d.uploader.full_name or d.uploader.username,
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
    label = f"{doc.title} (Rev {doc.revision})"
    proj_id = doc.project_id
    db.delete(doc)
    log_event(db, user, "deleted", "document", label, proj_id)
    db.commit()


# ── Entrypoint ───────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
