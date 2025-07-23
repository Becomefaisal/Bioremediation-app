import React, { useState, useEffect } from 'react';
import SampleChatCard from './SampleChatCard';

const API_BASE = import.meta.env.VITE_API_URL;

const SampleAskTab = () => {
  const [samples, setSamples] = useState([]);
  const [selectedSample, setSelectedSample] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/samples/all`)
      .then(res => res.json())
      .then(data => {
        setSamples(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load samples');
        setLoading(false);
      });
  }, []);

  const handleSelect = (sample) => {
    setSelectedSample(sample);
  };
  const handleBack = () => {
    setSelectedSample(null);
  };

  return (
    <div style={{marginTop: '2rem'}}>
      {!selectedSample ? (
        <>
          <h3>Ask AI for Sample</h3>
          {loading && <div>Loading samples...</div>}
          {error && <div className="error">{error}</div>}
          <table style={{width:'100%',background:'#232734',color:'#fff',borderRadius:'10px',marginTop:'1rem'}}>
            <thead>
              <tr style={{background:'#181b20'}}>
                <th>Sample ID</th>
                <th>Method</th>
                <th>Timestamp</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {samples.map(sample => (
                <tr key={sample._id}>
                  <td>{sample._id}</td>
                  <td>{sample.method?.name || '-'}</td>
                  <td>{sample.sampleMeta?.timestamp ? new Date(sample.sampleMeta.timestamp).toLocaleString() : '-'}</td>
                  <td>
                    <button onClick={() => handleSelect(sample)} style={{padding:'4px 12px',borderRadius:'6px',background:'#ffd700',color:'#232734',fontWeight:600,border:'none',cursor:'pointer'}}>Ask AI</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <SampleChatCard sample={selectedSample} onBack={handleBack} />
      )}
    </div>
  );
};

export default SampleAskTab;
