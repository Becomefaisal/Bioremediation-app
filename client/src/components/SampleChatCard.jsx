import React, { useState, useRef } from 'react';
import Typewriter from './Typewriter';
import './AnalysisPage.css';

const API_BASE = import.meta.env.VITE_API_URL;

function SampleChatCard({ sample, onBack }) {
  const [question, setQuestion] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [history, setHistory] = useState([]); // [{role: 'user'|'ai', content, typewriter?}]
  const [loading, setLoading] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState(null);
  const [abortController, setAbortController] = useState(null);
  const [uploadedImageName, setUploadedImageName] = useState('');
  const chatEndRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedImageName(file.name);
      // read file to memory but do nothing with it
      const reader = new FileReader();
      reader.onload = () => {
        console.log('Uploaded image data (not used):', reader.result);
      };
      reader.readAsDataURL(file);
    }
    // clear input so same file can be uploaded again if needed
    e.target.value = '';
  };

  React.useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setError(null);
    setHistory(prev => [...prev, { role: 'user', content: question }]);
    const controller = new AbortController();
    setAbortController(controller);
    try {
      const res = await fetch(`${API_BASE}/api/ai-chat/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, sample }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (res.ok && data.answer) {
        setHistory(prev => [...prev, { role: 'ai', content: cleanSampleResponse(data.answer), typewriter: true }]);
      } else {
        setError(data.error || 'AI response failed');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Prediction stopped by user.');
      } else {
        setError('Network error');
      }
    }
    setAsking(false);
    setQuestion('');
    setAbortController(null);
  };

  const handleFollowUp = async (e) => {
    e.preventDefault();
    if (!followUp.trim()) return;
    setAsking(true);
    setError(null);
    setHistory(prev => [...prev, { role: 'user', content: followUp }]);
    const controller = new AbortController();
    setAbortController(controller);
    try {
      const res = await fetch(`${API_BASE}/api/ai-chat/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: followUp, sample }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (res.ok && data.answer) {
        setHistory(prev => [...prev, { role: 'ai', content: cleanSampleResponse(data.answer), typewriter: true }]);
      } else {
        setError(data.error || 'AI response failed');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Prediction stopped by user.');
      } else {
        setError('Network error');
      }
    }
    setAsking(false);
    setFollowUp('');
    setAbortController(null);
  };

  const captureImage = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      // Wait a bit for video to load
      setTimeout(() => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        // Stop the stream
        stream.getTracks().forEach(track => track.stop());
        // Do nothing with the image
      }, 1000);
    } catch (err) {
      console.error('Error accessing camera:', err);
    }
  };

  return (
    <div className="modal-card" style={{maxWidth:'1200px',margin:'2rem auto',background:'#232734',color:'#fff',borderRadius:'16px',padding:'2.5rem',boxShadow:'0 4px 32px rgba(0,0,0,0.18)'}}>
      <button className="form-btn" onClick={onBack} style={{marginBottom:'1rem',background:'#ffd700',color:'#232734',fontWeight:700,border:'none',borderRadius:'6px',padding:'6px 18px',fontSize:'1rem',cursor:'pointer'}}>← Back</button>
      <h2 style={{fontSize:'2rem',marginBottom:'1.5rem'}}>Ask AI About Sample</h2>
      <div className="modal-sample-info" style={{
        marginBottom:'1.5rem',
        background:'#181b20',
        padding:'2rem 2.5rem',
        borderRadius:'16px',
        boxShadow:'0 2px 12px rgba(0,0,0,0.12)',
        maxWidth:'600px',
        marginLeft:'auto',
        marginRight:'auto',
        fontSize:'1.13rem',
        color:'#fff',
        fontFamily:'inherit',
        fontWeight:400
      }}>
        <div style={{textAlign:'center',marginBottom:'1.2rem'}}>
          <span style={{fontWeight:700,fontSize:'1.1rem'}}>ID:</span> {sample._id}<br/>
          <span style={{fontWeight:700,fontSize:'1.1rem'}}>Method:</span> {sample.method?.name || '-'}<br/>
          <span style={{fontWeight:700,fontSize:'1.1rem'}}>Timestamp:</span> {sample.sampleMeta?.timestamp ? new Date(sample.sampleMeta.timestamp).toLocaleString() : '-'}
        </div>
        <div style={{margin:'0.7rem 0',borderTop:'1px solid #333',borderBottom:'1px solid #333',padding:'0.7rem 0'}}>
          <div style={{fontWeight:700,fontSize:'1.15rem',color:'#ffd700',marginBottom:'0.5rem'}}>Water Quality</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'1.5rem'}}>
            <div>pH: <b>{sample.measurements?.waterQuality?.pH ?? '-'}</b></div>
            <div>Temperature: <b>{sample.measurements?.waterQuality?.temperature ?? '-'}</b> °C</div>
            <div>Turbidity: <b>{sample.measurements?.waterQuality?.turbidity ?? '-'}</b></div>
            <div>DO: <b>{sample.measurements?.waterQuality?.DO ?? '-'}</b></div>
            <div>BOD: <b>{sample.measurements?.waterQuality?.BOD ?? '-'}</b></div>
            <div>COD: <b>{sample.measurements?.waterQuality?.COD ?? '-'}</b></div>
            <div>TDS: <b>{sample.measurements?.waterQuality?.TDS ?? '-'}</b></div>
            <div>EC: <b>{sample.measurements?.waterQuality?.EC ?? '-'}</b></div>
          </div>
        </div>
        <div style={{margin:'0.7rem 0',borderTop:'1px solid #333',borderBottom:'1px solid #333',padding:'0.7rem 0'}}>
          <div style={{fontWeight:700,fontSize:'1.15rem',color:'#ffd700',marginBottom:'0.5rem'}}>Dye</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'1.5rem'}}>
            <div>Name: <b>{sample.measurements?.dye?.name ?? '-'}</b></div>
            <div>Initial Conc.: <b>{sample.measurements?.dye?.initialConcentration ?? '-'}</b></div>
            <div>Final Conc.: <b>{sample.measurements?.dye?.finalConcentration ?? '-'}</b></div>
            <div>Abs. Initial: <b>{sample.measurements?.dye?.absorbanceInitial ?? '-'}</b></div>
            <div>Abs. Final: <b>{sample.measurements?.dye?.absorbanceFinal ?? '-'}</b></div>
            <div>Wavelength: <b>{sample.measurements?.dye?.wavelength ?? '-'}</b></div>
          </div>
        </div>
        <div style={{margin:'0.7rem 0',borderTop:'1px solid #333',borderBottom:'1px solid #333',padding:'0.7rem 0'}}>
          <div style={{fontWeight:700,fontSize:'1.15rem',color:'#ffd700',marginBottom:'0.5rem'}}>Heavy Metals</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'1.5rem'}}>
            <div>Cr: <b>{sample.measurements?.heavyMetals?.Cr ?? '-'}</b></div>
            <div>Pb: <b>{sample.measurements?.heavyMetals?.Pb ?? '-'}</b></div>
            <div>Zn: <b>{sample.measurements?.heavyMetals?.Zn ?? '-'}</b></div>
            <div>Cu: <b>{sample.measurements?.heavyMetals?.Cu ?? '-'}</b></div>
            <div>Ni: <b>{sample.measurements?.heavyMetals?.Ni ?? '-'}</b></div>
            <div>Ammonia: <b>{sample.measurements?.heavyMetals?.Ammonia ?? '-'}</b></div>
          </div>
        </div>
        <div style={{margin:'0.7rem 0',borderTop:'1px solid #333',padding:'0.7rem 0'}}>
          <div style={{fontWeight:700,fontSize:'1.15rem',color:'#ffd700',marginBottom:'0.5rem'}}>Notes</div>
          <div>{sample.note || '-'}</div>
        </div>
      </div>
      <div className="chat-history-scroll" style={{margin:'1rem 0',maxHeight:'260px',overflowY:'auto',background:'#181b20',borderRadius:'8px',padding:'1rem'}}>
        {history.length === 0 && <div style={{color:'#aaa'}}>No questions yet.</div>}
        {history.map((msg, i) => (
          <div key={i} style={{
            background: msg.role === 'ai' ? 'rgba(46, 125, 50, 0.18)' : 'rgba(33, 150, 243, 0.12)',
            color: msg.role === 'ai' ? '#00e676' : '#1976d2',
            padding: '10px 16px',
            borderRadius: '8px',
            marginBottom: '8px',
            fontFamily: 'monospace',
            fontSize: '1.1rem',
            whiteSpace: 'pre-wrap',
            fontWeight: msg.role === 'ai' ? 600 : 400
          }}>
            {msg.role === 'ai' ? <span>AI: </span> : <span>You: </span>}
            {msg.typewriter ? <Typewriter text={msg.content} /> : msg.content}
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      {error && <div className="error" style={{marginBottom:'1rem'}}>{error}</div>}
      {/* Only show one input at a time: if no history, show main question; else, show follow-up */}
      {history.length === 0 ? (
        <form onSubmit={handleAsk} className="chat-input-row" style={{marginBottom:'1rem'}}>
          <input
            className="search-input"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Type your question..."
            disabled={asking}
          />
          <button type="button" onClick={captureImage} className="form-btn" style={{marginRight: '0.5rem'}}>📷 Capture Image</button>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="form-btn" style={{marginRight: '0.5rem'}}>⬆️ Upload Image</button>
          <button className="form-btn" type="submit" disabled={asking || !question.trim()}>{asking ? 'Asking...' : 'Ask'}</button>
        </form>
      ) : (
        <form onSubmit={handleFollowUp} style={{marginTop:'1rem'}}>
          <label className="full-width">
            Ask a follow-up question
            <input
              type="text"
              value={followUp}
              onChange={e => setFollowUp(e.target.value)}
              placeholder="Type your follow-up question..."
              disabled={asking}
            />
          </label>
          <button type="button" onClick={captureImage} className="send-btn" style={{marginRight: '0.5rem'}}>📷 Capture Image</button>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="send-btn" style={{marginRight: '0.5rem'}}>⬆️ Upload Image</button>
          <button type="submit" className="send-btn" disabled={asking || !followUp.trim()} style={{marginTop:'0.5rem'}}>Send</button>
        </form>
      )}
      {asking && abortController && (
        <button type="button" onClick={() => abortController.abort()} style={{marginBottom:'1rem',background:'#c62828',color:'#fff',padding:'8px 18px',border:'none',borderRadius:'6px',fontWeight:600,cursor:'pointer'}}>Stop Prediction</button>
      )}
      {asking && <div className="status-info">AI is thinking...</div>}
      {uploadedImageName && <div className="status-info">Uploaded image: {uploadedImageName}</div>}
      <video ref={videoRef} style={{display: 'none'}}></video>
      <canvas ref={canvasRef} style={{display: 'none'}}></canvas>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />
    </div>
  );
}
function cleanSampleResponse(text) {
  if (!text) return '';
  // Remove <think>...</think> and [think]...[/think] and similar, but avoid unicode/angle brackets that break JSX
  return text
    .replace(/(<think>[\s\S]*?<\/think>)/gi, '')
    .replace(/\[t?hink\][\s\S]*?\[\/t?hink\]/gi, '')
    .replace(/^(te|Te)\b[ ]*/i, 'The ')
    .replace(/\bundefined[\.,!?:;]?/gi, '')
    .replace(/\s{2,}/g, ' ')

    .trim();
}

export default SampleChatCard;
