// Kariyer Asistanı — Genel mod (BTÜ yönetmeliği RAG) + Staj modu (Faz 3 #15)
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const GENEL_HIZLI = [
  { t: "Nasıl staj bulabilirim?",      i: "🔍", c: "bg-blue-50 text-blue-600 border-blue-100" },
  { t: "Hangi eğitimleri almalıyım?",  i: "📖", c: "bg-purple-50 text-purple-600 border-purple-100" },
  { t: "CV'mi nasıl geliştiririm?",    i: "📝", c: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  { t: "Mülakat ipuçları",             i: "💡", c: "bg-amber-50 text-amber-600 border-amber-100" },
];

const POPULER = [
  "Staj başvurusu nasıl yapılır?",
  "BTÜ staj süresi kaç gün?",
  "Rozet kazanma koşulları neler?",
  "Mülakat hazırlığı için ne yapmalıyım?",
];

const DURUM_RENK = {
  bekleyen:    "bg-amber-50 text-amber-700",
  inceleniyor: "bg-blue-50 text-blue-700",
  mulakat:     "bg-purple-50 text-purple-700",
  kabul:       "bg-emerald-50 text-emerald-700",
};

const DURUM_LABEL = {
  bekleyen: "Bekleyen", inceleniyor: "İnceleniyor",
  mulakat: "Mülakat", kabul: "Kabul",
};

const HOSGELDIN_GENEL = {
  role: "bot",
  content: "Merhaba! Ben InternovaYZ Kariyer Asistanıyım. BTÜ staj yönetmeliği, kariyer planlaması, staj bulma ve başvuru süreçleri hakkında sorularını yanıtlayabilirim.",
  time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
};

const HOSGELDIN_STAJ = (b) => ({
  role: "bot",
  content: `🎯 Staj modu aktif: ${b.pozisyon}${b.sirket_adi ? ` · ${b.sirket_adi}` : ""}.\n\n${b.asama_aciklama || "Sana özel önerilerde bulunabilirim."}\n\nBu staj bağlamında sorularını sor.`,
  time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
});

export default function CareerAssistant() {
  const navigate = useNavigate();

  // Mod yönetimi
  const [baglamlar, setBaglamlar] = useState([]);   // staj seçici için
  const [aktifBaglam, setAktifBaglam] = useState(null);  // null = genel mod

  // Chat state — her mod için ayrı geçmiş tut
  const [genelMesajlar, setGenelMesajlar] = useState([HOSGELDIN_GENEL]);
  const [stajMesajlar, setStajMesajlar] = useState({});   // {application_id: [...]}

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    api.get("/staj/asistan/baglam")
      .then(r => setBaglamlar(r.data))
      .catch(() => {});
  }, []);

  // Aktif mesaj listesi
  const messages = aktifBaglam
    ? (stajMesajlar[aktifBaglam.application_id] || [HOSGELDIN_STAJ(aktifBaglam)])
    : genelMesajlar;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const zaman = () => new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  // Mesaj ekleme yardımcısı (mod-aware)
  const mesajEkle = (msg) => {
    if (aktifBaglam) {
      setStajMesajlar(prev => ({
        ...prev,
        [aktifBaglam.application_id]: [...(prev[aktifBaglam.application_id] || [HOSGELDIN_STAJ(aktifBaglam)]), msg],
      }));
    } else {
      setGenelMesajlar(prev => [...prev, msg]);
    }
  };

  const gonder = async (soru) => {
    const metin = (soru || input).trim();
    if (!metin || loading) return;

    mesajEkle({ role: "user", content: metin, time: zaman() });
    setInput("");
    setLoading(true);

    try {
      let yanit;
      if (aktifBaglam) {
        const res = await api.post("/staj/asistan", {
          soru: metin,
          application_id: aktifBaglam.application_id,
        });
        yanit = res.data.basarili ? res.data.yanit : `⚠ ${res.data.hata || "Yanıt alınamadı"}`;
      } else {
        const res = await api.post("/ai/ask", { soru: metin });
        yanit = res.data.yanit;
      }
      mesajEkle({ role: "bot", content: yanit, time: zaman() });
    } catch {
      mesajEkle({
        role: "bot",
        content: "Şu an yanıt veremiyorum. Lütfen tekrar dene.",
        time: zaman(),
      });
    } finally {
      setLoading(false);
    }
  };

  const modSec = (baglam) => {
    setAktifBaglam(baglam);
    setInput("");
  };

  const hizliSorular = aktifBaglam
    ? (aktifBaglam.hizli_sorular || []).map(t => ({ t, i: "💼" }))
    : GENEL_HIZLI;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans antialiased">

      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/student-dashboard")}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-lg">İ</div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">Kariyer Asistanı</h1>
            <span className="text-xs text-gray-400 font-medium">
              {aktifBaglam ? `🎯 Staj modu — ${aktifBaglam.pozisyon}` : "🌐 Genel mod"}
            </span>
          </div>
        </div>
        <button onClick={() => navigate("/student-dashboard")} className="text-xs font-bold text-gray-500 hover:text-gray-900 px-3 py-2 rounded-xl hover:bg-gray-50">
          ← Dashboard
        </button>
      </header>

      <main className="max-w-[1280px] mx-auto p-6 lg:p-8 flex flex-col gap-6">

        {/* MOD SEÇİCİ */}
        <section className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-2">Mod:</span>

          <button onClick={() => modSec(null)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all
              ${!aktifBaglam ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"}`}>
            🌐 Genel
          </button>

          {baglamlar.length > 0 && (
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-2 mr-1">Stajlarım:</span>
          )}
          {baglamlar.map(b => {
            const aktif = aktifBaglam?.application_id === b.application_id;
            return (
              <button key={b.application_id} onClick={() => modSec(b)}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all flex items-center gap-2
                  ${aktif ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"}`}>
                <span className="truncate max-w-[160px]">
                  {b.sirket_adi ? `${b.sirket_adi}` : b.pozisyon}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full
                  ${aktif ? "bg-white/20 text-white" : DURUM_RENK[b.durum] || "bg-gray-100 text-gray-600"}`}>
                  {DURUM_LABEL[b.durum] || b.durum}
                </span>
              </button>
            );
          })}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* CHAT */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col h-[650px] overflow-hidden">

            <div className="p-5 border-b border-gray-50 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xl
                ${aktifBaglam ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}`}>
                {aktifBaglam ? "🎯" : "🤖"}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-gray-900">
                  {aktifBaglam ? `${aktifBaglam.pozisyon} — Staj Asistanı` : "Genel Kariyer Asistanı"}
                </h3>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-[11px] text-emerald-500 font-bold uppercase">Çevrimiçi</span>
                </div>
              </div>
            </div>

            {/* Mesajlar */}
            <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-5 bg-white">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 items-start ${msg.role === "user" ? "flex-row-reverse" : ""} max-w-[88%] ${msg.role === "user" ? "ml-auto" : ""}`}>
                  {msg.role === "bot" && (
                    <div className={`h-8 w-8 rounded-xl flex-shrink-0 flex items-center justify-center text-xs
                      ${aktifBaglam ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>
                      {aktifBaglam ? "🎯" : "🤖"}
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <div className={`p-4 rounded-2xl text-xs font-medium leading-relaxed whitespace-pre-wrap
                      ${msg.role === "user"
                        ? "bg-gray-900 text-white rounded-tr-none"
                        : "bg-gray-50 text-gray-700 border border-gray-100 rounded-tl-none"}`}>
                      {msg.content}
                    </div>
                    <span className={`text-[10px] text-gray-400 font-bold ${msg.role === "user" ? "text-right" : "ml-1"}`}>{msg.time}</span>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 items-start max-w-[88%]">
                  <div className={`h-8 w-8 rounded-xl flex-shrink-0 flex items-center justify-center text-xs
                    ${aktifBaglam ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}>
                    {aktifBaglam ? "🎯" : "🤖"}
                  </div>
                  <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-5 bg-white border-t border-gray-50">
              <div className="relative">
                <input
                  type="text" value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && gonder()}
                  placeholder={aktifBaglam ? `${aktifBaglam.pozisyon} hakkında sor…` : "Mesajını yaz..."}
                  disabled={loading}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-5 pr-14 text-xs font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all disabled:opacity-50" />
                <button onClick={() => gonder()} disabled={loading || !input.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-gray-900 text-white rounded-xl hover:bg-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                  <span className="text-lg">➔</span>
                </button>
              </div>
            </div>
          </div>

          {/* YAN PANEL */}
          <div className="flex flex-col gap-6">

            {/* Aşama bilgisi (staj modunda) */}
            {aktifBaglam && (
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-5 rounded-3xl border border-purple-100 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{aktifBaglam.durum === "kabul" ? "✅" : aktifBaglam.durum === "mulakat" ? "🤝" : "📥"}</span>
                  <h4 className="text-sm font-bold text-purple-900">Bağlam</h4>
                </div>
                <div className="text-xs text-purple-800 leading-relaxed">
                  <p><span className="font-bold">Şirket:</span> {aktifBaglam.sirket_adi || "—"}</p>
                  <p><span className="font-bold">Pozisyon:</span> {aktifBaglam.pozisyon}</p>
                  <p><span className="font-bold">Aşama:</span> <span className={`${DURUM_RENK[aktifBaglam.durum] || ""} px-2 py-0.5 rounded-full font-bold`}>{DURUM_LABEL[aktifBaglam.durum] || aktifBaglam.durum}</span></p>
                </div>
                {aktifBaglam.asama_aciklama && (
                  <p className="text-[11px] text-purple-700 italic leading-relaxed border-t border-purple-100 pt-2">
                    💡 {aktifBaglam.asama_aciklama}
                  </p>
                )}
              </div>
            )}

            {/* Hızlı Sorular */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Hızlı Sorular</h3>
                <p className="text-[11px] text-gray-400 font-medium">
                  {aktifBaglam ? "Aşamana özel" : "Tıklayarak sor"}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {hizliSorular.length === 0 ? (
                  <p className="text-xs text-gray-400">Bu aşama için hazır soru yok</p>
                ) : hizliSorular.map((q, idx) => (
                  <button key={idx} onClick={() => gonder(q.t)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-50 hover:bg-gray-50 transition-all text-left group cursor-pointer">
                    <span className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0
                      ${q.c || (aktifBaglam ? "bg-purple-50 text-purple-600 border-purple-100 border" : "bg-blue-50 text-blue-600 border border-blue-100")}`}>
                      {q.i || "💡"}
                    </span>
                    <span className="text-xs font-bold text-gray-700 group-hover:text-black">{q.t}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Popüler (sadece genel modda) */}
            {!aktifBaglam && (
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4">
                <h3 className="text-sm font-bold text-gray-900">Popüler Konular</h3>
                <div className="flex flex-col gap-1">
                  {POPULER.map((item, idx) => (
                    <button key={idx} onClick={() => gonder(item)}
                      className="w-full text-left py-2.5 text-xs font-semibold text-gray-600 hover:text-blue-600 hover:translate-x-1 transition-all cursor-pointer">
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
