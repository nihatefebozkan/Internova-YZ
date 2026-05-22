import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const HIZLI_SORULAR = [
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
  "Teknik becerilerimi nasıl geliştiririm?",
];

const HOSGELDIN = {
  role: "bot",
  content: "Merhaba! Ben InternovaYZ Kariyer Asistanıyım. BTÜ staj yönetmeliği, kariyer planlaması, staj bulma ve başvuru süreçleri hakkında sorularını yanıtlayabilirim. Nasıl yardımcı olabilirim?",
  time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
};

function CareerAssistant() {
  const navigate = useNavigate();
  const [messages,  setMessages]  = useState([HOSGELDIN]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const zaman = () => new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  const gonder = async (soru) => {
    const metin = (soru || input).trim();
    if (!metin || loading) return;

    setMessages(prev => [...prev, { role: "user", content: metin, time: zaman() }]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/ai/ask", { soru: metin });
      setMessages(prev => [...prev, { role: "bot", content: res.data.yanit, time: zaman() }]);
    } catch {
      setMessages(prev => [...prev, {
        role: "bot",
        content: "Şu an yanıt veremiyorum. Lütfen tekrar deneyin.",
        time: zaman(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans antialiased">

      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/student-dashboard")}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-lg">İ</div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 leading-none">InternovaYZ</h1>
            <span className="text-xs text-gray-400 font-medium">Öğrenci</span>
          </div>
        </div>
        <button onClick={() => navigate("/student-dashboard")} className="p-2 hover:bg-gray-50 rounded-full text-red-500 cursor-pointer transition-all">↩</button>
      </header>

      <main className="max-w-[1280px] mx-auto p-6 lg:p-8 flex flex-col gap-6">

        {/* Başlık */}
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Kariyer Asistanı</h2>
          <p className="text-sm text-gray-500 mt-1">Akıllı asistanımız kariyer ve staj sorularını yanıtlıyor</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* CHAT EKRANI */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col h-[650px] overflow-hidden">

            {/* Chat Header */}
            <div className="p-5 border-b border-gray-50 flex items-center gap-4">
              <div className="h-12 w-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center text-xl">🤖</div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Kariyer Asistanı</h3>
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
                    <div className="h-8 w-8 bg-purple-50 text-purple-600 rounded-xl flex-shrink-0 flex items-center justify-center text-xs">🤖</div>
                  )}
                  <div className="flex flex-col gap-1">
                    <div className={`p-4 rounded-2xl text-xs font-medium leading-relaxed
                      ${msg.role === "user"
                        ? "bg-gray-900 text-white rounded-tr-none"
                        : "bg-gray-50 text-gray-700 border border-gray-100 rounded-tl-none"}`}>
                      {msg.content}
                    </div>
                    <span className={`text-[10px] text-gray-400 font-bold ${msg.role === "user" ? "text-right" : "ml-1"}`}>{msg.time}</span>
                  </div>
                </div>
              ))}

              {/* Yazıyor göstergesi */}
              {loading && (
                <div className="flex gap-3 items-start max-w-[88%]">
                  <div className="h-8 w-8 bg-purple-50 text-purple-600 rounded-xl flex-shrink-0 flex items-center justify-center text-xs">🤖</div>
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
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && gonder()}
                  placeholder="Mesajını yaz..."
                  disabled={loading}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-5 pr-14 text-xs font-medium focus:outline-none focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all disabled:opacity-50" />
                <button
                  onClick={() => gonder()}
                  disabled={loading || !input.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-gray-900 text-white rounded-xl hover:bg-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                  <span className="text-lg">➔</span>
                </button>
              </div>
            </div>
          </div>

          {/* YAN PANEL */}
          <div className="flex flex-col gap-6">

            {/* Hızlı Sorular */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Hızlı Sorular</h3>
                <p className="text-[11px] text-gray-400 font-medium">Tıklayarak sor</p>
              </div>
              <div className="flex flex-col gap-2">
                {HIZLI_SORULAR.map((q, idx) => (
                  <button key={idx} onClick={() => gonder(q.t)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-50 hover:bg-gray-50 transition-all text-left group cursor-pointer">
                    <span className={`h-8 w-8 rounded-lg flex items-center justify-center text-sm ${q.c} border flex-shrink-0`}>{q.i}</span>
                    <span className="text-xs font-bold text-gray-700 group-hover:text-black">{q.t}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Popüler Konular */}
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

            {/* İpucu */}
            <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 flex flex-col items-center text-center gap-3">
              <div className="text-2xl">✨</div>
              <div>
                <h4 className="text-xs font-bold text-purple-900">İpucu</h4>
                <p className="text-[11px] text-purple-700 mt-1 font-medium leading-relaxed">
                  BTÜ staj yönetmeliği hakkında sorularınızı sorabilirsiniz. Asistan yönetmeliğe göre yanıt verir.
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}

export default CareerAssistant;
