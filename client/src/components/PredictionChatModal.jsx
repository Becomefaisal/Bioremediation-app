import React, { useState, useRef, useEffect } from 'react';
import './AnalysisPage.css';

const PredictionChatModal = ({ open, onClose, predictionContext }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    if (open) {
      setMessages([]);
      setInput('');
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    try {
      const res = await fetch(`${apiUrl}/api/ai-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: predictionContext, question: input }),
      });
      const data = await res.json();
      if (res.ok && data.answer) {
        setMessages((prev) => [...prev, { role: 'ai', content: data.answer }]);
      } else {
        setError(data.error || 'AI response failed');
      }
    } catch {
      setError('Network error');
    }
    setLoading(false);
    setInput('');
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card chat-modal">
        <button className="close-btn" onClick={onClose}>&times;</button>
        <h3>Ask AI About This Prediction</h3>
        <div className="chat-history scrollable">
          {messages.map((msg, idx) => (
            <div key={idx} className={`chat-msg ${msg.role}`}>{msg.content}</div>
          ))}
          <div ref={chatEndRef} />
        </div>
        {error && <div className="error">{error}</div>}
        <textarea
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder="Ask a follow-up question..."
          rows={2}
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()} className="send-btn">Send</button>
        {loading && <div className="status-info">AI is thinking...</div>}
      </div>
    </div>
  );
};

export default PredictionChatModal;
