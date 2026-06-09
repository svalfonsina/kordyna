from models import Discipline, SessionLocal


DEFAULTS = ["Landscape", "Civil", "Irrigation", "Contractor"]


def seed_disciplines() -> None:
    db = SessionLocal()
    try:
        if db.query(Discipline).count() == 0:
            for name in DEFAULTS:
                db.add(Discipline(name=name))
            db.commit()
    finally:
        db.close()
