import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, Cell } from 'recharts';
import { LineChart, Line } from 'recharts';

const PARAMETER_OPTIONS = [
  { key: 'BOD', label: 'BOD' },
  { key: 'COD', label: 'COD' },
  { key: 'pH', label: 'pH' },
  { key: 'TDS', label: 'TDS' },
  { key: 'DO', label: 'DO' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'turbidity', label: 'Turbidity' },
  // Add more as needed
];

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedParam, setSelectedParam] = useState('BOD');

  useEffect(() => {
    axios.get('/api/samples/all')
      .then(res => {
        if (Array.isArray(res.data)) {
          setData(res.data);
        } else if (res.data && typeof res.data === 'object') {
          setData([res.data]);
        } else {
          setData([]);
        }
      })
      .catch(() => setData([]));
  }, []);

  const safeData = Array.isArray(data) ? data : [];

  // Extract unique method names
  const methodNames = Array.from(new Set(safeData.map(entry => entry.method?.name).filter(Boolean)));

  // Group by batchId and stage
  const batches = {};
  safeData.forEach(entry => {
    if (!entry.method || !entry.sampleMeta) return;
    if (selectedMethod && entry.method.name !== selectedMethod) return;
    const batchId = entry.sampleMeta.batchId;
    if (!batches[batchId]) batches[batchId] = {};
    batches[batchId][entry.sampleMeta.stage] = entry;
  });

  // Prepare before/after comparison data for selected parameter
  const beforeAfterChartData = Object.entries(batches).map(([batchId, stages]) => {
    const beforeVal = stages.before?.measurements?.waterQuality?.[selectedParam];
    const afterVal = stages.after?.measurements?.waterQuality?.[selectedParam];
    if (beforeVal === undefined && afterVal === undefined) return null;
    return {
      batch: batchId,
      Before: beforeVal,
      After: afterVal
    };
  }).filter(Boolean);

  // Helper to extract number from MongoDB extended JSON
  const extractNumber = v => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') return parseFloat(v);
    if (v && typeof v === 'object') {
      if ('$numberInt' in v) return parseInt(v['$numberInt'], 10);
      if ('$numberDouble' in v) return parseFloat(v['$numberDouble']);
      if ('$numberLong' in v) return parseInt(v['$numberLong'], 10);
    }
    return null;
  };

  // Dye before/after chart by batch
  const dyeBeforeAfterChartData = Object.entries(batches).map(([batchId, stages]) => {
    const beforeDye = stages.before?.measurements?.dye;
    const afterDye = stages.after?.measurements?.dye;
    if (!beforeDye && !afterDye) return null;
    return {
      batch: batchId,
      Initial: beforeDye?.initialConcentration ?? null,
      Final: afterDye?.finalConcentration ?? null
    };
  }).filter(d => d && d.Initial !== null && d.Final !== null);

  // Color removal efficiency by batch
  const colorRemovalChartData = Object.entries(batches).map(([batchId, stages]) => {
    const beforeDye = stages.before?.measurements?.dye;
    const afterDye = stages.after?.measurements?.dye;
    if (!beforeDye || !afterDye || !beforeDye.absorbanceInitial || !afterDye.absorbanceFinal) return null;
    const removal = beforeDye.absorbanceInitial !== 0
      ? ((beforeDye.absorbanceInitial - afterDye.absorbanceFinal) / beforeDye.absorbanceInitial) * 100
      : null;
    return {
      batch: batchId,
      ColorRemoval: removal !== null ? Math.round(removal * 100) / 100 : null
    };
  }).filter(d => d && d.ColorRemoval !== null);

  return (
    <div style={{color:'#fff', padding: 32}}>
      <h1 style={{color:'#ffd700', marginBottom: 32}}>Dashboard</h1>
      {/* Method selection dropdown */}
      <div style={{ marginBottom: 20 }}>
        <label htmlFor="method-select" style={{ color: '#ffd700', fontWeight: 600, marginRight: 8 }}>Select Method: </label>
        <select
          id="method-select"
          value={selectedMethod}
          onChange={e => setSelectedMethod(e.target.value)}
          style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #444', background: '#232323', color: '#ffd700', fontWeight: 500 }}
        >
          <option value="">All Methods</option>
          {methodNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>
      {/* Parameter selection dropdown */}
      <div style={{ marginBottom: 32 }}>
        <label htmlFor="param-select" style={{ color: '#ffd700', fontWeight: 600, marginRight: 8 }}>Compare Parameter: </label>
        <select
          id="param-select"
          value={selectedParam}
          onChange={e => setSelectedParam(e.target.value)}
          style={{ padding: '6px 16px', borderRadius: 6, border: '1px solid #444', background: '#232323', color: '#ffd700', fontWeight: 500 }}
        >
          {PARAMETER_OPTIONS.map(opt => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
      </div>
      {/* Dashboard Cards in 2-per-row flex layout */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, marginBottom: 32 }}>
        {/* Before/After Comparison Chart */}
        <div style={{ flex: '1 1 400px', minWidth: 400, maxWidth: 600, background: '#232323', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.2)', color: '#f2f2f2', marginBottom: 32 }}>
          <h2 style={{color:'#ffd700', fontSize:'1.1rem', marginBottom:8}}>Before/After Comparison ({selectedParam})</h2>
          <div style={{fontSize:'1rem',color:'#aaa',marginBottom:8}}>
            <b>Note:</b> Bars show before and after values for each batch. Reduction is calculated as a percentage for most parameters.
          </div>
          {beforeAfterChartData.length === 0 ? (
            <p style={{color:'#aaa'}}>No data available for this method/parameter.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={beforeAfterChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="batch" stroke="#fff" />
                <YAxis stroke="#fff" />
                <Tooltip contentStyle={{background:'#232323',color:'#fff',border:'1px solid #444'}} cursor={{ fill: 'rgba(87, 104, 139, 0.25)' }}/>
                <Legend wrapperStyle={{color:'#fff'}}/>
                <Bar dataKey="Before" fill="#4f8cff" radius={[4,4,0,0]} />
                <Bar dataKey="After" fill="#ffb347" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {/* Dye Concentration (Before/After by Batch) */}
        <div style={{ flex: '1 1 400px', minWidth: 400, maxWidth: 600, background: '#232323', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.2)', color: '#f2f2f2', marginBottom: 32 }}>
          <h2 style={{color:'#ffd700', fontSize:'1.1rem', marginBottom:8}}>Dye Concentration (Before/After by Batch)</h2>
          <div style={{fontSize:'1rem',color:'#aaa',marginBottom:8}}>
            <b>Note:</b> Bars show initial and final dye concentrations for each batch.
          </div>
          {dyeBeforeAfterChartData.length === 0 ? (
            <p style={{color:'#aaa'}}>No dye concentration data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dyeBeforeAfterChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="batch" stroke="#fff" />
                <YAxis stroke="#fff" />
                <Tooltip contentStyle={{background:'#232323',color:'#fff',border:'1px solid #444'}} cursor={{ fill: 'rgba(87, 104, 139, 0.25)' }}/>
                <Legend wrapperStyle={{color:'#fff'}}/>
                <Bar dataKey="Initial" fill="#4f8cff" radius={[4,4,0,0]} />
                <Bar dataKey="Final" fill="#ffb347" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {/* Color Removal Efficiency (by Batch) */}
        <div style={{ flex: '1 1 400px', minWidth: 400, maxWidth: 600, background: '#232323', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.2)', color: '#f2f2f2', marginBottom: 32 }}>
          <h2 style={{color:'#ffd700', fontSize:'1.1rem', marginBottom:8}}>Color Removal Efficiency (by Batch)</h2>
          <div style={{fontSize:'1rem',color:'#aaa',marginBottom:8}}>
            <b>Note:</b> Bars show color removal efficiency (%) for each batch, calculated from absorbance values.
          </div>
          {colorRemovalChartData.length === 0 ? (
            <p style={{color:'#aaa'}}>No color removal data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={colorRemovalChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="batch" stroke="#fff" />
                <YAxis stroke="#fff" />
                <Tooltip contentStyle={{background:'#232323',color:'#fff',border:'1px solid #444'}} itemStyle={{color:'#ffd700'}} cursor={{ fill: 'rgba(87, 104, 139, 0.25)' }}/>
                <Legend wrapperStyle={{color:'#fff'}}/>
                <Bar dataKey="ColorRemoval" radius={[4,4,0,0]}>
                  {colorRemovalChartData.map((entry, idx) => (
                    <Cell key={`removal-${idx}`} fill={['#00c6fb','#005bea','#43cea2','#ffb347','#7f53ac','#e040fb','#ffd700','#00c49a'][idx % 8]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

/* Add this CSS to your project (e.g., in App.css or Dashboard.css):
.chart-hover-effect:hover {
  background: linear-gradient(120deg, #232323 80%, #223a5f 100%);
  box-shadow: 0 4px 32px rgba(34,58,95,0.18);
}
*/
