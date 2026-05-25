# Proje + departman + departman-bazlı başvuru endpoint'leri
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func

from app.auth_utils import get_current_user
from app.database import get_db
from app.models import (
    DepartmentApplication, Group, GroupMembership,
    Project, ProjectDepartment, User,
)
from app.schemas import (
    DepartmentApplicationCreate, DepartmentApplicationDecision,
    DepartmentApplicationResponse, DepartmentCreate, DepartmentResponse,
    ProjectCreate, ProjectResponse, ProjectUpdate,
)

router = APIRouter(tags=["projects"])


# ---------- yardımcılar ----------------------------------------------------

def _membership(db: Session, group_id: int, user_id: int):
    return db.query(GroupMembership).filter(
        GroupMembership.group_id == group_id, GroupMembership.user_id == user_id
    ).first()


def _require_group_role(db: Session, group_id: int, user: User, roles: tuple[str, ...]):
    m = _membership(db, group_id, user.id)
    if not m or m.rol not in roles:
        raise HTTPException(403, "Bu işlem için yetkiniz yok")
    return m


def _dolu_sayisi(db: Session, department_id: int) -> int:
    return db.query(func.count(DepartmentApplication.id)).filter(
        DepartmentApplication.department_id == department_id,
        DepartmentApplication.durum == "kabul",
    ).scalar() or 0


def _project_response(p: Project, db: Session) -> ProjectResponse:
    resp = ProjectResponse.model_validate(p)
    for d_resp, d in zip(resp.departments, p.departments):
        d_resp.dolu_sayisi = _dolu_sayisi(db, d.id)
    return resp


# ---------- proje CRUD -----------------------------------------------------

@router.get("/groups/{group_id}/projects", response_model=list[ProjectResponse])
def list_group_projects(group_id: int, db: Session = Depends(get_db)):
    if not db.query(Group.id).filter(Group.id == group_id).first():
        raise HTTPException(404, "Grup bulunamadı")
    projects = db.query(Project).options(selectinload(Project.departments)).filter(
        Project.group_id == group_id
    ).order_by(Project.created_at.desc()).all()
    return [_project_response(p, db) for p in projects]


@router.post("/groups/{group_id}/projects", response_model=ProjectResponse, status_code=201)
def create_project(
    group_id: int, body: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not db.query(Group.id).filter(Group.id == group_id).first():
        raise HTTPException(404, "Grup bulunamadı")
    _require_group_role(db, group_id, current_user, ("owner", "moderator"))
    deps_data = body.departments
    p = Project(
        group_id=group_id, owner_id=current_user.id,
        **body.model_dump(exclude={"departments"}),
    )
    db.add(p)
    db.flush()
    for d in deps_data:
        db.add(ProjectDepartment(
            project_id=p.id, ad=d.ad, gereken_kisi=d.gereken_kisi,
            beklentiler=d.beklentiler, beceri_etiketleri=d.beceri_etiketleri or [],
        ))
    db.commit()
    db.refresh(p)
    return _project_response(p, db)


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    p = db.query(Project).options(selectinload(Project.departments)).filter(
        Project.id == project_id
    ).first()
    if not p:
        raise HTTPException(404, "Proje bulunamadı")
    return _project_response(p, db)


@router.put("/projects/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: int, body: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(Project).options(selectinload(Project.departments)).filter(
        Project.id == project_id
    ).first()
    if not p:
        raise HTTPException(404, "Proje bulunamadı")
    _require_group_role(db, p.group_id, current_user, ("owner", "moderator"))
    for f, v in body.model_dump(exclude_none=True).items():
        setattr(p, f, v)
    db.commit()
    db.refresh(p)
    return _project_response(p, db)


@router.delete("/projects/{project_id}", status_code=204)
def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(404, "Proje bulunamadı")
    _require_group_role(db, p.group_id, current_user, ("owner", "moderator"))
    db.delete(p)
    db.commit()


# ---------- departments ----------------------------------------------------

@router.post("/projects/{project_id}/departments", response_model=DepartmentResponse, status_code=201)
def add_department(
    project_id: int, body: DepartmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(404, "Proje bulunamadı")
    _require_group_role(db, p.group_id, current_user, ("owner", "moderator"))
    d = ProjectDepartment(
        project_id=project_id, ad=body.ad, gereken_kisi=body.gereken_kisi,
        beklentiler=body.beklentiler, beceri_etiketleri=body.beceri_etiketleri or [],
    )
    db.add(d)
    db.commit()
    db.refresh(d)
    resp = DepartmentResponse.model_validate(d)
    resp.dolu_sayisi = 0
    return resp


@router.delete("/departments/{department_id}", status_code=204)
def delete_department(
    department_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    d = db.query(ProjectDepartment).filter(ProjectDepartment.id == department_id).first()
    if not d:
        raise HTTPException(404, "Departman bulunamadı")
    p = db.query(Project).filter(Project.id == d.project_id).first()
    _require_group_role(db, p.group_id, current_user, ("owner", "moderator"))
    db.delete(d)
    db.commit()


# ---------- department applications ---------------------------------------

@router.post("/departments/{department_id}/apply", response_model=DepartmentApplicationResponse, status_code=201)
def apply_department(
    department_id: int, body: DepartmentApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    d = db.query(ProjectDepartment).filter(ProjectDepartment.id == department_id).first()
    if not d:
        raise HTTPException(404, "Departman bulunamadı")
    p = db.query(Project).filter(Project.id == d.project_id).first()
    if p.durum != "acik":
        raise HTTPException(400, "Proje başvuruya kapalı")
    if p.owner_id == current_user.id:
        raise HTTPException(400, "Kendi projenize başvuramazsınız")
    if _dolu_sayisi(db, department_id) >= d.gereken_kisi:
        raise HTTPException(400, "Departman dolu")
    mevcut = db.query(DepartmentApplication).filter(
        DepartmentApplication.department_id == department_id,
        DepartmentApplication.applicant_id == current_user.id,
    ).first()
    if mevcut:
        raise HTTPException(400, "Bu departmana zaten başvurdunuz")
    app = DepartmentApplication(
        department_id=department_id, applicant_id=current_user.id, mesaj=body.mesaj,
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    return app


@router.get("/projects/{project_id}/applications", response_model=list[DepartmentApplicationResponse])
def list_project_applications(
    project_id: int,
    durum: str | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(404, "Proje bulunamadı")
    _require_group_role(db, p.group_id, current_user, ("owner", "moderator"))
    dep_ids = [d.id for d in db.query(ProjectDepartment.id).filter(
        ProjectDepartment.project_id == project_id
    ).all()]
    qry = db.query(DepartmentApplication).options(
        selectinload(DepartmentApplication.applicant)
    ).filter(DepartmentApplication.department_id.in_(dep_ids))
    if durum:
        qry = qry.filter(DepartmentApplication.durum == durum)
    return qry.order_by(DepartmentApplication.created_at.desc()).all()


@router.put("/departments/{department_id}/applications/{app_id}", response_model=DepartmentApplicationResponse)
def decide_application(
    department_id: int, app_id: int, body: DepartmentApplicationDecision,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.durum not in ("kabul", "red"):
        raise HTTPException(400, "Geçersiz karar")
    d = db.query(ProjectDepartment).filter(ProjectDepartment.id == department_id).first()
    if not d:
        raise HTTPException(404, "Departman bulunamadı")
    p = db.query(Project).filter(Project.id == d.project_id).first()
    _require_group_role(db, p.group_id, current_user, ("owner", "moderator"))
    app = db.query(DepartmentApplication).filter(
        DepartmentApplication.id == app_id,
        DepartmentApplication.department_id == department_id,
    ).first()
    if not app:
        raise HTTPException(404, "Başvuru bulunamadı")
    app.durum = body.durum
    if body.durum == "kabul":
        if _dolu_sayisi(db, department_id) >= d.gereken_kisi:
            raise HTTPException(400, "Departman dolu")
        # Hem departmana kabul, hem gruba üye olarak ekle
        if not _membership(db, p.group_id, app.applicant_id):
            db.add(GroupMembership(
                group_id=p.group_id, user_id=app.applicant_id, rol="member",
            ))
    db.commit()
    db.refresh(app)
    return app


@router.get("/departments/{department_id}/applications/me", response_model=DepartmentApplicationResponse | None)
def my_application(
    department_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.query(DepartmentApplication).filter(
        DepartmentApplication.department_id == department_id,
        DepartmentApplication.applicant_id == current_user.id,
    ).first()
