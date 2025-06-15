import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, Cell } from 'recharts';
import { LineChart, Line } from 'recharts';
import Modal from 'react-modal';

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

const customModalStyles = {
  content: {
    maxWidth: 500,
    margin: 'auto',
    borderRadius: 12,
    background: '#232323',
    color: '#f2f2f2',
    border: '1px solid #444',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
    padding: '2rem',
    fontFamily: 'inherit',
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.7)'
  }
};

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedParam, setSelectedParam] = useState('BOD');
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareParam, setCompareParam] = useState('BOD');
  const [compareMethodA, setCompareMethodA] = useState('');
  const [compareMethodB, setCompareMethodB] = useState('');
  const [compareResult, setCompareResult] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

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

  // Timeline data for selected method and parameter (only 'after' samples)
  const timelineData = safeData
    .filter(entry =>
      entry.method && entry.sampleMeta &&
      entry.method.name === selectedMethod &&
      entry.sampleMeta.stage === 'after' &&
      entry.measurements && entry.measurements.waterQuality &&
      entry.measurements.waterQuality[selectedParam] !== undefined
    )
    .map(entry => ({
      timestamp: entry.sampleMeta.timestamp,
      value: entry.measurements.waterQuality[selectedParam],
      batch: entry.sampleMeta.batchId
    }))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Compare Methods handler
  const handleCompare = async () => {
    setCompareLoading(true);
    setCompareResult(null);
    try {
      const res = await axios.get('/api/samples/compare-methods', {
        params: {
          param: compareParam,
          methodA: compareMethodA,
          methodB: compareMethodB
        }
      });
      setCompareResult(res.data);
    } catch (err) {
      setCompareResult({ error: 'Comparison failed.' });
    }
    setCompareLoading(false);
  };

  return (
    <div>
      <h1>Dashboard</h1>
      {/* Compare Methods Button */}
      <button style={{marginBottom: 20}} onClick={() => setCompareModalOpen(true)}>
        Compare Methods
      </button>
      {/* Compare Methods Modal */}
      <Modal
        isOpen={compareModalOpen}
        onRequestClose={() => setCompareModalOpen(false)}
        contentLabel="Compare Methods"
        style={customModalStyles}
        ariaHideApp={false}
      >
        <h2 style={{marginBottom: 8}}>Compare Methods</h2>
        <div style={{marginBottom: 16, fontSize: '1rem', color: '#aaa'}}>
          <b>Note:</b> The chart below shows <span style={{color:'#ffd700'}}>reduction values (%)</span> for each method (except for pH, which may show a difference).
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Parameter: </label>
          <select value={compareParam} onChange={e => setCompareParam(e.target.value)}>
            {PARAMETER_OPTIONS.map(opt => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Method A: </label>
          <select value={compareMethodA} onChange={e => setCompareMethodA(e.target.value)}>
            <option value="">Select</option>
            {methodNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Method B: </label>
          <select value={compareMethodB} onChange={e => setCompareMethodB(e.target.value)}>
            <option value="">Select</option>
            {methodNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <button style={{background:'#444',color:'#fff',padding:'8px 18px',border:'none',borderRadius:6,cursor:'pointer'}} onClick={handleCompare} disabled={!compareMethodA || !compareMethodB || compareMethodA === compareMethodB || compareLoading}>
          {compareLoading ? 'Comparing...' : 'Compare'}
        </button>
        <button style={{marginLeft: 10,background:'#333',color:'#fff',padding:'8px 18px',border:'none',borderRadius:6,cursor:'pointer'}} onClick={() => setCompareModalOpen(false)}>Close</button>
        {/* Show result as bar chart or error */}
        {compareResult && !compareResult.error && (
          <div style={{marginTop: 20}}>
            <h3 style={{color:'#ffd700'}}>Average Reduction (%)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                { name: compareMethodA, Reduction: compareResult[compareMethodA]?.avgReduction ?? 0 },
                { name: compareMethodB, Reduction: compareResult[compareMethodB]?.avgReduction ?? 0 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="name" stroke="#fff" />
                <YAxis stroke="#fff" />
                <Tooltip contentStyle={{background:'#232323',color:'#fff',border:'1px solid #444'}}/>
                <Bar dataKey="Reduction" fill="#ffd700" />
              </BarChart>
            </ResponsiveContainer>
            <div style={{marginTop: 10}}>
              <b>{compareMethodA}:</b> {compareResult[compareMethodA]?.avgReduction?.toFixed(2) ?? 'N/A'}%<br/>
              <b>{compareMethodB}:</b> {compareResult[compareMethodB]?.avgReduction?.toFixed(2) ?? 'N/A'}%
            </div>
          </div>
        )}
        {compareResult && compareResult.error && (
          <div style={{color: 'red', marginTop: 10}}>{compareResult.error}</div>
        )}
      </Modal>
      {/* Method selection dropdown */}
      <div style={{ marginBottom: 20 }}>
        <label htmlFor="method-select">Select Method: </label>
        <select
          id="method-select"
          value={selectedMethod}
          onChange={e => setSelectedMethod(e.target.value)}
        >
          <option value="">All Methods</option>
          {methodNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>
      {/* Parameter selection dropdown */}
      <div style={{ marginBottom: 20 }}>
        <label htmlFor="param-select">Compare Parameter: </label>
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
      {/* Before/After Comparison Chart */}
      <div style={{marginTop: 32, background: '#232323', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.2)', color: '#f2f2f2'}}>
        <h2 style={{color:'#ffd700'}}>Before/After Comparison ({selectedParam})</h2>
        <div style={{fontSize:'1rem',color:'#aaa',marginBottom:8}}>
          <b>Note:</b> Bars show before and after values for each batch. Reduction is calculated as a percentage for most parameters.
        </div>
        {beforeAfterChartData.length === 0 ? (
          <p>No data available for this method/parameter.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={beforeAfterChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="batch" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip contentStyle={{background:'#232323',color:'#fff',border:'1px solid #444'}} cursor={{ fill: 'rgba(87, 104, 139, 0.25)' }}/>
              <Legend wrapperStyle={{color:'#fff'}}/>
              <Bar dataKey="Before" fill="#4f8cff" radius={[4,4,0,0]} /> {/* blue for before */}
              <Bar dataKey="After" fill="#ffb347" radius={[4,4,0,0]} /> {/* orange-yellow for after */}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div style={{marginTop: 32, background: '#232323', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.2)', color: '#f2f2f2'}}>
        <h2 style={{color:'#ffd700'}}>Dye Concentration (Before/After by Batch)</h2>
        <div style={{fontSize:'1rem',color:'#aaa',marginBottom:8}}>
          <b>Note:</b> Bars show initial and final dye concentrations for each batch.
        </div>
        {dyeBeforeAfterChartData.length === 0 ? (
          <p>No dye concentration data available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dyeBeforeAfterChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="batch" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip contentStyle={{background:'#232323',color:'#fff',border:'1px solid #444'}} cursor={{ fill: 'rgba(87, 104, 139, 0.25)' }}/>
              <Legend wrapperStyle={{color:'#fff'}}/>
              <Bar dataKey="Initial" fill="#4f8cff" radius={[4,4,0,0]} /> {/* blue for initial */}
              <Bar dataKey="Final" fill="#ffb347" radius={[4,4,0,0]} /> {/* orange-yellow for final */}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      <div style={{marginTop: 32, background: '#232323', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.2)', color: '#f2f2f2'}}>
        <h2 style={{color:'#ffd700'}}>Color Removal Efficiency (by Batch)</h2>
        <div style={{fontSize:'1rem',color:'#aaa',marginBottom:8}}>
          <b>Note:</b> Bars show color removal efficiency (%) for each batch, calculated from absorbance values.
        </div>
        {colorRemovalChartData.length === 0 ? (
          <p>No color removal data available.</p>
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
      {/* Timeline Chart */}
      <div style={{marginTop: 32, background: '#232323', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.2)', color: '#f2f2f2'}}>
        <h2 style={{color:'#ffd700'}}>Timeline ({selectedParam}) for {selectedMethod || '...'}</h2>
        <div style={{fontSize:'1rem',color:'#aaa',marginBottom:8}}>
          <b>Note:</b> Line shows how the selected parameter changes over time for the chosen method (after samples only).
        </div>
        {selectedMethod && timelineData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="timestamp" tickFormatter={t => new Date(t).toLocaleDateString()} stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip labelFormatter={t => new Date(t).toLocaleString()} contentStyle={{background:'#232323',color:'#fff',border:'1px solid #444'}}/>
              <Legend wrapperStyle={{color:'#fff'}}/>
              <Line type="monotone" dataKey="value" name={selectedParam} stroke="#ffd700" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p>No timeline data for this method/parameter.</p>
        )}
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
