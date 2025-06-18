import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend, Cell, PieChart, Pie, LineChart, Line } from 'recharts';
import './Dashboard.css';
import DashboardStatInfo from './DashboardStatInfo';

const PARAMETER_OPTIONS = [
  { key: 'BOD', label: 'BOD' },
  { key: 'COD', label: 'COD' },
  { key: 'pH', label: 'pH' },
  { key: 'TDS', label: 'TDS' },
  { key: 'DO', label: 'DO' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'turbidity', label: 'Turbidity' },
];

const Dashboard = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [data, setData] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [selectedParam, setSelectedParam] = useState('BOD');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    axios.get(`${apiUrl}/api/samples/all`)
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

  // Filter by date range
  const filteredData = safeData.filter(entry => {
    if (!entry.sampleMeta?.timestamp) return true;
    const ts = new Date(entry.sampleMeta.timestamp);
    const from = dateRange.from ? new Date(dateRange.from) : null;
    const to = dateRange.to ? new Date(dateRange.to) : null;
    if (from && ts < from) return false;
    if (to && ts > to) return false;
    return true;
  });

  // Extract unique method names
  const methodNames = Array.from(new Set(filteredData.map(entry => entry.method?.name).filter(Boolean)));

  // Group by batchId and stage
  const batches = {};
  filteredData.forEach(entry => {
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
    if (!beforeDye || !afterDye || beforeDye.absorbanceInitial == null || afterDye.absorbanceFinal == null) return null;
    const removal = beforeDye.absorbanceInitial !== 0
      ? ((beforeDye.absorbanceInitial - afterDye.absorbanceFinal) / beforeDye.absorbanceInitial) * 100
      : null;
    return {
      batch: batchId,
      ColorRemoval: removal !== null ? Math.round(removal * 100) / 100 : null
    };
  }).filter(d => d && d.ColorRemoval !== null);

  // --- Executive Summary Stats ---
  const totalBatches = Object.keys(batches).length;
  const avgReduction = beforeAfterChartData.length > 0
    ? (beforeAfterChartData.reduce((acc, d) => acc + ((d.Before && d.After) ? ((d.Before - d.After) / d.Before) * 100 : 0), 0) / beforeAfterChartData.length).toFixed(2)
    : 'N/A';
  const bestBatch = beforeAfterChartData.reduce((best, d) => {
    if (!d.Before || !d.After) return best;
    const reduction = ((d.Before - d.After) / d.Before) * 100;
    if (!best || reduction > best.reduction) return { batch: d.batch, reduction };
    return best;
  }, null);

  // --- Visual Diversity Example: Pie chart for batch distribution by method ---
  const methodBatchCounts = methodNames.map(name => ({
    name,
    value: filteredData.filter(entry => entry.method?.name === name).length
  }));

  // --- Trends Example: Line chart for selected parameter over time ---
  const timelineData = filteredData
    .filter(entry => entry.measurements?.waterQuality?.[selectedParam] !== undefined)
    .map(entry => ({
      timestamp: entry.sampleMeta.timestamp,
      value: entry.measurements.waterQuality[selectedParam],
      batch: entry.sampleMeta.batchId
    }))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // --- User Guidance Tooltips ---
  const statCardTooltips = [
    'Total number of unique batches in the selected range.\nA batch is a unique experiment or sample set.',
    'Average reduction (%) for the selected parameter across all batches.\nCalculation: ((Before - After) / Before) * 100, averaged over all batches.',
    'Batch with the highest reduction for the selected parameter.\nCalculation: ((Before - After) / Before) * 100, highest among all batches.'
  ];
  const infoIcon = (content) => (
    <span className="info-icon" tabIndex={0} title={content} style={{cursor:'pointer',marginLeft:4}}>&#9432;</span>
  );

  // Defensive fix for NaN/undefined values in chart data
  const safeBeforeAfterChartData = beforeAfterChartData.map(d => ({
    ...d,
    Before: isNaN(d.Before) || d.Before == null ? 0 : d.Before,
    After: isNaN(d.After) || d.After == null ? 0 : d.After
  }));
  const safeDyeBeforeAfterChartData = dyeBeforeAfterChartData.map(d => ({
    ...d,
    Initial: isNaN(d.Initial) || d.Initial == null ? 0 : d.Initial,
    Final: isNaN(d.Final) || d.Final == null ? 0 : d.Final
  }));
  const safeColorRemovalChartData = colorRemovalChartData.map(d => ({
    ...d,
    ColorRemoval: isNaN(d.ColorRemoval) || d.ColorRemoval == null ? 0 : d.ColorRemoval
  }));

  return (
    <div style={{color:'#fff', padding: 32}}>
      <h1 style={{color:'#ffd700', marginBottom: 32}}>Summary</h1>
      {/* Interactive Filters - moved above cards */}
      <div className="dashboard-filters" style={{marginBottom: '2.5rem'}}>
        <label htmlFor="method-select">Method:</label>
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
        <label htmlFor="param-select">Parameter:</label>
        <select
          id="param-select"
          value={selectedParam}
          onChange={e => setSelectedParam(e.target.value)}
        >
          {PARAMETER_OPTIONS.map(opt => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
        <label>Date Range:</label>
        <input type="date" value={dateRange.from} onChange={e => setDateRange(r => ({...r, from: e.target.value}))} />
        <span style={{color:'#ffd700', fontWeight:600}}>-</span>
        <input type="date" value={dateRange.to} onChange={e => setDateRange(r => ({...r, to: e.target.value}))} />
      </div>
      {/* Executive Summary / Key Stats */}
      <div className="dashboard-stats">
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-icon" role="img" aria-label="batches">📦</span>
          <div className="dashboard-stat-label">Total Batches
            <DashboardStatInfo tooltip={statCardTooltips[0]} />
          </div>
          <div className="dashboard-stat-value">{totalBatches}</div>
        </div>
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-icon" role="img" aria-label="reduction">📉</span>
          <div className="dashboard-stat-label">Avg. {selectedParam} Reduction
            <DashboardStatInfo tooltip={statCardTooltips[1]} />
          </div>
          <div className="dashboard-stat-value">{avgReduction}%</div>
        </div>
        <div className="dashboard-stat-card">
          <span className="dashboard-stat-icon" role="img" aria-label="best">🏆</span>
          <div className="dashboard-stat-label">Best Batch
            <DashboardStatInfo tooltip={statCardTooltips[2]} />
          </div>
          <div className="dashboard-stat-value">{bestBatch ? bestBatch.batch : 'N/A'}</div>
          <div className="dashboard-stat-desc">{bestBatch ? `${bestBatch.reduction.toFixed(2)}% reduction` : ''}</div>
        </div>
      </div>
      {/* Visual Diversity: Pie chart for batch distribution by method */}
      <div className="dashboard-section">
        <div className="dashboard-section-title">
          Batch Distribution by Method
          <DashboardStatInfo tooltip="Pie chart showing the proportion of batches for each method. Hover on slices for details." />
        </div>
        <div className="dashboard-section-info">Shows the proportion of batches for each method. <span style={{color:'#ffd700'}}>Total: {filteredData.length}</span></div>
        <ResponsiveContainer width="100%" height={340}>
          <PieChart>
            <Pie
              data={methodBatchCounts}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={140}
              label={({name, value}) => `${name}: ${value}`}
            >
              {methodBatchCounts.map((entry, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={[
                    '#ffd700', '#43cea2', '#4f8cff', '#ffb347',
                    '#7f53ac', '#e040fb', '#00c49a', '#ff6384'
                  ][idx % 8]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{marginTop:8, color:'#aaa', textAlign:'center'}}>
          {methodBatchCounts.map(m => <span key={m.name} style={{marginRight:16, color:'#ffd700'}}>{m.name}: {m.value}</span>)}
        </div>
      </div>
      {/* Trends: Line chart for selected parameter over time */}
      <div className="dashboard-section">
        <div className="dashboard-section-title">
          {selectedParam} Trend Over Time
          <DashboardStatInfo tooltip={`Line chart showing how ${selectedParam} values change over time for all batches. X-axis: date, Y-axis: value.`} />
        </div>
        <div className="dashboard-section-info">Shows how {selectedParam} values change over time for all batches.</div>
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
      </div>
      {/* Existing Dashboard Cards in 2-per-row flex layout */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, marginBottom: 32 }}>
        {/* Before/After Comparison Chart */}
        <div className="dashboard-section" style={{flex: '1 1 400px', minWidth: 400, maxWidth: 600}}>
          <div className="dashboard-section-title">
            Before/After Comparison ({selectedParam})
            <DashboardStatInfo tooltip={`Bar chart showing before and after values for each batch for ${selectedParam}. Useful for visualizing reduction.`} />
          </div>
          <div className="dashboard-section-info">Bars show before and after values for each batch. Reduction is calculated as a percentage for most parameters.</div>
          {safeBeforeAfterChartData.length === 0 ? (
            <p style={{color:'#aaa'}}>No data available for this method/parameter.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={safeBeforeAfterChartData}>
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
        <div className="dashboard-section" style={{flex: '1 1 400px', minWidth: 400, maxWidth: 600}}>
          <div className="dashboard-section-title">
            Dye Concentration (Before/After by Batch)
            <DashboardStatInfo tooltip="Bar chart showing initial and final dye concentrations for each batch. Useful for tracking dye removal." />
          </div>
          <div className="dashboard-section-info">Bars show initial and final dye concentrations for each batch.</div>
          {safeDyeBeforeAfterChartData.length === 0 ? (
            <p style={{color:'#aaa'}}>No dye concentration data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={safeDyeBeforeAfterChartData}>
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
        <div className="dashboard-section" style={{flex: '1 1 400px', minWidth: 400, maxWidth: 600}}>
          <div className="dashboard-section-title">
            Color Removal Efficiency (by Batch)
            <DashboardStatInfo tooltip="Bar chart showing color removal efficiency (%) for each batch, calculated from absorbance values." />
          </div>
          <div className="dashboard-section-info">Bars show color removal efficiency (%) for each batch, calculated from absorbance values.</div>
          {safeColorRemovalChartData.length === 0 ? (
            <p style={{color:'#aaa'}}>No color removal data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={safeColorRemovalChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="batch" stroke="#fff" />
                <YAxis stroke="#fff" />
                <Tooltip contentStyle={{background:'#232323',color:'#fff',border:'1px solid #444'}} itemStyle={{color:'#ffd700'}} cursor={{ fill: 'rgba(87, 104, 139, 0.25)' }} />
                <Legend wrapperStyle={{color:'#fff'}}/>
                <Bar dataKey="ColorRemoval" radius={[4,4,0,0]}>
                  {safeColorRemovalChartData.map((entry, idx) => (
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
