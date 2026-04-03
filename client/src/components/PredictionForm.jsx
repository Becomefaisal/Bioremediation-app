import React, { useState, useRef } from 'react';
import SampleAskTab from './SampleAskTab';
import './PredictionForm.css';

const pollutantOptions = [
  'Oil',
  'Heavy Metal',
  'Pesticide',
  'Solvent',
  'Plastic',
  'Pharmaceutical',
  'Other',
];

const remediationOptions = [
  'Phytoremediation',
  'Bioventing',
  'Bioaugmentation',
  'Biostimulation',
  'Composting',
  'Landfarming',
  'Other',
];

const initialInput = {
  pollutantType: '',
  concentration: '',
  temperature: '',
  ph: '',
  remediationMethod: '',
  duration: '',
  siteDescription: '',
  microbes: '',
};

function Typewriter({ text }) {
  const [displayed, setDisplayed] = useState('');
  React.useEffect(() => {
    setDisplayed('');
    if (!text) return;
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed((prev) => prev + text[i]);
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 18);
    return () => clearInterval(interval);
  }, [text]);
  return <span>{displayed}</span>;
}

function getSessionId() {
  let id = localStorage.getItem('sessionId');
  if (!id) {
    id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('sessionId', id);
  }
  return id;
}

const PredictionForm = () => {
  const [activeTab, setActiveTab] = useState('predict');
  const [input, setInput] = useState(initialInput);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  const [chatHistory, setChatHistory] = useState([]); // [{role: 'user'|'ai', content: string}]
  const [question, setQuestion] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [asking, setAsking] = useState(false);
  const [lastPredictedInput, setLastPredictedInput] = useState(null); // Store input used for last prediction
  const [previewImage, setPreviewImage] = useState('');
  const [previewLabel, setPreviewLabel] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const apiUrl = import.meta.env.VITE_API_URL;

  const startCamera = async () => {
    try {
      if (cameraOn) return;
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setCameraOn(true);
      setPreviewLabel('Live camera preview (initializing)');
    } catch (err) {
      console.error('Error enabling camera', err);
      setPreviewLabel('Camera access denied or unavailable.');
      setCameraOn(false);
      setCameraStream(null);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
    setPreviewLabel('Camera stopped.');
  };

  const takeSnapshot = () => {
    if (!cameraOn) {
      setPreviewLabel('Camera not started. Press Start Camera first.');
      return;
    }
    if (!videoRef.current || !canvasRef.current) {
      setPreviewLabel('Snapshot failed: camera not ready.');
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');
    setPreviewImage(dataUrl);
    setPreviewLabel('Captured from camera');
    // do not send to server; retained only for local preview
  };

  React.useEffect(() => {
    if (!cameraOn || !cameraStream || !videoRef.current) return;
    const videoEl = videoRef.current;
    videoEl.srcObject = cameraStream;
    videoEl.muted = true;
    videoEl.playsInline = true;

    const playPromise = videoEl.play();
    if (playPromise !== undefined) {
      playPromise.catch((playErr) => {
        console.warn('Video playback blocked by browser policy', playErr);
        setPreviewLabel('Live stream started, but auto-play blocked. Click Take Snapshot when ready.');
      });
    }

    const cleanup = () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      if (videoEl) {
        videoEl.pause();
        videoEl.srcObject = null;
      }
    };

    return cleanup;
  }, [cameraOn, cameraStream]);

  React.useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  const handleChange = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setStatus('Generating prediction...');
    const controller = new AbortController();
    setAbortController(controller);
    try {
      const res = await fetch(`${apiUrl}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': getSessionId() },
        body: JSON.stringify(input),
        signal: controller.signal,
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.prediction);
        setStatus('');
        setLastPredictedInput(input); // Store the input used for this prediction
        // Always start chat history with the prediction as the first AI message
        let newChatHistory = [{ role: 'ai', content: data.prediction, typewriter: true }];
        // If user asked an initial question, send it to the AI and add both Q and A to chat
        if (question.trim()) {
          newChatHistory.push({ role: 'user', content: question });
          setChatHistory(newChatHistory); // Show user question immediately
          // Call AI endpoint with question and sample (input)
          try {
            const aiRes = await fetch(`${apiUrl}/api/ai-chat/ask`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-session-id': getSessionId() },
              body: JSON.stringify({ question, sample: input }),
            });
            const aiData = await aiRes.json();
            if (aiRes.ok && aiData.answer) {
              setChatHistory(prev => [...prev, { role: 'ai', content: aiData.answer, typewriter: true }]);
            } else {
              setError(aiData.error || 'AI response failed');
            }
          } catch {
            setError('Network error');
          }
        } else {
          setChatHistory(newChatHistory);
        }
        setQuestion('');
      } else {
        setError(data.error || 'Prediction failed');
        setStatus('');
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        setError('Prediction stopped by user.');
      } else {
        setError('Network error');
      }
      setStatus('');
    }
    setLoading(false);
    setAbortController(null);
  };

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    setAsking(true);
    setError(null);
    setChatHistory(prev => [...prev, { role: 'user', content: question }]);
    try {
      const res = await fetch(`${apiUrl}/api/ai-chat/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': getSessionId() },
        body: JSON.stringify({ question, sample: input }),
      });
      const data = await res.json();
      if (res.ok && data.answer) {
        setChatHistory(prev => [...prev, { role: 'ai', content: data.answer, typewriter: true }]);
      } else {
        setError(data.error || 'AI response failed');
      }
    } catch {
      setError('Network error');
    }
    setAsking(false);
    setQuestion('');
  };

  const uploadImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewLabel(`Uploaded: ${file.name}`);
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleFollowUp = async (e) => {
    e.preventDefault();
    if (!followUp.trim()) return;
    setAsking(true);
    setError(null);
    setChatHistory(prev => [...prev, { role: 'user', content: followUp }]);
    try {
      // Use the input from the last prediction for all follow-up questions
      const res = await fetch(`${apiUrl}/api/ai-chat/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': getSessionId() },
        body: JSON.stringify({ question: followUp, sample: lastPredictedInput }),
      });
      const data = await res.json();
      if (res.ok && data.answer) {
        setChatHistory(prev => [...prev, { role: 'ai', content: data.answer, typewriter: true }]);
      } else {
        setError(data.error || 'AI response failed');
      }
    } catch {
      setError('Network error');
    }
    setAsking(false);
    setFollowUp('');
  };

  return (
    <div className="prediction-form-container extra-wide">
      <div style={{display:'flex',gap:'2rem',marginBottom:'2rem'}}>
        <button
          onClick={() => setActiveTab('predict')}
          style={{
            background: activeTab === 'predict' ? '#ffd700' : '#232734',
            color: activeTab === 'predict' ? '#232734' : '#ffd700',
            fontWeight: 700,
            border: 'none',
            borderBottom: activeTab === 'predict' ? '3px solid #ffd700' : '3px solid transparent',
            fontSize: '1.2rem',
            padding: '10px 32px',
            borderRadius: '12px 12px 0 0',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >AI Prediction</button>
        <button
          onClick={() => setActiveTab('sample')}
          style={{
            background: activeTab === 'sample' ? '#ffd700' : '#232734',
            color: activeTab === 'sample' ? '#232734' : '#ffd700',
            fontWeight: 700,
            border: 'none',
            borderBottom: activeTab === 'sample' ? '3px solid #ffd700' : '3px solid transparent',
            fontSize: '1.2rem',
            padding: '10px 32px',
            borderRadius: '12px 12px 0 0',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >Ask AI for Sample</button>
      </div>
      {activeTab === 'predict' && (
        <>
          <h2>AI Bioremediation Prediction</h2>
          {/* ...existing prediction form and chat UI... */}
          {/* PATCH MARKER: Begin prediction form */}
          <form onSubmit={handleSubmit}>
            {/* ...existing form fields... */}
            <div className="form-row">
              <label>
                Pollutant Type
                <select name="pollutantType" value={input.pollutantType} onChange={handleChange} required>
                  <option value="" disabled>Select pollutant</option>
                  {pollutantOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>
              <label>
                Concentration (mg/L)
                <input name="concentration" value={input.concentration} onChange={handleChange} required type="number" min="0" step="any" placeholder="e.g. 50" />
              </label>
            </div>
            <div className="form-row">
              <label>
                Temperature (°C)
                <input name="temperature" value={input.temperature} onChange={handleChange} required type="number" step="any" placeholder="e.g. 25" />
              </label>
              <label>
                pH
                <input name="ph" value={input.ph} onChange={handleChange} required type="number" step="any" placeholder="e.g. 7" />
              </label>
            </div>
            <div className="form-row">
              <label>
                Remediation Method
                <select name="remediationMethod" value={input.remediationMethod} onChange={handleChange} required>
                  <option value="" disabled>Select method</option>
                  {remediationOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>
              <label>
                Duration (days)
                <input name="duration" value={input.duration} onChange={handleChange} required type="number" min="1" placeholder="e.g. 30" />
              </label>
            </div>
            <div className="form-row">
              <label className="full-width">
                Microbes to be used
                <input name="microbes" value={input.microbes} onChange={handleChange} required placeholder="e.g. Pseudomonas, Bacillus, Fungi, etc." />
              </label>
            </div>
            <div className="form-row">
              <label className="full-width">
                Site Description
                <textarea name="siteDescription" value={input.siteDescription} onChange={handleChange} required placeholder="Describe the site, soil type, history, etc." rows={3} />
              </label>
            </div>
            {/* Ask a question before prediction */}
            <div className="form-row">
              <label className="full-width">
                Ask a question (optional)
                <input
                  type="text"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder="e.g. What is the expected outcome?"
                  disabled={loading || asking}
                />
              </label>
            </div>
            <div className="form-row" style={{ alignItems: 'center', gap: '0.5rem' }}>
              {!cameraOn ? (
                <button type="button" onClick={startCamera} className="form-btn" style={{ padding: '0.5rem 0.8rem' }}>📷 Start Camera</button>
              ) : (
                <>
                  <button type="button" onClick={takeSnapshot} className="form-btn" style={{ padding: '0.5rem 0.8rem' }}>📸 Take Snapshot</button>
                  <button type="button" onClick={stopCamera} className="form-btn" style={{ padding: '0.5rem 0.8rem' }}>✖️ Stop Camera</button>
                </>
              )}
              <button type="button" onClick={() => fileInputRef.current?.click()} className="form-btn" style={{ padding: '0.5rem 0.8rem' }}>⬆️ Upload Image</button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={uploadImage}
              />
            </div>

            <div className="form-row" style={{ marginTop: '0.8rem', gap: '1rem' }}>
              <div style={{ flex: 1, minWidth: '260px' }}>
                <div style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Live Camera Feed</div>
                <div style={{ width: '100%', minHeight: '180px', borderRadius: '8px', border: '1px solid #444', background: '#121623', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {cameraOn ? (
                    <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                  ) : (
                    <div style={{ color: '#aaa', textAlign: 'center', padding: '0.8rem' }}>Camera is off. Click Start Camera.</div>
                  )}
                </div>
              </div>

              <div style={{ flex: 1, minWidth: '260px' }}>
                <div style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '0.3rem' }}>Captured / Uploaded Image</div>
                <div style={{ width: '100%', minHeight: '180px', borderRadius: '8px', border: '1px solid #444', background: '#121623', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {previewImage ? (
                    <img src={previewImage} alt="preview" style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', borderRadius: '8px' }} />
                  ) : (
                    <div style={{ color: '#aaa', textAlign: 'center', padding: '0.8rem' }}>No image captured/uploaded yet.</div>
                  )}
                </div>
                {previewLabel && <div style={{ color: '#fff', fontSize: '0.85rem', marginTop: '0.5rem' }}>{previewLabel}</div>}
              </div>
            </div>

            {/* Hidden canvas used for snapshot capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <button type="submit" disabled={loading}>Predict</button>
          </form>
          {loading && <p className="status-info">{status}</p>}
          {loading && (
            <button type="button" onClick={() => { if (abortController) abortController.abort(); }} style={{marginTop:'1rem',background:'#c62828',color:'#fff',padding:'8px 18px',border:'none',borderRadius:'6px',fontWeight:600,cursor:'pointer'}}>Stop Prediction</button>
          )}
          {error && <p className="error">{error}</p>}
          {/* Chat history and follow-up after prediction */}
          {result !== null && (
            <div className="prediction-result typewriter-effect scrollable-chat" style={{maxHeight:'220px',overflowY:'auto',marginTop:'2rem',marginBottom:'1rem'}}>
              {chatHistory.map((msg, idx) => (
                <div key={idx} style={{
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
            </div>
          )}
          {result !== null && (
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
              <button type="submit" className="send-btn" disabled={asking || !followUp.trim()} style={{marginTop:'0.5rem'}}>Send</button>
            </form>
          )}
          {asking && <div className="status-info">AI is thinking...</div>}
        </>
      )}
      {activeTab === 'sample' && <SampleAskTab />}
    </div>
  );
};

export default PredictionForm;
