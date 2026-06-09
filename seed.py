from models import Discipline, SessionLocal


DEFAULTS = [
    "Landscape",
    "Civil",
    "Irrigation",
    "Contractor",
    "Architecture",
    "Structural",
    "Survey",
    "MEP Engineering",
    "Traffic Engineering",
]


def seed_disciplines() -> None:
    db = SessionLocal()
    try:
        existing = {d.name for d in db.query(Discipline).all()}
        for name in DEFAULTS:
            if name not in existing:
                db.add(Discipline(name=name))
        db.commit()
    finally:
        db.close()
