import os
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./kordyna.db")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company")


class TeamMembership(Base):
    __tablename__ = "team_memberships"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(120), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    discipline_id = Column(Integer, ForeignKey("disciplines.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    full_name = Column(String(200), nullable=True)
    email = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)
    company = Column(String(200), nullable=True)
    avatar_path = Column(String(500), nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    role = Column(String(40), nullable=True)  # company_admin, project_manager, discipline_lead, contributor, viewer

    discipline = relationship("Discipline", back_populates="users")
    company_ref = relationship("Company")


class Discipline(Base):
    __tablename__ = "disciplines"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)

    users = relationship("User", back_populates="discipline")
    reviews = relationship("Review", back_populates="discipline")


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    archived = Column(Boolean, default=False)

    owner = relationship("User")
    changes = relationship("ChangeEvent", back_populates="project")
    members = relationship("ProjectMember", back_populates="project")


class ProjectMember(Base):
    __tablename__ = "project_members"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    discipline_id = Column(Integer, ForeignKey("disciplines.id"), nullable=False)

    project = relationship("Project", back_populates="members")
    discipline = relationship("Discipline")


class ChangeEvent(Base):
    __tablename__ = "change_events"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String(300), nullable=False)
    diff_image_path = Column(String(500), nullable=True)
    region_count = Column(Integer, default=0)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="changes")
    creator = relationship("User")
    reviews = relationship("Review", back_populates="change_event")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    change_event_id = Column(Integer, ForeignKey("change_events.id"), nullable=False)
    discipline_id = Column(Integer, ForeignKey("disciplines.id"), nullable=False)
    status = Column(
        Enum("pending", "reviewed", "flagged", name="review_status"),
        default="pending",
        nullable=False,
    )
    notes = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    change_event = relationship("ChangeEvent", back_populates="reviews")
    discipline = relationship("Discipline", back_populates="reviews")


class DocumentFolder(Base):
    """A named folder within a project's discipline section, so documents can
    be grouped into sub-projects under the main project."""
    __tablename__ = "document_folders"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    discipline_id = Column(Integer, ForeignKey("disciplines.id"), nullable=False)
    name = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    discipline_id = Column(Integer, ForeignKey("disciplines.id"), nullable=False)
    folder_id = Column(Integer, ForeignKey("document_folders.id"), nullable=True)
    title = Column(String(300), nullable=False)
    filename = Column(String(500), nullable=False)
    file_path = Column(String(500), nullable=False)
    revision = Column(Integer, default=1, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)

    project = relationship("Project")
    discipline = relationship("Discipline")
    uploader = relationship("User")


class Collaborator(Base):
    """A user explicitly added to view + get notified about an object
    (a project, document, or change event). Additive on top of the shared
    company workspace — it grants no exclusivity, only an explicit follow."""
    __tablename__ = "collaborators"

    id = Column(Integer, primary_key=True, index=True)
    object_type = Column(String(40), nullable=False, index=True)  # project, document, change
    object_id = Column(Integer, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    added_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", foreign_keys=[user_id])


class OpsPriority(Base):
    """A landscape-operations priority item (watering, inspection, issue).
    Company-scoped like projects so the whole team shares the same list."""
    __tablename__ = "ops_priorities"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    location = Column(String(200), nullable=False)
    project = Column(String(200), nullable=True)
    issue = Column(String(200), nullable=True)
    detail = Column(Text, nullable=True)
    severity = Column(String(20), default="medium")  # high, medium
    due = Column(String(80), nullable=True)
    action = Column(String(80), nullable=True)
    last_watered = Column(String(80), nullable=True)
    last_inspection = Column(String(80), nullable=True)
    team = Column(String(120), nullable=True)
    risk = Column(String(40), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class OpsSite(Base):
    __tablename__ = "ops_sites"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    name = Column(String(200), nullable=False)
    open_count = Column(Integer, default=0)
    status = Column(String(40), default="On Track")
    created_at = Column(DateTime, default=datetime.utcnow)


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    project = relationship("Project")


class ActivityEvent(Base):
    __tablename__ = "activity_events"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    verb = Column(String(40), nullable=False)         # uploaded, deleted, created, renamed, completed_review, flagged_conflict, completed_task
    object_type = Column(String(40), nullable=False)  # document, change, review, task, project
    object_label = Column(String(400), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    actor = relationship("User")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    title = Column(String(300), nullable=False)
    discipline_id = Column(Integer, ForeignKey("disciplines.id"), nullable=True)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    start_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    status = Column(String(20), default="on_track", nullable=False)  # complete, on_track, at_risk, delayed
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project")
    discipline = relationship("Discipline")
    assignee = relationship("User", foreign_keys=[assignee_id])
