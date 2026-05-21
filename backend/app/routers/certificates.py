# Sertifika endpoint'leri
import re
from fastapi import APIRouter, Body, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth_utils import get_current_user, require_role
from app.database import get_db
from app.models import Certificate, User, UserRole
from app.schemas import CertificateResponse

router = APIRouter(prefix="/certificates", tags=["certificates"])


@router.get("/me", response_model=list[CertificateResponse])
def my_certificates(
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    return db.query(Certificate).filter(Certificate.student_id == current_user.id).all()


@router.post("/upload", status_code=201)
async def upload_certificate(
    veren_kurum: str = "diger",
    dosya: UploadFile = File(...),
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    mime = dosya.content_type
    dosya_bytes = await dosya.read()

    # ── Diğer ────────────────────────────────────────────────────
    if veren_kurum != "btk":
        if mime not in {"image/png", "image/jpeg", "image/jpg", "application/pdf"}:
            raise HTTPException(400, "Desteklenen formatlar: PNG, JPG, PDF")
        cert = Certificate(
            student_id=current_user.id,
            ad=dosya.filename or "Sertifika",
            veren_kurum="diger",
            dogrulanmis=False,
            ocr_skoru=0.0,
        )
        db.add(cert); db.commit(); db.refresh(cert)
        return {"id": cert.id, "veren_kurum": "diger", "dogrulanmis": False,
                "manuel_gerekli": False, "ocr": None, "dogrulama": None}

    # ── BTK: sadece PDF ──────────────────────────────────────────
    if mime != "application/pdf":
        raise HTTPException(400, "BTK sertifikası sadece PDF formatında yüklenebilir")

    from app.services.ocr_service import btk_pdf_oku
    from app.services.btk_service import btk_dogrula

    # 1. PDF metin katmanını oku
    veri = btk_pdf_oku(dosya_bytes)
    if veri["hata"]:
        raise HTTPException(422, f"PDF okunamadı: {veri['hata']}")

    # 2. DB'ye kaydet (doğrulama sonucu sonra güncellenecek)
    cert = Certificate(
        student_id=current_user.id,
        ad=veri["kurs"] or "BTK Sertifikası",
        veren_kurum="btk",
        dogrulanmis=False,
        ocr_skoru=0.0,
        ocr_metin=f"cert_no:{veri['cert_no']}\nisim:{veri['isim']}\nkurs:{veri['kurs']}\ntarih:{veri['tarih']}",
    )
    db.add(cert); db.commit(); db.refresh(cert)

    ocr_ozet = {"cert_no": veri["cert_no"], "isim": veri["isim"],
                "kurs": veri["kurs"], "tarih": veri["tarih"]}

    # 3. BTK sitesinde doğrula
    sonuc = await btk_dogrula(
        cert_no=veri["cert_no"],
        pdf_isim=veri["isim"],
        pdf_kurs=veri["kurs"],
        pdf_tarih=veri["tarih"],
    )

    if sonuc["bulunamadi"]:
        # URL bulunamadı → manuel ID iste
        return {"id": cert.id, "veren_kurum": "btk", "dogrulanmis": False,
                "manuel_gerekli": True, "ocr": ocr_ozet, "dogrulama": sonuc}

    # URL bulundu → sonucu kaydet
    cert.dogrulanmis = sonuc["basarili"]
    cert.ocr_skoru   = 1.0 if sonuc["basarili"] else 0.0

    if not sonuc["basarili"]:
        e = sonuc["eslesme"]
        nedenler = []
        if not e["isim"]:  nedenler.append("İsim eşleşmedi")
        if not e["kurs"]:  nedenler.append("Kurs adı eşleşmedi")
        if not e["tarih"]: nedenler.append("Tarih eşleşmedi")
        cert.ocr_metin += f"\nneden:{', '.join(nedenler)}"

    db.commit()

    return {"id": cert.id, "veren_kurum": "btk", "dogrulanmis": sonuc["basarili"],
            "manuel_gerekli": False, "ocr": ocr_ozet, "dogrulama": sonuc}


@router.post("/verify-manual", status_code=200)
async def verify_manual(
    sertifika_id: int = Body(...),
    cert_no: str      = Body(...),
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    cert = db.query(Certificate).filter(
        Certificate.id == sertifika_id,
        Certificate.student_id == current_user.id,
    ).first()
    if not cert:
        raise HTTPException(404, "Sertifika bulunamadı")

    # DB'deki OCR verilerini parse et
    def _al(alan, metin):
        m = re.search(rf'^{alan}:(.+)$', metin or "", re.MULTILINE)
        return m.group(1).strip() if m else ""

    ocr_metin = cert.ocr_metin or ""
    pdf_isim  = _al("isim",  ocr_metin)
    pdf_kurs  = _al("kurs",  ocr_metin)
    pdf_tarih = _al("tarih", ocr_metin)

    from app.services.btk_service import btk_dogrula
    sonuc = await btk_dogrula(
        cert_no=cert_no.strip(),
        pdf_isim=pdf_isim,
        pdf_kurs=pdf_kurs,
        pdf_tarih=pdf_tarih,
    )

    if sonuc["bulunamadi"]:
        # ID hatalı
        return {"dogrulanmis": False, "id_hatali": True,
                "eslesme": sonuc["eslesme"], "btk_veri": sonuc["btk_veri"],
                "hata": "Girilen ID ile BTK sisteminde sertifika bulunamadı."}

    cert.dogrulanmis = sonuc["basarili"]
    cert.ocr_skoru   = 1.0 if sonuc["basarili"] else 0.0

    if not sonuc["basarili"]:
        e = sonuc["eslesme"]
        nedenler = []
        if not e["isim"]:  nedenler.append("İsim eşleşmedi")
        if not e["kurs"]:  nedenler.append("Kurs adı eşleşmedi")
        if not e["tarih"]: nedenler.append("Tarih eşleşmedi")
        mevcut = cert.ocr_metin or ""
        if "neden:" not in mevcut:
            cert.ocr_metin = mevcut + f"\nneden:{', '.join(nedenler)}"

    db.commit()

    return {"dogrulanmis": sonuc["basarili"], "id_hatali": False,
            "eslesme": sonuc["eslesme"], "btk_veri": sonuc["btk_veri"], "hata": None}


@router.delete("/{certificate_id}", status_code=204)
def delete_certificate(
    certificate_id: int,
    current_user: User = Depends(require_role(UserRole.student)),
    db: Session = Depends(get_db),
):
    cert = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    if not cert:
        raise HTTPException(404, "Sertifika bulunamadı")
    if cert.student_id != current_user.id:
        raise HTTPException(403, "Bu sertifikayı silme yetkiniz yok")
    db.delete(cert); db.commit()
