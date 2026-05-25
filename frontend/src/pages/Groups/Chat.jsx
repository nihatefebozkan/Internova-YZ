// Grup sohbet — WebSocket + tarih ayracı + avatar baloncuk + online sayacı
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

function wsUrl(groupId, token) {
  const base = (process.env.REACT_APP_API_URL || 'http://localhost:8002').replace(/^http/, 'ws');
  return `${base}/ws/groups/${groupId}/chat?token=${encodeURIComponent(token)}`;
}

const ay = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];

function tarihEtiketi(d) {
  if (!d) return '';
  const now = new Date();
  const bugun = now.toDateString();
  const dun = new Date(now); dun.setDate(now.getDate() - 1);
  const dunStr = dun.toDateString();
  const dt = new Date(d);
  if (dt.toDateString() === bugun) return 'Bugün';
  if (dt.toDateString() === dunStr) return 'Dün';
  return `${dt.getDate()} ${ay[dt.getMonth()]} ${dt.getFullYear()}`;
}

function harf(ad) { return (ad?.[0] || '?').toUpperCase(); }

function MesajBaloncugu({ m, benim, kullaniciRengi, oncekiMesajAyniMi }) {
  const ad = `${m.sender?.ad || ''} ${m.sender?.soyad || ''}`.trim() || `Kullanıcı #${m.sender_id}`;
  return (
    <div className={`flex gap-2 ${benim ? 'justify-end' : 'justify-start'}`}>
      {/* Sol avatar (benim değilsem) */}
      {!benim && (
        <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold text-xs flex-shrink-0 ${oncekiMesajAyniMi ? 'invisible' : kullaniciRengi}`}>
          {harf(m.sender?.ad)}
        </div>
      )}

      <div className={`max-w-[70%] flex flex-col ${benim ? 'items-end' : 'items-start'}`}>
        {!benim && !oncekiMesajAyniMi && (
          <p className="text-[10px] font-bold text-gray-500 mb-0.5 px-2">{ad}</p>
        )}
        <div className={`px-3.5 py-2 text-sm whitespace-pre-wrap break-words
          ${benim
            ? 'bg-blue-600 text-white rounded-2xl rounded-tr-md shadow-sm'
            : 'bg-white text-gray-900 border border-gray-100 rounded-2xl rounded-tl-md shadow-sm'}`}>
          {m.icerik}
        </div>
        <p className={`text-[10px] mt-0.5 px-2 ${benim ? 'text-gray-400' : 'text-gray-400'}`}>
          {new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
}

const KULLANICI_RENKLERI = ['bg-pink-500','bg-purple-500','bg-indigo-500','bg-teal-500','bg-amber-500','bg-rose-500','bg-cyan-500','bg-lime-500'];

export default function GroupChat() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [online, setOnline] = useState([]);
  const [grup, setGrup] = useState(null);
  const [baglanti, setBaglanti] = useState('baglaniyor');  // baglaniyor | acik | kapali
  const wsRef = useRef(null);
  const endRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => {
    api.get(`/groups/${id}`).then(r => setGrup(r.data)).catch(() => {});
    api.get(`/groups/${id}/messages?limit=100`).then(r => setMsgs(r.data)).catch(() => {});
  }, [id]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const ws = new WebSocket(wsUrl(id, token));
    wsRef.current = ws;
    ws.onopen = () => setBaglanti('acik');
    ws.onclose = () => setBaglanti('kapali');
    ws.onerror = () => setBaglanti('kapali');
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data.type === 'message') {
          setMsgs(prev => [...prev, {
            id: data.id, group_id: data.group_id, sender_id: data.sender_id,
            icerik: data.icerik, created_at: data.created_at,
            sender: { ad: data.sender_ad?.split(' ')[0], soyad: data.sender_ad?.split(' ').slice(1).join(' ') },
          }]);
        } else if (data.type === 'presence') {
          setOnline(data.online || []);
        }
      } catch {}
    };
    return () => ws.close();
  }, [id]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = (e) => {
    e?.preventDefault?.();
    const v = text.trim();
    if (!v || wsRef.current?.readyState !== 1) return;
    wsRef.current.send(JSON.stringify({ icerik: v }));
    setText('');
    taRef.current?.focus();
  };

  // Kullanıcı bazında renk haritası (deterministik)
  const kullaniciRengi = useMemo(() => {
    const map = {};
    msgs.forEach(m => {
      if (!(m.sender_id in map)) {
        map[m.sender_id] = KULLANICI_RENKLERI[Object.keys(map).length % KULLANICI_RENKLERI.length];
      }
    });
    return map;
  }, [msgs]);

  // Mesajları gün gruplarına böl
  const gunler = useMemo(() => {
    const out = [];
    let sonGun = '';
    msgs.forEach((m, i) => {
      const g = tarihEtiketi(m.created_at);
      const prev = msgs[i - 1];
      const sameSender = prev && prev.sender_id === m.sender_id
        && (new Date(m.created_at) - new Date(prev.created_at)) < 60_000;
      if (g !== sonGun) {
        out.push({ tip: 'ayrac', deger: g });
        sonGun = g;
      }
      out.push({ tip: 'msg', m, sameSender });
    });
    return out;
  }, [msgs]);

  const baglantiRenk = {
    baglaniyor: { bg: 'bg-amber-50', fg: 'text-amber-700',   dot: 'bg-amber-500',   text: 'Bağlanıyor…' },
    acik:       { bg: 'bg-emerald-50', fg: 'text-emerald-700', dot: 'bg-emerald-500 animate-pulse', text: 'Canlı' },
    kapali:     { bg: 'bg-red-50',   fg: 'text-red-700',     dot: 'bg-red-500',     text: 'Bağlantı koptu' },
  }[baglanti];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate(`/groups/${id}`)}
            className="text-gray-500 hover:text-gray-900 text-lg flex-shrink-0">←</button>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white text-base font-bold flex-shrink-0">💬</div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-gray-900 leading-none truncate">{grup?.ad || 'Grup Sohbeti'}</h1>
            <p className="text-xs text-gray-400 font-medium mt-0.5">{online.length} çevrimiçi · {grup?.memberships?.length || 0} üye</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${baglantiRenk.bg}`}>
          <span className={`h-2 w-2 rounded-full ${baglantiRenk.dot}`} />
          <span className={`text-[11px] font-bold ${baglantiRenk.fg}`}>{baglantiRenk.text}</span>
        </div>
      </header>

      {/* MESAJ ALANI */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 flex flex-col gap-2 overflow-y-auto">
        {msgs.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <span className="text-6xl block mb-3">💬</span>
              <p className="text-base font-bold text-gray-700 mb-1">Henüz mesaj yok</p>
              <p className="text-sm text-gray-400">İlk mesajı sen yaz — grup buradan başlasın!</p>
            </div>
          </div>
        ) : gunler.map((g, i) => {
          if (g.tip === 'ayrac') {
            return (
              <div key={`a-${i}`} className="flex items-center justify-center my-3">
                <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {g.deger}
                </span>
              </div>
            );
          }
          return (
            <MesajBaloncugu key={g.m.id} m={g.m}
              benim={g.m.sender_id === user?.id}
              kullaniciRengi={kullaniciRengi[g.m.sender_id] || 'bg-gray-400'}
              oncekiMesajAyniMi={g.sameSender} />
          );
        })}
        <div ref={endRef} />
      </main>

      {/* INPUT */}
      <form onSubmit={send} className="bg-white border-t border-gray-100 px-4 py-3 sticky bottom-0 z-30">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <textarea ref={taRef} value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); }
            }}
            placeholder="Mesaj yaz… (Enter = gönder, Shift+Enter = yeni satır)"
            rows={1}
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none max-h-32 transition-all" />
          <button type="submit" disabled={!text.trim() || baglanti !== 'acik'}
            className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed px-5 py-2.5 rounded-2xl shadow-sm transition-all flex-shrink-0">
            Gönder
          </button>
        </div>
      </form>
    </div>
  );
}
