// Mentor Bot — BTÜ staj yönetmeliği soruları + kariyer rehberliği
import { useState, useRef, useEffect } from 'react';
import api from '../../services/api';

const HOSGELDIN = {
  role: 'assistant',
  content: 'Merhaba! Ben InternovaYZ asistanıyım 👋 BTÜ staj yönetmeliği, kariyer planlaması veya platform hakkında sorularınızı yanıtlayabilirim.',
};

function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([HOSGELDIN]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const soru = input.trim();
    if (!soru || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: soru }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/ai/ask', { soru });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.yanit }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Üzgünüm, şu an yanıt veremiyorum. Lütfen tekrar deneyin.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const HIZLI_SORULAR = [
    'Staj süresi kaç gün?',
    'Staj defteri nasıl doldurulur?',
    'Yurt dışı staj yapabilir miyim?',
    'Staj sigortası nasıl işliyor?',
  ];

  return (
    <div className={`chatbot-container ${isOpen ? 'open' : ''}`}>
      <button className="chatbot-toggle" onClick={() => setIsOpen(!isOpen)}
        title="BTÜ Staj Asistanı">
        {isOpen ? '✕' : '💬'}
      </button>

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <span>🎓 BTÜ Staj Asistanı</span>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message message-${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {loading && (
              <div className="message message-assistant">
                <span className="typing-dots">●●●</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div className="quick-questions">
              {HIZLI_SORULAR.map(s => (
                <button key={s} className="quick-btn"
                  onClick={() => { setInput(s); }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="chatbot-input">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Sorunuzu yazın..."
              disabled={loading}
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()}>
              ➤
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatBot;
