import React, { useState } from 'react';
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

const PredictionForm = () => {
  const [input, setInput] = useState(initialInput);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');

  const handleChange = (e) => {
    setInput({ ...input, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setStatus('Generating prediction...');
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.prediction);
        setStatus('');
      } else {
        setError(data.error || 'Prediction failed');
        setStatus('');
      }
    } catch (err) {
      setError('Network error');
      setStatus('');
    }
    setLoading(false);
  };

  return (
    <div className="prediction-form-container extra-wide">
      <h2>AI Bioremediation Prediction</h2>
      <form onSubmit={handleSubmit}>
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
        <button type="submit" disabled={loading}>Predict</button>
      </form>
      {loading && <p className="status-info">{status}</p>}
      {result !== null && (
        <div className="prediction-result typewriter-effect">
          <strong>Prediction:</strong> <Typewriter text={result} />
        </div>
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default PredictionForm;
