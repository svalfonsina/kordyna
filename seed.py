from models import Discipline, Document, Review, SessionLocal, User


# Canonical discipline list, in display order.
DEFAULTS = [
    "Architecture",
    "Landscape Architecture",
    "Civil Engineering",
    "Mechanical",
    "Structural",
    "Survey",
    "Contractor",
]

# Old name -> new name (applied before adding/removing).
RENAMES = {
    "Civil": "Civil Engineering",
    "MEP Engineering": "Mechanical",
    "Landscape": "Landscape Architecture",
}


def seed_disciplines() -> None:
    db = SessionLocal()
    try:
        # 1. Renames
        for old, new in RENAMES.items():
            d = db.query(Discipline).filter(Discipline.name == old).first()
            if d and not db.query(Discipline).filter(Discipline.name == new).first():
                d.name = new

        # 2. Add any missing canonical disciplines
        existing = {d.name for d in db.query(Discipline).all()}
        for name in DEFAULTS:
            if name not in existing:
                db.add(Discipline(name=name))
        db.flush()

        # 3. Remove non-canonical disciplines when nothing depends on them
        #    (their auto-assigned reviews are removed too; documents or
        #    users keep a discipline alive).
        for d in db.query(Discipline).all():
            if d.name in DEFAULTS:
                continue
            has_docs = db.query(Document).filter(Document.discipline_id == d.id).first()
            has_users = db.query(User).filter(User.discipline_id == d.id).first()
            if has_docs or has_users:
                continue
            db.query(Review).filter(Review.discipline_id == d.id).delete()
            db.delete(d)

        db.commit()
    finally:
        db.close()
