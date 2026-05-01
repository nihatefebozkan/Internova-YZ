// Mentor Bot Chat Arayüzü — Sağ alt köşe floating chat, öğrenci/şirket modları
// Dolduracak: Yusuf & Rabia (aiService mentorChat + stream yanıt desteği)

import { useState } from 'react';

function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');

  const sendMessage = async () => {
    // TODO: aiService.mentorChat() çağır, mesajı messages'a ekle
  };

  return (
    <div className={`chatbot-container ${isOpen ? 'open' : ''}`}>
      <button className="chatbot-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? '✕' : '💬'}
      </button>

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>{msg.content}</div>
            ))}
          </div>
          <div className="chatbot-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Mentor'una sor..."
            />
            <button onClick={sendMessage}>Gönder</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatBot;
