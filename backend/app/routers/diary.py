# Staj defteri endpoint'leri — LLM destekli akademik metin dönüştürme
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.auth_utils import get_current_user, require_role
from app.database import get_db
from app.models import DiaryEntry, LLMProcessingStatus, User, UserRole
from app.schemas import DiaryCreate, DiaryResponse

router = APIRouter(prefix="/diary", tags=["diary"])


def _run_llm(db_factory, entry_id: int):
    """Arka planda LLM işlemini çalıştırır (sync background task)."""
    from app.database import SessionLocal
    from app.services.llm_service import ham_metni_akademik_yap

    db = SessionLocal()
    try:
        entry = db.query(DiaryEntry).filter(DiaryEntry.id == entry_id).first()
        if not entry:
            return
        try:
            akademik = ham_metni_akademik_yap(entry.ham_metin or "")
            entry.akademik_metin = akademik
            entry.llm_isleme_durumu = LLMProcessingStatus.tamamlandi
        except Exception as e:
            entry.llm_isleme_durumu = LLMProcessingStatus.hata
            entry.akademik_metin = f"[Hata: {e}]"
        db.commit()
    finally:
        db.close()


@router.get("", response_model=list[DiaryResponse])
def list_diary(
    internship_id: int = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(DiaryEntry)
    if current_user.role == UserRole.student:
        q = q.filter(DiaryEntry.student_id == current_user.id)
    elif current_user.role == UserRole.teacher:
        pass  # öğretmen tüm girişleri görebilir
    else:
        q = q.filter(DiaryEntry.student_id == current_user.id)
    if internship_id:
        q = q.filter(DiaryEntry.internship_id == internship_id)
    return q.order_by(DiaryEntry.tarih.desc()).all()


@router.post("", response_model=DiaryResponse, status_code=201)
def create_diary_entry(
    body: DiaryCreate,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    entry = DiaryEntry(
        student_id=current_user.id,
        internship_id=body.internship_id,
        tarih=body.tarih,
        ham_metin=body.ham_metin,
        llm_isleme_durumu=LLMProcessingStatus.bekliyor,  # başlangıç: bekliyor ama işlem yok
        onaylandi=False,
    )
    # NOT: LLM işlemi otomatik başlatılmaz, kullanıcı "AI ile Genişlet"e basınca başlar
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/{entry_id}", response_model=DiaryResponse)
def get_diary_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = db.query(DiaryEntry).filter(DiaryEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Giriş bulunamadı")
    if current_user.role == UserRole.student and entry.student_id != current_user.id:
        raise HTTPException(403, "Bu girişi görme yetkiniz yok")
    return entry


@router.post("/{entry_id}/process-llm", status_code=202)
async def process_llm(
    entry_id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    entry = db.query(DiaryEntry).filter(DiaryEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Giriş bulunamadı")
    if entry.student_id != current_user.id:
        raise HTTPException(403, "Bu girişi işleme yetkiniz yok")
    if not entry.ham_metin:
        raise HTTPException(400, "Ham metin boş")
    background_tasks.add_task(_run_llm, None, entry_id)
    entry.llm_isleme_durumu = LLMProcessingStatus.bekliyor
    db.commit()
    return {"detail": "LLM işlemi kuyruğa alındı", "entry_id": entry_id}


@router.put("/{entry_id}/approve", response_model=DiaryResponse)
def approve_entry(
    entry_id: int,
    current_user: User = Depends(require_role(UserRole.teacher)),
    db: Session = Depends(get_db),
):
    entry = db.query(DiaryEntry).filter(DiaryEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Giriş bulunamadı")
    entry.onaylandi = True
    db.commit()
    db.refresh(entry)
    return entry
