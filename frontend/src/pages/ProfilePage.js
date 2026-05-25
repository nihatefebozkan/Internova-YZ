import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import btkIcon from "../assets/BTK_icon.jpg";

const ANALIZ_ADIMLARI = [
  { ikon: "🔗", metin: "GitHub repo bilgisi çekiliyor…" },
  { ikon: "📁", metin: "Bağımlılık dosyaları indiriliyor…" },
  { ikon: "👥", metin: "Katkıcılar ve commit geçmişi taranıyor…" },
  { ikon: "🤖", metin: "Yapay zeka mimari + kavramlar + radar üretiyor…" },
  { ikon: "📊", metin: "Skorlar ve eşleşmeler hesaplanıyor…" },
];

const SEVIYE_BADGE = {
  tutorial:   { ad: "Tutorial / Eğitim", bg: "bg-gray-100",   fg: "text-gray-600",   ikon: "📘" },
  personal:   { ad: "Kişisel proje",      bg: "bg-blue-50",    fg: "text-blue-700",   ikon: "👤" },
  production: { ad: "Üretim seviyesi",   bg: "bg-emerald-50", fg: "text-emerald-700", ikon: "🚀" },
};

// ── DETAY PANELİ ──────────────────────────────────────────────────
function DetayPaneli({ proje }) {
  const [tab, setTab] = useState("mimari");
  const [eslesenler, setEslesenler] = useState(null);
  const [eYukleniyor, setEYukleniyor] = useState(false);

  useEffect(() => {
    if (tab !== "eslesmeler" || eslesenler) return;
    setEYukleniyor(true);
    api.get(`/portfolio/projects/${proje.id}/eslesen-ilanlar`)
      .then(r => setEslesenler(r.data))
      .catch(() => setEslesenler({ staj_ilanlari: [], grup_projeleri: [] }))
      .finally(() => setEYukleniyor(false));
  }, [tab, proje.id, eslesenler]);

  const m = proje.mimari || {};
  const s = proje.saglik || {};
  const bk = proje.beceri_kategorileri || {};
  const sev = SEVIYE_BADGE[proje.seviye] || null;

  const tabs = [
    { k: "mimari",     l: "🏗 Mimari" },
    { k: "saglik",     l: "💚 Sağlık" },
    { k: "kavramlar",  l: "🧠 Kavramlar" },
    { k: "radar",      l: "📊 Radar" },
    { k: "eslesmeler", l: "🔗 Eşleşmeler" },
  ];

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      {/* Sekme bar */}
      <div className="flex gap-1 border-b border-gray-100 mb-3 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-3 py-2 text-[11px] font-bold border-b-2 transition-all whitespace-nowrap
              ${tab === t.k ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* MİMARİ */}
      {tab === "mimari" && (
        <div className="flex flex-col gap-2 text-[11px]">
          {sev && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-bold w-fit ${sev.bg} ${sev.fg}`}>
              {sev.ikon} {sev.ad}
            </div>
          )}
          {Object.keys(m).length === 0 ? (
            <p className="text-gray-400">Mimari bilgisi yok. Yeniden analiz et.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Mimari Tipi", m.tip],
                ["API", m.api],
                ["Render", m.render],
                ["Veritabanı", m.veritabani],
                ["Monorepo", m.monorepo ? "Evet" : "Hayır"],
                ["Test", m.test_var ? "Var" : "Yok"],
                ["CI/CD", m.ci_var ? "Var" : "Yok"],
                ["Docker", m.docker_var ? "Var" : "Yok"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg">
                  <span className="text-gray-500 font-semibold">{k}</span>
                  <span className="text-gray-900 font-bold">{v || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SAĞLIK */}
      {tab === "saglik" && (
        <div className="flex flex-col gap-2 text-[11px]">
          {s.aktif_mi !== undefined && (
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-bold w-fit
              ${s.aktif_mi ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
              {s.aktif_mi ? '🟢 Aktif repo' : '⚫ Terk edilmiş (180+ gün)'}
              {s.son_commit_gun !== null && s.son_commit_gun !== undefined && (
                <span className="ml-1">· son commit {s.son_commit_gun} gün önce</span>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            {[
              ["⭐ Star", s.stars],
              ["🍴 Fork", s.forks],
              ["📦 Boyut", s.size_kb ? `${s.size_kb} KB` : '—'],
              ["🌿 Default branch", s.default_branch],
              ["🐛 Açık issue", s.acik_issue],
              ["🔀 Açık PR", s.acik_pr],
              ["📄 README", s.readme_var ? `${s.readme_uzunluk} byte` : 'Yok'],
              ["⚖️ License", s.license_adi || (s.license_var ? 'Var' : 'Yok')],
              ["📜 Changelog", s.changelog_var ? 'Var' : 'Yok'],
              ["🧪 Test klasörü", s.test_klasoru_var ? 'Var' : 'Yok'],
              ["🐳 Docker", s.docker_var ? 'Var' : 'Yok'],
              ["⚙️ CI/CD", s.ci_var ? 'Var' : 'Yok'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg">
                <span className="text-gray-500 font-semibold">{k}</span>
                <span className="text-gray-900 font-bold">{v ?? '—'}</span>
              </div>
            ))}
          </div>
          {s.topics?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {s.topics.map(t => <span key={t} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-semibold">#{t}</span>)}
            </div>
          )}
        </div>
      )}

      {/* KAVRAMLAR */}
      {tab === "kavramlar" && (
        <div className="flex flex-col gap-2 text-[11px]">
          {!proje.kavramlar?.length ? (
            <p className="text-gray-400">Henüz kavram çıkarılmadı. Yeniden analiz et.</p>
          ) : (
            <>
              <p className="text-gray-500">Bu projede gösterdiğin teknik beceriler:</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {proje.kavramlar.map(k => (
                  <span key={k} className="px-3 py-1.5 bg-gradient-to-r from-purple-50 to-blue-50 border border-blue-100 text-gray-800 rounded-full font-bold">
                    ✨ {k}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* RADAR */}
      {tab === "radar" && (
        <div className="flex flex-col gap-2 text-[11px]">
          {Object.keys(bk).length === 0 ? (
            <p className="text-gray-400">Beceri kategorileri yok. Yeniden analiz et.</p>
          ) : (
            <>
              <p className="text-gray-500 mb-1">Bu projenin alan dağılımı:</p>
              {[
                ["frontend", "🎨 Frontend",   "bg-blue-500"],
                ["backend", "⚙️ Backend",     "bg-emerald-500"],
                ["database", "🗄 Veritabanı", "bg-amber-500"],
                ["devops", "🐳 DevOps",       "bg-orange-500"],
                ["testing", "🧪 Test",        "bg-purple-500"],
                ["documentation", "📝 Dokümantasyon", "bg-gray-500"],
              ].map(([key, label, color]) => {
                const v = bk[key] ?? 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-28 text-gray-600 font-semibold">{label}</span>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${v}%` }} />
                    </div>
                    <span className="w-10 text-right text-gray-900 font-bold">{v}</span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* EŞLEŞMELER */}
      {tab === "eslesmeler" && (
        <div className="flex flex-col gap-3 text-[11px]">
          {eYukleniyor ? (
            <p className="text-gray-400">Yükleniyor…</p>
          ) : !eslesenler ? (
            <p className="text-gray-400">Veri yok</p>
          ) : (
            <>
              <div>
                <h4 className="font-bold text-gray-700 mb-1">🏢 Staj İlanları ({eslesenler.staj_ilanlari?.length || 0})</h4>
                {eslesenler.staj_ilanlari?.length ? eslesenler.staj_ilanlari.map(i => (
                  <a key={i.id} href={`/internships/${i.id}`}
                    className="block px-3 py-2 mb-1 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100">
                    <div className="flex justify-between">
                      <span className="font-bold text-gray-800">{i.pozisyon}</span>
                      <span className="text-blue-700 font-bold">%{i.skor}</span>
                    </div>
                    {i.departman && <span className="text-gray-500">{i.departman}</span>}
                    {i.eslesen?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {i.eslesen.map(e => <span key={e} className="text-[10px] bg-white text-blue-700 px-1.5 py-0.5 rounded">{e}</span>)}
                      </div>
                    )}
                  </a>
                )) : <p className="text-gray-400">Eşleşen ilan yok</p>}
              </div>
              <div>
                <h4 className="font-bold text-gray-700 mb-1">👥 Grup Projeleri ({eslesenler.grup_projeleri?.length || 0})</h4>
                {eslesenler.grup_projeleri?.length ? eslesenler.grup_projeleri.map(g => (
                  <a key={`${g.project_id}-${g.department_id}`} href={`/projects/${g.project_id}`}
                    className="block px-3 py-2 mb-1 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100">
                    <div className="flex justify-between">
                      <span className="font-bold text-gray-800">{g.proje_adi} <span className="text-gray-500 font-normal">→ {g.departman_adi}</span></span>
                      <span className="text-emerald-700 font-bold">%{g.skor}</span>
                    </div>
                    {g.eslesen?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {g.eslesen.map(e => <span key={e} className="text-[10px] bg-white text-emerald-700 px-1.5 py-0.5 rounded">{e}</span>)}
                      </div>
                    )}
                  </a>
                )) : <p className="text-gray-400">Eşleşen grup projesi yok</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [activeTab, setActiveTab] = useState("Sertifikalar");
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [profile, setProfile] = useState({ ad: "", soyad: "", email: "", telefon: "", bolum: "", ogrenci_no: "", github_username: "" });
  const [tempProfile, setTempProfile] = useState({ ...profile });
  const [certificates, setCertificates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newSkill, setNewSkill] = useState({ name: "", progress: 50 });
  const [githubUrl, setGithubUrl] = useState("");
  const [analizYukleniyor, setAnalizYukleniyor] = useState(false);
  const [analizAdimi, setAnalizAdimi] = useState(0);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  // Sertifika modal state
  const [certKurum,    setCertKurum]    = useState("btk");
  const [certDosya,    setCertDosya]    = useState(null);
  const [certDurum,    setCertDurum]    = useState("bosta"); // bosta|yukleniyor|manuel|tamam
  const [certSonuc,    setCertSonuc]    = useState(null);
  const [certManuelNo, setCertManuelNo] = useState("");
  const [certManuelYukl, setCertManuelYukl] = useState(false);
  const [certHata,     setCertHata]     = useState("");

  const ROLE_ROUTE = { student: "/student-dashboard", teacher: "/academic-dashboard", company: "/company-dashboard" };

  useEffect(() => {
    if (!user) return;
    const p = { ad: user.ad||"", soyad: user.soyad||"", email: user.email||"", telefon: user.telefon||"", bolum: user.bolum||"", ogrenci_no: user.ogrenci_no||"", github_username: user.github_username||"" };
    setProfile(p); setTempProfile(p);
    Promise.all([
      api.get("/certificates/me").catch(() => ({ data: [] })),
      api.get("/portfolio/projects").catch(() => ({ data: [] })),
      api.get("/cv/me").catch(() => ({ data: null })),
    ]).then(([c, pr, cv]) => {
      setCertificates(c.data || []);
      setProjects(pr.data || []);
      if (cv.data?.beceriler) setSkills(cv.data.beceriler.map((b,i) => ({ id: i, name: b, progress: 70 })));
    }).finally(() => setLoading(false));
  }, [user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!user?.id) { alert("Kullanıcı bilgisi yüklenemedi."); return; }
    try {
      const r = await api.put(`/users/${user.id}`, { ad: tempProfile.ad, soyad: tempProfile.soyad, telefon: tempProfile.telefon, ogrenci_no: tempProfile.ogrenci_no, github_username: tempProfile.github_username });
      setProfile({ ...tempProfile });
      updateUser(r.data);   // AuthContext'i tazeleyerek github_username vb. anında yansısın
      setIsEditingProfile(false);
    } catch { alert("Güncelleme başarısız."); }
  };

  const handleAddGithub = async (e) => {
    e.preventDefault();
    if (!githubUrl.trim()) return;
    setAnalizYukleniyor(true); setAnalizAdimi(0);
    try {
      const res = await api.post("/portfolio/analyze-github", { github_url: githubUrl });
      setProjects(prev => [res.data, ...prev]);
      setGithubUrl(""); setIsProjectModalOpen(false);
    } catch (err) { alert(err.response?.data?.detail || "Analiz başarısız."); }
    finally { setAnalizYukleniyor(false); setAnalizAdimi(0); }
  };

  // Yükleme sırasında adım göstergesini ilerlet (son adımda durdur)
  useEffect(() => {
    if (!analizYukleniyor) return;
    const t = setInterval(() => {
      setAnalizAdimi(i => Math.min(i + 1, ANALIZ_ADIMLARI.length - 1));
    }, 1500);
    return () => clearInterval(t);
  }, [analizYukleniyor]);

  const [editingProj, setEditingProj] = useState(null);
  const [editForm, setEditForm] = useState({ proje_adi: '', aciklama: '', konu: '', demo_link: '' });
  const [reanalyzeId, setReanalyzeId] = useState(null);
  const [detayAcik, setDetayAcik] = useState({});  // {id: true/false}

  const startEditProj = (p) => {
    setEditingProj(p.id);
    setEditForm({
      proje_adi: p.proje_adi || '', aciklama: p.aciklama || '',
      konu: p.konu || '', demo_link: p.demo_link || '',
    });
  };
  const saveEditProj = async (id) => {
    try {
      const r = await api.put(`/portfolio/projects/${id}`, editForm);
      setProjects(prev => prev.map(p => p.id === id ? r.data : p));
      setEditingProj(null);
    } catch { alert('Güncelleme başarısız'); }
  };
  const reanalyzeProj = async (id) => {
    setReanalyzeId(id);
    try {
      const r = await api.post(`/portfolio/projects/${id}/reanalyze`);
      setProjects(prev => prev.map(p => p.id === id ? r.data : p));
    } catch (e) {
      alert(e.response?.data?.detail || 'Yeniden analiz başarısız');
    } finally { setReanalyzeId(null); }
  };

  const handleDeleteProject = async (id) => {
    await api.delete(`/portfolio/projects/${id}`).catch(() => {});
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const handleDeleteCert = async (id) => {
    await api.delete(`/certificates/${id}`).catch(() => {});
    setCertificates(prev => prev.filter(c => c.id !== id));
  };

  const resetCertModal = () => {
    setCertDosya(null); setCertDurum("bosta"); setCertSonuc(null);
    setCertManuelNo(""); setCertHata(""); setIsCertModalOpen(false);
  };

  const handleCertYukle = async () => {
    if (!certDosya) { setCertHata("Lütfen dosya seçin."); return; }
    setCertDurum("yukleniyor"); setCertHata("");
    const fd = new FormData();
    fd.append("dosya", certDosya);
    try {
      const res = await api.post(`/certificates/upload?veren_kurum=${certKurum}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setCertSonuc(res.data);
      if (res.data.manuel_gerekli) {
        setCertDurum("manuel");
      } else {
        // Tam veriyi (ad + ocr_metin dahil) API'den çek
        api.get("/certificates/me").then(r => setCertificates(r.data)).catch(() => {});
        resetCertModal();
      }
    } catch (err) { setCertHata(err.response?.data?.detail || "Yükleme başarısız."); setCertDurum("bosta"); }
  };

  const handleCertManuel = async () => {
    if (!certManuelNo.trim()) { setCertHata("ID boş olamaz."); return; }
    setCertManuelYukl(true); setCertHata("");
    try {
      const res = await api.post("/certificates/verify-manual", { sertifika_id: certSonuc.id, cert_no: certManuelNo.trim() });
      if (res.data.id_hatali) { setCertHata("❌ Bu ID ile BTK sisteminde sertifika bulunamadı."); }
      else {
        api.get("/certificates/me").then(r => setCertificates(r.data)).catch(() => {});
        resetCertModal();
      }
    } catch { setCertHata("Doğrulama başarısız."); }
    finally { setCertManuelYukl(false); }
  };

  const handleAddSkill = (e) => {
    e.preventDefault();
    if (!newSkill.name.trim()) return;
    setSkills(prev => [...prev, { id: Date.now(), name: newSkill.name.trim(), progress: parseInt(newSkill.progress)||50 }]);
    setNewSkill({ name: "", progress: 50 }); setIsSkillModalOpen(false);
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400 text-sm">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans antialiased">

      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(ROLE_ROUTE[user?.role] || "/dashboard")}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-lg">İ</div>
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-none">InternovaYZ</h1>
            <span className="text-xs text-gray-400 font-medium">Öğrenci</span>
          </div>
        </div>
        <button onClick={() => navigate(ROLE_ROUTE[user?.role] || "/dashboard")} className="p-2 hover:bg-gray-50 rounded-full text-red-500 cursor-pointer">↩️</button>
      </header>

      <main className="max-w-[1280px] mx-auto p-6 lg:p-8 flex flex-col gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Profilim & CV</h2>
          <p className="text-sm text-gray-500 mt-0.5">CV'ni oluştur ve staj başvurularında kullan</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start mt-2">

          {/* SOL PANEL */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-5">
            <div className="flex flex-col items-center text-center gap-3 border-b border-gray-50 pb-5">
              <div className="h-20 w-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center text-3xl font-bold">👤</div>
              <div>
                <h3 className="text-base font-bold text-gray-900">{profile.ad} {profile.soyad}</h3>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">{profile.bolum || "Bölüm belirtilmedi"}</p>
              </div>
            </div>

            {!isEditingProfile ? (
              <div className="flex flex-col gap-3.5 text-xs">
                {[["E-posta", profile.email], ["Telefon", profile.telefon||"—"], ["Bölüm", profile.bolum||"—"], ["Öğrenci No", profile.ogrenci_no||"—"], ["GitHub", profile.github_username ? `@${profile.github_username}` : "—"]].map(([l,v]) => (
                  <div key={l} className="flex flex-col gap-0.5">
                    <span className="text-gray-400 font-medium">{l}</span>
                    <span className="text-gray-800 font-bold">{v}</span>
                  </div>
                ))}
                <button onClick={() => { setTempProfile({...profile}); setIsEditingProfile(true); }} className="w-full text-center py-2.5 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-xl font-bold mt-2 transition-all border border-gray-100 cursor-pointer">Profili Düzenle</button>
              </div>
            ) : (
              <form onSubmit={handleProfileSave} className="flex flex-col gap-3 text-xs">
                {[["Ad", "ad"], ["Soyad", "soyad"], ["Telefon", "telefon"], ["Öğrenci No", "ogrenci_no"], ["GitHub kullanıcı adı", "github_username"]].map(([l, k]) => (
                  <div key={k} className="flex flex-col gap-1">
                    <label className="font-bold text-gray-600">{l}</label>
                    <input value={tempProfile[k]} onChange={e => setTempProfile(p => ({...p, [k]: e.target.value}))} className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:bg-white font-semibold" />
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => setIsEditingProfile(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold cursor-pointer">İptal</button>
                  <button type="submit" className="flex-1 py-2 bg-black text-white rounded-xl font-bold cursor-pointer">Kaydet</button>
                </div>
              </form>
            )}
          </div>

          {/* SAĞ PANEL */}
          <div className="lg:col-span-2 flex flex-col gap-6">

            {/* Rozetler */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">🏆 Rozetler & Başarılar</h4>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">Tamamlanan {certificates.filter(c=>c.dogrulanmis).length} doğrulanmış sertifika ile kazanıldı</p>
                <div className="flex gap-2 mt-3">
                  <span className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-[11px] font-bold flex items-center gap-1">🎓 Öğrenmeye Başladı</span>
                  {certificates.filter(c=>c.dogrulanmis).length > 0 && (
                    <span className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[11px] font-bold flex items-center gap-1">✅ Sertifika Sahibi</span>
                  )}
                </div>
              </div>
            </div>

            {/* Sekmeler */}
            <div className="bg-gray-100/70 p-1 rounded-xl flex gap-1">
              {["Sertifikalar", "Projeler", "Yetenekler"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                  {tab === "Sertifikalar" ? "🏅 " : tab === "Projeler" ? "🔗 " : "💡 "}{tab}
                </button>
              ))}
            </div>

            {/* Sekme İçerikleri */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm min-h-[280px] flex flex-col gap-4">

              {/* SERTİFİKALAR */}
              {activeTab === "Sertifikalar" && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-gray-900">Sertifikalarım</h3>
                      <p className="text-[11px] text-gray-400 font-medium mt-0.5">Yükle ve onaylanmasını bekle</p>
                    </div>
                    <button onClick={() => { setCertDurum("bosta"); setCertHata(""); setIsCertModalOpen(true); }} className="bg-black text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer">+ Sertifika Ekle</button>
                  </div>
                  {certificates.length === 0 ? (
                    <div className="text-center py-10 text-gray-300 text-sm">Henüz sertifika eklenmemiş.</div>
                  ) : (
                    <div className="flex flex-col gap-3 mt-1">
                      {certificates.map(cert => {
                        const metaMap = {};
                        (cert.ocr_metin||'').split(/\\n|\n/).forEach(s => {
                          const i = s.indexOf(':');
                          if (i > 0) metaMap[s.slice(0,i).trim()] = s.slice(i+1).trim();
                        });
                        const meta = { isim: metaMap['isim']||'', tarih: metaMap['tarih']||'', cert_no: metaMap['cert_no']||'' };
                        const neden = (cert.ocr_metin||'').match(/neden:(.+)/)?.[1]?.trim();
                        return (
                          <div key={cert.id} className="p-4 border border-gray-50 bg-white rounded-xl flex flex-col gap-2">
                            {/* İkon + kurs adı + sil */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {cert.veren_kurum === 'btk' && cert.dogrulanmis && (
                                  <img src={btkIcon} alt="BTK" className="h-7 w-7 rounded object-contain" />
                                )}
                                {cert.veren_kurum === 'btk' && !cert.dogrulanmis && (
                                  <span className="text-red-500 font-bold text-base">✕</span>
                                )}
                                <h4 className="text-sm font-bold text-gray-900">{cert.ad}</h4>
                              </div>
                              <button onClick={() => handleDeleteCert(cert.id)} className="text-[11px] font-bold text-red-400 hover:text-red-600">Sil</button>
                            </div>

                            {/* Doğrulandı → yeşil bar */}
                            {cert.dogrulanmis && (
                              <div className="flex flex-wrap gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-[10px] font-semibold text-emerald-700">
                                <span>👤 {meta.isim || cert.ad || '—'}</span>
                                {meta.tarih   && <span>📅 {meta.tarih}</span>}
                                {meta.cert_no && <span>🔢 {meta.cert_no}</span>}
                              </div>
                            )}

                            {/* Onaylanmadı → kırmızı bar */}
                            {!cert.dogrulanmis && (
                              <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-[10px] font-semibold text-red-700">
                                {neden
                                  ? <>❌ Eşleşmeyen: <strong>{neden}</strong></>
                                  : cert.veren_kurum === 'diger'
                                    ? <span>⏳ Doğrulama yapılmadı</span>
                                    : <span>❌ BTK doğrulaması başarısız</span>
                                }
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* PROJELER */}
              {activeTab === "Projeler" && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-gray-900">Projelerim</h3>
                      <p className="text-[11px] text-gray-400 font-medium mt-0.5">GitHub repo linklerini ekle</p>
                    </div>
                    <button onClick={() => setIsProjectModalOpen(true)} className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer">+ Proje Ekle</button>
                  </div>
                  {projects.length === 0 ? (
                    <div className="text-center py-10 text-gray-300 text-sm">Henüz proje eklenmemiş.</div>
                  ) : (
                    <div className="flex flex-col gap-4 mt-2">
                      {projects.map(proj => {
                        const k = proj.katki_analizi;
                        const rolMap = {
                          "frontend-agirlikli": ["🎨 Frontend", "bg-blue-50 text-blue-700"],
                          "backend-agirlikli":  ["⚙️ Backend",  "bg-emerald-50 text-emerald-700"],
                          "fullstack":          ["🔁 Full-stack", "bg-purple-50 text-purple-700"],
                          "devops":             ["🐳 DevOps", "bg-orange-50 text-orange-700"],
                          "dokuman":            ["📝 Dokümantasyon", "bg-gray-50 text-gray-600"],
                          "karisik":            ["🧩 Karışık", "bg-gray-50 text-gray-600"],
                          "bilinmiyor":         ["❔ Belirsiz", "bg-gray-50 text-gray-500"],
                        };
                        const rol = rolMap[k?.rol_kategorisi] || rolMap.bilinmiyor;
                        const calismaEtk = k?.calisma_tipi === 'solo'
                          ? '🧑 Solo proje'
                          : k?.calisma_tipi === 'takim' ? `👥 Takım (${k.toplam_katkici})` : null;

                        return (
                        <div key={proj.id} className="p-5 border border-gray-100 bg-white rounded-2xl flex flex-col gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="text-sm font-bold text-gray-900">{proj.proje_adi}</h4>
                              {proj.konu && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold inline-block mt-1">🏷️ {proj.konu}</span>}
                            </div>
                            {editingProj !== proj.id && (
                              <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                                <button onClick={() => setDetayAcik(d => ({ ...d, [proj.id]: !d[proj.id] }))}
                                  className={`text-[11px] font-bold border px-2.5 py-1 rounded-lg
                                    ${detayAcik[proj.id] ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 hover:text-gray-900 border-gray-200'}`}>
                                  📊 {detayAcik[proj.id] ? 'Detayları Gizle' : 'Detaylar'}
                                </button>
                                <button onClick={() => startEditProj(proj)} className="text-[11px] font-bold text-gray-600 hover:text-gray-900 border border-gray-200 px-2.5 py-1 rounded-lg">✏️ Düzenle</button>
                                {proj.github_link && (
                                  <button onClick={() => reanalyzeProj(proj.id)} disabled={reanalyzeId === proj.id}
                                    className="text-[11px] font-bold text-gray-600 hover:text-gray-900 border border-gray-200 px-2.5 py-1 rounded-lg disabled:opacity-50">
                                    {reanalyzeId === proj.id ? '⏳ Analiz…' : '🔄 Yeniden Analiz'}
                                  </button>
                                )}
                                <button onClick={() => handleDeleteProject(proj.id)} className="text-[11px] font-bold text-red-500 hover:text-red-700 border border-red-100 px-2.5 py-1 rounded-lg">Sil</button>
                              </div>
                            )}
                          </div>

                          {editingProj === proj.id ? (
                            <div className="flex flex-col gap-2 mt-1">
                              <input value={editForm.proje_adi} onChange={e => setEditForm(f => ({ ...f, proje_adi: e.target.value }))}
                                placeholder="Proje adı" className="text-xs px-3 py-2 border border-gray-200 rounded-lg" />
                              <input value={editForm.konu} onChange={e => setEditForm(f => ({ ...f, konu: e.target.value }))}
                                placeholder="Konu" className="text-xs px-3 py-2 border border-gray-200 rounded-lg" />
                              <textarea rows={3} value={editForm.aciklama} onChange={e => setEditForm(f => ({ ...f, aciklama: e.target.value }))}
                                placeholder="Açıklama" className="text-xs px-3 py-2 border border-gray-200 rounded-lg" />
                              <input value={editForm.demo_link} onChange={e => setEditForm(f => ({ ...f, demo_link: e.target.value }))}
                                placeholder="Demo linki (opsiyonel)" className="text-xs px-3 py-2 border border-gray-200 rounded-lg" />
                              <div className="flex gap-2">
                                <button onClick={() => setEditingProj(null)} className="flex-1 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 py-2 rounded-lg">İptal</button>
                                <button onClick={() => saveEditProj(proj.id)} className="flex-1 text-xs font-bold text-white bg-black py-2 rounded-lg">Kaydet</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {proj.aciklama && <p className="text-xs text-gray-500 line-clamp-2">{proj.aciklama}</p>}
                              {proj.teknolojiler?.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {proj.teknolojiler.map(t => <span key={t} className="px-2.5 py-1 bg-gray-50 text-gray-600 text-[10px] font-bold rounded-lg border border-gray-100">{t}</span>)}
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-[11px] font-bold">
                                {proj.github_link && <a href={proj.github_link} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-blue-600 flex items-center gap-1">🔗 GitHub</a>}
                                {proj.demo_link && <a href={proj.demo_link} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-blue-600 flex items-center gap-1">🌐 Demo</a>}
                                {proj.proje_buyuklugu > 0 && (
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className="text-gray-400">Büyüklük</span>
                                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${proj.proje_buyuklugu}%` }} />
                                    </div>
                                    <span className="text-blue-600">%{proj.proje_buyuklugu}</span>
                                  </div>
                                )}
                              </div>

                              {/* Katkı analizi paneli */}
                              {k && (
                                <div className="mt-2 p-3 bg-gray-50 border border-gray-100 rounded-xl flex flex-col gap-2 text-[11px]">
                                  {k.hata ? (
                                    <div className="bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                                      <p className="font-bold text-red-700">⚠ Katkı analizi yapılamadı</p>
                                      <p className="text-red-600 mt-0.5">{k.hata}</p>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center justify-between flex-wrap gap-2">
                                        <span className="font-bold text-gray-700">Katkı Analizi</span>
                                        {calismaEtk && <span className="text-gray-500 font-semibold">{calismaEtk}</span>}
                                      </div>
                                      {k.kullanici_var_mi ? (
                                        <>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`px-2 py-0.5 rounded-full font-bold ${rol[1]}`}>{rol[0]}</span>
                                            <span className="text-gray-700 font-semibold">%{k.katki_yuzdesi} · {k.kullanici_commit}/{k.toplam_commit} commit</span>
                                          </div>
                                          {k.dokunulan_dizinler && Object.keys(k.dokunulan_dizinler).length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                              {Object.entries(k.dokunulan_dizinler).sort((a, b) => b[1] - a[1]).map(([kat, sayi]) => (
                                                <span key={kat} className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-600 font-semibold">
                                                  {kat} · {sayi}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <p className="text-gray-500">
                                          {k.github_username
                                            ? `"${k.github_username}" bu repo'da katkı bulunmuyor.`
                                            : 'Profilde GitHub kullanıcı adı yok — sadece genel istatistikler.'}
                                        </p>
                                      )}
                                    </>
                                  )}
                                </div>
                              )}

                              {/* Detay paneli (mimari/sağlık/kavramlar/radar/eşleşmeler) */}
                              {detayAcik[proj.id] && <DetayPaneli proje={proj} />}
                            </>
                          )}
                        </div>
                      );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* YETENEKLER */}
              {activeTab === "Yetenekler" && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-gray-900">Yeteneklerim</h3>
                      <p className="text-[11px] text-gray-400 font-medium mt-0.5">Kariyer haritasından AI ile otomatik oluştur</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setIsSkillModalOpen(true)} className="border border-gray-200 text-gray-700 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer hover:bg-gray-50">+ Yetenek</button>
                      <button onClick={() => navigate("/career-map")} className="bg-black text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer">🤖 AI Profil</button>
                    </div>
                  </div>
                  {skills.length === 0 ? (
                    <div className="text-center py-10 text-gray-300 text-sm">Kariyer haritasından AI ile profil oluştur.</div>
                  ) : (
                    <div className="flex flex-col gap-4 mt-1">
                      {skills.map(skill => (
                        <div key={skill.id} className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-800">{skill.name}</span>
                            <span className="text-xs font-bold text-blue-600">%{skill.progress}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${skill.progress}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* PROJE MODAL */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Proje Ekle</h3>
                <p className="text-xs text-gray-400 mt-0.5">GitHub linkini gir, AI analiz eder</p>
              </div>
              <button onClick={() => setIsProjectModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
            </div>
            {analizYukleniyor ? (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="h-10 w-10 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
                <p className="text-sm font-bold text-gray-800 text-center">
                  {ANALIZ_ADIMLARI[analizAdimi].ikon} {ANALIZ_ADIMLARI[analizAdimi].metin}
                </p>
                <div className="flex gap-1 justify-center">
                  {ANALIZ_ADIMLARI.map((_, i) => (
                    <span key={i} className={`h-1 w-7 rounded ${i <= analizAdimi ? 'bg-black' : 'bg-gray-200'} transition-colors`} />
                  ))}
                </div>
                <p className="text-[11px] text-gray-400">10-20 saniye sürebilir.</p>
              </div>
            ) : (
              <form onSubmit={handleAddGithub} className="flex flex-col gap-4 text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className="font-bold text-gray-700">GitHub Repo Linki</label>
                  <input type="url" placeholder="https://github.com/kullanici/repo" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} required
                    className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100 focus:bg-white focus:outline-none font-medium text-gray-800 placeholder:text-gray-300" />
                </div>
                <button type="submit"
                  className="w-full bg-black text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 shadow-md transition-all cursor-pointer">
                  🤖 Analiz Et & Ekle
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* YETENEK MODAL */}
      {isSkillModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsSkillModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-[420px] rounded-3xl bg-white p-7 shadow-2xl flex flex-col gap-5">
            <button onClick={() => setIsSkillModalOpen(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 text-sm cursor-pointer">✕</button>
            <div>
              <h3 className="text-base font-bold text-gray-900">Yeni Yetenek Ekle</h3>
              <p className="text-xs font-medium text-gray-400 mt-0.5">Profiline yeni uzmanlık alanları ekle</p>
            </div>
            <form onSubmit={handleAddSkill} className="flex flex-col gap-5 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-gray-700">Yetenek / Teknoloji Adı</label>
                <input type="text" placeholder="örn: Next.js, Docker, Python" value={newSkill.name} onChange={e => setNewSkill({...newSkill, name: e.target.value})} required
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100 focus:bg-white focus:outline-none font-medium text-gray-800 placeholder:text-gray-300" />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-gray-700">Becerinin Seviyesi</label>
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md font-extrabold text-[11px] border border-blue-100">%{newSkill.progress}</span>
                </div>
                <input type="range" min="10" max="100" step="5" value={newSkill.progress} onChange={e => setNewSkill({...newSkill, progress: e.target.value})}
                  className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-black" />
                <div className="flex justify-between text-[10px] text-gray-400 font-bold px-0.5 mt-0.5">
                  <span>Temel</span><span>Orta</span><span>Uzman</span>
                </div>
              </div>
              <button type="submit" className="w-full bg-black text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 shadow-md transition-all cursor-pointer">
                Yetenek Listesine Ekle
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SERTİFİKA MODAL */}
      {isCertModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Sertifika Ekle</h3>
                <p className="text-xs text-gray-400 mt-0.5">Kurum seç ve dosyayı yükle</p>
              </div>
              <button onClick={resetCertModal} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
            </div>

            {/* Kurum seçici */}
            <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
              {[{v:"btk",l:"🏛️ BTK Akademi"},{v:"diger",l:"📄 Diğer"}].map(k => (
                <button key={k.v} type="button"
                  onClick={() => { setCertKurum(k.v); setCertDosya(null); setCertDurum("bosta"); setCertHata(""); }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${certKurum === k.v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                  {k.l}
                </button>
              ))}
            </div>

            {/* Dosya seç */}
            {certDurum === "bosta" && (
              <>
                <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-200 rounded-2xl cursor-pointer hover:border-gray-400 transition-all bg-gray-50 hover:bg-white">
                  <span className="text-2xl">{certDosya ? "📎" : "📄"}</span>
                  <span className="text-xs font-semibold text-gray-600">
                    {certDosya ? certDosya.name : certKurum === "btk" ? "PDF seç (BTK sertifikası)" : "PNG, JPG veya PDF seç"}
                  </span>
                  <span className="text-[10px] text-gray-400">{certDosya ? `${(certDosya.size/1024).toFixed(0)} KB` : "Dosya seçmek için tıkla"}</span>
                  <input type="file"
                    accept={certKurum === "btk" ? "application/pdf" : "image/png,image/jpeg,image/jpg,application/pdf"}
                    style={{ display: "none" }}
                    onChange={e => { setCertDosya(e.target.files[0]); setCertHata(""); }} />
                </label>
                {certHata && <p className="text-xs text-red-500 font-medium -mt-2">{certHata}</p>}
                <div className="flex gap-3">
                  <button onClick={handleCertYukle} disabled={!certDosya}
                    className="flex-1 bg-gray-950 text-white py-3 rounded-xl text-xs font-bold hover:bg-gray-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                    {certKurum === "btk" ? "Yükle & Doğrula" : "Ekle"}
                  </button>
                  <button onClick={resetCertModal} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all cursor-pointer">İptal</button>
                </div>
              </>
            )}

            {/* Yükleniyor */}
            {certDurum === "yukleniyor" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="h-8 w-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-xs text-gray-500 font-medium">{certKurum === "btk" ? "PDF okunuyor, BTK kontrol ediliyor..." : "Kaydediliyor..."}</p>
              </div>
            )}

            {/* Manuel ID */}
            {certDurum === "manuel" && (
              <div className="flex flex-col gap-4">
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-amber-800">⚠️ BTK sisteminde sertifika numarası bulunamadı.</p>
                  {certSonuc?.ocr && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {certSonuc.ocr.isim  && <span className="text-[10px] text-amber-700">👤 {certSonuc.ocr.isim}</span>}
                      {certSonuc.ocr.kurs  && <span className="text-[10px] text-amber-700">📚 {certSonuc.ocr.kurs}</span>}
                      {certSonuc.ocr.tarih && <span className="text-[10px] text-amber-700">📅 {certSonuc.ocr.tarih}</span>}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-gray-700">Sertifikanın sağ üst köşesindeki ID:</label>
                  <input className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="örn: 6mqF06j6vL" value={certManuelNo} onChange={e => setCertManuelNo(e.target.value)} />
                </div>
                {certHata && <p className="text-xs text-red-500 font-medium">{certHata}</p>}
                <div className="flex gap-3">
                  <button onClick={handleCertManuel} disabled={certManuelYukl}
                    className="flex-1 bg-gray-950 text-white py-3 rounded-xl text-xs font-bold hover:bg-gray-800 disabled:opacity-50 cursor-pointer">
                    {certManuelYukl ? "Kontrol ediliyor..." : "🔐 BTK'da Doğrula"}
                  </button>
                  <button onClick={resetCertModal} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-xs font-bold hover:bg-gray-50 cursor-pointer">Vazgeç</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
