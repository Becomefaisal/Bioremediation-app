import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, Cell, LineChart, Line } from 'recharts';

const PARAMETER_OPTIONS = [
  { key: 'BOD', label: 'BOD' },
  { key: 'COD', label: 'COD' },
  { key: 'pH', label: 'pH' },
  { key: 'TDS', label: 'TDS' },
  { key: 'DO', label: 'DO' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'turbidity', label: 'Turbidity' },
];

const BatchDetail = () => {
  const { batchId } = useParams();
  const [data, setData] = useState([]);
  const [selectedParam, setSelectedParam] = useState('BOD');
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    axios.get(`${apiUrl}/api/samples/all`)
      .then(res => {
        if (Array.isArray(res.data)) setData(res.data);
        else if (res.data && typeof res.data === 'object') setData([res.data]);
        else setData([]);
      })
      .catch(() => setData([]));
  }, []);

  // Filter for this batch
  const batchEntries = data.filter(entry => entry.sampleMeta?.batchId === batchId);
  const stages = {};
  batchEntries.forEach(entry => {
    if (!entry.sampleMeta) return;
    stages[entry.sampleMeta.stage] = entry;
  });

  // Before/After chart data
  const beforeVal = stages.before?.measurements?.waterQuality?.[selectedParam];
  const afterVal = stages.after?.measurements?.waterQuality?.[selectedParam];
  const beforeAfterChartData = [
    { stage: 'Before', value: beforeVal },
    { stage: 'After', value: afterVal }
  ];

  // Dye chart data
  const beforeDye = stages.before?.measurements?.dye;
  const afterDye = stages.after?.measurements?.dye;
  const dyeChartData = beforeDye && afterDye ? [{
    stage: 'Initial', value: beforeDye.initialConcentration ?? null
  }, {
    stage: 'Final', value: afterDye.finalConcentration ?? null
  }] : [];

  // Color removal efficiency
  let colorRemoval = null;
  if (beforeDye && afterDye && beforeDye.absorbanceInitial && afterDye.absorbanceFinal) {
    colorRemoval = beforeDye.absorbanceInitial !== 0
      ? ((beforeDye.absorbanceInitial - afterDye.absorbanceFinal) / beforeDye.absorbanceInitial) * 100
      : null;
    if (colorRemoval !== null) colorRemoval = Math.round(colorRemoval * 100) / 100;
  }

  // Timeline for this batch (after samples)
  const timelineData = batchEntries
    .filter(entry => entry.sampleMeta?.stage === 'after' && entry.measurements?.waterQuality?.[selectedParam] !== undefined)
    .map(entry => ({
      timestamp: entry.sampleMeta.timestamp,
      value: entry.measurements.waterQuality[selectedParam],
    }))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return (
    <div style={{color:'#fff', padding: 32}}>
      <h2 style={{color:'#ffd700'}}>Batch Details: {batchId}</h2>
      <div style={{ marginBottom: 20 }}>
        <label htmlFor="param-select">Parameter: </label>
        <select
          id="param-select"
          value={selectedParam}
          onChange={e => setSelectedParam(e.target.value)}
        >
          {PARAMETER_OPTIONS.map(opt => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
      </div>
      {/* Before/After Chart */}
      <div style={{marginTop: 24, background: '#232323', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.2)', color: '#f2f2f2'}}>
        <h3 style={{color:'#ffd700'}}>Before/After ({selectedParam})</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={beforeAfterChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="stage" stroke="#fff" />
            <YAxis stroke="#fff" />
            <Tooltip contentStyle={{background:'#232323',color:'#fff',border:'1px solid #444'}}/>
            <Legend wrapperStyle={{color:'#fff'}}/>
            <Bar dataKey="value" fill="#4f8cff" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Dye Chart */}
      <div style={{marginTop: 24, background: '#232323', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.2)', color: '#f2f2f2'}}>
        <h3 style={{color:'#ffd700'}}>Dye Concentration</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dyeChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis dataKey="stage" stroke="#fff" />
            <YAxis stroke="#fff" />
            <Tooltip contentStyle={{background:'#232323',color:'#fff',border:'1px solid #444'}}/>
            <Legend wrapperStyle={{color:'#fff'}}/>
            <Bar dataKey="value" fill="#43cea2" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Color Removal Efficiency */}
      {colorRemoval !== null && (
        <div style={{marginTop: 24, background: '#232323', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.2)', color: '#f2f2f2'}}>
          <h3 style={{color:'#ffd700'}}>Color Removal Efficiency</h3>
          <div style={{fontSize:'1.5rem', color:'#ffd700', fontWeight:700}}>{colorRemoval}%</div>
        </div>
      )}
      {/* Timeline for this batch */}
      <div style={{marginTop: 24, background: '#232323', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.2)', color: '#f2f2f2'}}>
        <h3 style={{color:'#ffd700'}}>Timeline ({selectedParam})</h3>
        {timelineData.length === 0 ? (
          <p>No timeline data for this batch/parameter.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="timestamp" tickFormatter={t => new Date(t).toLocaleDateString()} stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip labelFormatter={t => new Date(t).toLocaleString()} contentStyle={{background:'#232323',color:'#fff',border:'1px solid #444'}}/>
              <Legend wrapperStyle={{color:'#fff'}}/>
              <Line type="monotone" dataKey="value" name={selectedParam} stroke="#ffd700" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default BatchDetail;
