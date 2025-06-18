import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import './ComparePage.css';
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

// Example method descriptions (could be fetched from API or config)
const METHOD_DESCRIPTIONS = {
  'Biological Treatment A': 'Uses microorganisms to degrade contaminants in wastewater.',
  'Chemical Oxidation B': 'Applies chemical agents to oxidize and remove pollutants.',
  // Add more as needed
};

const ComparePage = () => {
  const [data, setData] = useState([]);
  const [compareParam, setCompareParam] = useState('BOD');
  const [compareMethodA, setCompareMethodA] = useState('');
  const [compareMethodB, setCompareMethodB] = useState('');
  const [compareResult, setCompareResult] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [lastComparedParam, setLastComparedParam] = useState(null);

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

  const methodNames = Array.from(new Set((data || []).map(entry => entry.method?.name).filter(Boolean)));

  const handleCompare = async () => {
    setCompareLoading(true);
    setCompareResult(null);
    setLastComparedParam(compareParam); // Save the param at compare time
    try {
      const res = await axios.get(`${apiUrl}/api/samples/compare-methods`, {
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

  // Helper for summary
  const getSummary = () => {
    if (!compareResult || compareResult.error) return null;
    const a = compareResult[compareMethodA]?.avgReduction;
    const b = compareResult[compareMethodB]?.avgReduction;
    if (a == null && b == null) return null;
    if (a > b) return `${compareMethodA} performed better for ${compareParam} reduction.`;
    if (b > a) return `${compareMethodB} performed better for ${compareParam} reduction.`;
    if (a === b) return `Both methods performed equally for ${compareParam}.`;
    return null;
  };

  // Example raw data table (simulate)
  const getTableRows = () => {
    if (!compareResult || compareResult.error) return [];
    return [
      {
        method: compareMethodA,
        avgReduction: compareResult[compareMethodA]?.avgReduction ?? 'N/A',
        n: compareResult[compareMethodA]?.n ?? '-',
      },
      {
        method: compareMethodB,
        avgReduction: compareResult[compareMethodB]?.avgReduction ?? 'N/A',
        n: compareResult[compareMethodB]?.n ?? '-',
      },
    ];
  };

  return (
    <div className="compare-card">
      <div className="compare-header">Compare Methods</div>
      <div className="compare-note">
        <b>Note:</b> The chart below shows <span className="highlight">reduction values (%)</span> for each method (except for pH, which may show a difference).
      </div>
      {/* Form Row */}
      <div className="compare-form-row">
        <label htmlFor="param-select">Parameter:</label>
        <select id="param-select" className="compare-select" value={compareParam} onChange={e => setCompareParam(e.target.value)}>
          {PARAMETER_OPTIONS.map(opt => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
        <label htmlFor="methodA-select">Method A:</label>
        <select id="methodA-select" className="compare-select" value={compareMethodA} onChange={e => setCompareMethodA(e.target.value)}>
          <option value="">Select</option>
          {methodNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <label htmlFor="methodB-select">Method B:</label>
        <select id="methodB-select" className="compare-select" value={compareMethodB} onChange={e => setCompareMethodB(e.target.value)}>
          <option value="">Select</option>
          {methodNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <button className="compare-btn" onClick={handleCompare} disabled={!compareMethodA || !compareMethodB || compareMethodA === compareMethodB || compareLoading}>
          {compareLoading ? 'Comparing...' : 'Compare'}
        </button>
      </div>
      {/* Content Row: Method Details side by side above, Chart below */}
      <div className="compare-content" style={{marginBottom: '2.5rem', justifyContent: 'center', gap: '2.5rem', flexWrap: 'wrap'}}>
        {/* Method A Details */}
        {compareMethodA && (
          <div className="method-details">
            <div className="method-badge">A</div>
            <div className="method-title">{compareMethodA}</div>
            <div className="method-desc">{METHOD_DESCRIPTIONS[compareMethodA] || 'No description available.'}</div>
          </div>
        )}
        {/* Method B Details */}
        {compareMethodB && (
          <div className="method-details">
            <div className="method-badge">B</div>
            <div className="method-title">{compareMethodB}</div>
            <div className="method-desc">{METHOD_DESCRIPTIONS[compareMethodB] || 'No description available.'}</div>
          </div>
        )}
      </div>
      {/* Chart Panel below, wider */}
      <div className="compare-chart-panel" style={{margin: '0 auto 2.5rem auto', minWidth: 500, maxWidth: 800, width: '90%'}}>
        <div style={{color:'#ffd700', fontWeight:700, fontSize:'1.15rem', marginBottom:12, display:'flex', alignItems:'center', gap:8}}>
          {(compareResult && !compareResult.error && lastComparedParam)
            ? `${PARAMETER_OPTIONS.find(opt => opt.key === lastComparedParam)?.label || lastComparedParam} Reduction (%)`
            : 'Reduction (%)'}
          <DashboardStatInfo tooltip={`Bar chart comparing the reduction (%) for the selected parameter (${PARAMETER_OPTIONS.find(opt => opt.key === (lastComparedParam || compareParam))?.label || (lastComparedParam || compareParam)}) between the two chosen methods.`} />
        </div>
        {compareResult && !compareResult.error ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={[
              { name: compareMethodA, Reduction: compareResult[compareMethodA]?.avgReduction ?? 0 },
              { name: compareMethodB, Reduction: compareResult[compareMethodB]?.avgReduction ?? 0 }
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="name" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip contentStyle={{background:'#232323',color:'#fff',border:'1px solid #444'}}/>
              <Bar dataKey="Reduction" fill="#ffd700" isAnimationActive={true} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{color:'#aaa', marginTop: 40, minHeight: 60}}>Select methods and compare to see results.</div>
        )}
      </div>
      {/* Results Summary */}
      {compareResult && !compareResult.error && (
        <div className="compare-summary">
          {getSummary()}<br/>
          <span style={{color:'#fff', fontWeight:400, fontSize:'1rem'}}>
            {compareMethodA}: <b>{compareResult[compareMethodA]?.avgReduction?.toFixed(2) ?? 'N/A'}%</b> &nbsp;|&nbsp; {compareMethodB}: <b>{compareResult[compareMethodB]?.avgReduction?.toFixed(2) ?? 'N/A'}%</b>
          </span>
        </div>
      )}
      {/* Data Table */}
      {compareResult && !compareResult.error && (
        <table className="compare-table">
          <thead>
            <tr>
              <th>Method</th>
              <th>Avg. Reduction (%)</th>
              <th>Sample Size</th>
            </tr>
          </thead>
          <tbody>
            {getTableRows().map(row => (
              <tr key={row.method}>
                <td>{row.method}</td>
                <td>{row.avgReduction !== 'N/A' ? row.avgReduction.toFixed(2) : 'N/A'}</td>
                <td>{row.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {/* Call to Action */}
      <div style={{marginTop: 24, textAlign: 'center'}}>
        <button className="compare-btn" style={{background:'#232323', color:'#ffd700', border:'1px solid #ffd700', marginRight: 12}} onClick={() => { setCompareMethodA(''); setCompareMethodB(''); setCompareResult(null); }}>Reset</button>
        <button className="compare-btn" onClick={() => window.scrollTo({top:0,behavior:'smooth'})}>Try Another Comparison</button>
      </div>
    </div>
  );
};

export default ComparePage;
