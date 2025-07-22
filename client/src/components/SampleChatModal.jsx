import React, { useState } from 'react';
import './AnalysisPage.css';

const API_BASE = import.meta.env.VITE_API_URL;

function SampleChatModal({ sample, onClose }) {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/ai-chat/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, sample })
      });
      if (!res.ok) throw new Error('Failed to get AI response');
      const data = await res.json();
      setHistory([...history, { question, response: data.answer }]);
      setQuestion('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <button className="close-btn" onClick={onClose}>×</button>
        <h3>Ask AI About Sample</h3>
        <div className="modal-sample-info">
          <div><b>ID:</b> {sample._id}</div>
          <div><b>Method:</b> {sample.method?.name || '-'}</div>
          <div><b>Timestamp:</b> {sample.sampleMeta?.timestamp ? new Date(sample.sampleMeta.timestamp).toLocaleString() : '-'}</div>
        </div>
        <div className="chat-history-scroll">
          {history.length === 0 && <div style={{color:'#aaa'}}>No questions yet.</div>}
          {history.map((item, i) => (
            <div key={i} className="chat-entry">
              <div className="chat-question">Q: {item.question}</div>
              <div className="chat-response">A: {item.response}</div>
            </div>
          ))}
        </div>
        {error && <div className="error" style={{marginBottom:'1rem'}}>{error}</div>}
        <div className="chat-input-row">
          <input
            className="search-input"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Type your question..."
            disabled={loading}
          />
          <button className="form-btn" onClick={handleAsk} disabled={loading || !question.trim()}>{loading ? 'Asking...' : 'Ask'}</button>
        </div>
      </div>
    </div>
  );
}

export default SampleChatModal;
