import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("Sertifikalar");
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const [profile, setProfile] = useState({ ad: "", soyad: "", email: "", telefon: "", bolum: "", ogrenci_no: "" });
  const [tempProfile, setTempProfile] = useState({ ...profile });
  const [certificates, setCertificates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newSkill, setNewSkill] = useState({ name: "", progress: 50 });
  const [githubUrl, setGithubUrl] = useState("");
  const [analizYukleniyor, setAnalizYukleniyor] = useState(false);

  const ROLE_ROUTE = { student: "/student-dashboard", teacher: "/academic-dashboard", company: "/company-dashboard" };

  useEffect(() => {
    if (!user) return;
    const p = { ad: user.ad||"", soyad: user.soyad||"", email: user.email||"", telefon: user.telefon||"", bolum: user.bolum||"", ogrenci_no: user.ogrenci_no||"" };
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
    try {
      await api.put(`/users/${user.id}`, { ad: tempProfile.ad, soyad: tempProfile.soyad, telefon: tempProfile.telefon, ogrenci_no: tempProfile.ogrenci_no });
      setProfile({ ...tempProfile }); setIsEditingProfile(false);
    } catch { alert("Güncelleme başarısız."); }
  };

  const handleAddGithub = async (e) => {
    e.preventDefault();
    if (!githubUrl.trim()) return;
    setAnalizYukleniyor(true);
    try {
      const res = await api.post("/portfolio/analyze-github", { github_url: githubUrl });
      setProjects(prev => [res.data, ...prev]);
      setGithubUrl(""); setIsProjectModalOpen(false);
    } catch (err) { alert(err.response?.data?.detail || "Analiz başarısız."); }
    finally { setAnalizYukleniyor(false); }
  };

  const handleDeleteProject = async (id) => {
    await api.delete(`/portfolio/projects/${id}`).catch(() => {});
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const handleDeleteCert = async (id) => {
    await api.delete(`/certificates/${id}`).catch(() => {});
    setCertificates(prev => prev.filter(c => c.id !== id));
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
                {[["E-posta", profile.email], ["Telefon", profile.telefon||"—"], ["Bölüm", profile.bolum||"—"], ["Öğrenci No", profile.ogrenci_no||"—"]].map(([l,v]) => (
                  <div key={l} className="flex flex-col gap-0.5">
                    <span className="text-gray-400 font-medium">{l}</span>
                    <span className="text-gray-800 font-bold">{v}</span>
                  </div>
                ))}
                <button onClick={() => { setTempProfile({...profile}); setIsEditingProfile(true); }} className="w-full text-center py-2.5 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-xl font-bold mt-2 transition-all border border-gray-100 cursor-pointer">Profili Düzenle</button>
              </div>
            ) : (
              <form onSubmit={handleProfileSave} className="flex flex-col gap-3 text-xs">
                {[["Ad", "ad"], ["Soyad", "soyad"], ["Telefon", "telefon"], ["Öğrenci No", "ogrenci_no"]].map(([l, k]) => (
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
                    <button onClick={() => navigate("/portfolio")} className="bg-black text-white px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer">+ Sertifika Ekle</button>
                  </div>
                  {certificates.length === 0 ? (
                    <div className="text-center py-10 text-gray-300 text-sm">Henüz sertifika eklenmemiş.</div>
                  ) : (
                    <div className="flex flex-col gap-3 mt-1">
                      {certificates.map(cert => (
                        <div key={cert.id} className="p-4 border border-gray-50 bg-white rounded-xl flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-emerald-600 text-base">✓</span>
                              <div>
                                <h4 className="text-xs font-bold text-gray-900">{cert.ad}</h4>
                                <p className="text-[10px] text-gray-400 font-medium mt-0.5">{cert.veren_kurum || "—"}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-0.5 text-[9px] font-bold border rounded-md ${cert.dogrulanmis ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-amber-50 text-amber-600 border-amber-100"}`}>
                                {cert.dogrulanmis ? "Onaylandı" : "Bekliyor"}
                              </span>
                              <button onClick={() => handleDeleteCert(cert.id)} className="text-[11px] font-bold text-red-500 hover:underline">Sil</button>
                            </div>
                          </div>
                        </div>
                      ))}
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
                      {projects.map(proj => (
                        <div key={proj.id} className="p-5 border border-gray-100 bg-white rounded-2xl relative flex flex-col gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                          <div className="absolute top-5 right-5 flex gap-3">
                            <button onClick={() => handleDeleteProject(proj.id)} className="text-xs font-bold text-red-500 hover:underline">Sil</button>
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 pr-12">{proj.proje_adi}</h4>
                            {proj.konu && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-semibold">🏷️ {proj.konu}</span>}
                          </div>
                          {proj.aciklama && <p className="text-xs text-gray-500 line-clamp-2">{proj.aciklama}</p>}
                          {proj.teknolojiler?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {proj.teknolojiler.map(t => <span key={t} className="px-2.5 py-1 bg-gray-50 text-gray-600 text-[10px] font-bold rounded-lg border border-gray-100">{t}</span>)}
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-[11px] font-bold mt-1">
                            {proj.github_link && <a href={proj.github_link} target="_blank" rel="noreferrer" className="text-gray-600 hover:text-blue-600 flex items-center gap-1">🔗 GitHub</a>}
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
                        </div>
                      ))}
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
            <form onSubmit={handleAddGithub} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-gray-700">GitHub Repo Linki</label>
                <input type="url" placeholder="https://github.com/kullanici/repo" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} required
                  className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100 focus:bg-white focus:outline-none font-medium text-gray-800 placeholder:text-gray-300" />
              </div>
              <button type="submit" disabled={analizYukleniyor}
                className="w-full bg-black text-white py-3.5 rounded-xl font-bold hover:bg-gray-800 shadow-md transition-all cursor-pointer disabled:opacity-50">
                {analizYukleniyor ? "⏳ Analiz ediliyor..." : "🤖 Analiz Et & Ekle"}
              </button>
            </form>
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
    </div>
  );
}

export default ProfilePage;
