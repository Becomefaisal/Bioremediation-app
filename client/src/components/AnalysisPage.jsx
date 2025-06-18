import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { mean, median, standardDeviation, min, max, linearRegression, rSquared, sampleCorrelation } from 'simple-statistics';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ScatterChart, Scatter, Legend } from 'recharts';
import InfoIcon from './InfoIcon';
import MatrixTable from './MatrixTable';
import './AnalysisPage.css';

const PARAM_OPTIONS = [
  { key: 'pH', label: 'pH' },
  { key: 'temperature', label: 'Temperature (°C)' },
  { key: 'turbidity', label: 'Turbidity (NTU)' },
  { key: 'DO', label: 'DO (mg/L)' },
  { key: 'BOD', label: 'BOD (mg/L)' },
  { key: 'COD', label: 'COD (mg/L)' },
  { key: 'TDS', label: 'TDS (mg/L)' },
  { key: 'Cr', label: 'Cr (mg/L)' },
  { key: 'Pb', label: 'Pb (mg/L)' },
  { key: 'Nitrates', label: 'Nitrates (mg/L)' },
  { key: 'Ammonia', label: 'Ammonia (mg/L)' },
  { key: 'initialConcentration', label: 'Dye Initial Conc. (mg/L)' },
  { key: 'finalConcentration', label: 'Dye Final Conc. (mg/L)' },
  { key: 'absorbanceInitial', label: 'Absorbance Before' },
  { key: 'absorbanceFinal', label: 'Absorbance After' },
];

// Helper to group samples by batchId and stage
function groupByBatch(samples) {
  const batches = {};
  for (const s of samples) {
    const batchId = s.sampleMeta?.batchId;
    const stage = s.sampleMeta?.stage;
    if (!batchId || !stage) continue;
    if (!batches[batchId]) batches[batchId] = {};
    batches[batchId][stage] = s;
  }
  return batches;
}

function extractParamFromSample(sample, param) {
  if (!sample) return undefined;
  if (["initialConcentration", "finalConcentration", "absorbanceInitial", "absorbanceFinal"].includes(param)) {
    return sample.measurements?.dye?.[param];
  }
  if (["Cr", "Pb", "Nitrates", "Ammonia"].includes(param)) {
    // Try both heavyMetals and waterQuality, prefer heavyMetals if present
    const heavy = sample.measurements?.heavyMetals?.[param];
    if (typeof heavy === 'number' && !isNaN(heavy)) return heavy;
    const wq = sample.measurements?.waterQuality?.[param];
    if (typeof wq === 'number' && !isNaN(wq)) return wq;
    return undefined;
  }
  // Water quality
  return sample.measurements?.waterQuality?.[param];
}

const AnalysisPage = () => {
  const [data, setData] = useState([]);
  const [param, setParam] = useState('BOD');
  const [timing, setTiming] = useState('before');
  // X/Y for correlation
  const [paramX, setParamX] = useState('BOD');
  const [paramY, setParamY] = useState('COD');
  const [summary, setSummary] = useState({});
  const [correlation, setCorrelation] = useState(null);
  const [regression, setRegression] = useState(null);
  const [correlationError, setCorrelationError] = useState('');

  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    axios.get(`${apiUrl}/api/samples/all`).then(res => setData(res.data || []));
  }, []);

  const batches = useMemo(() => groupByBatch(data), [data]);

  // Summary statistics (use both before and after for matrix, but keep timing for summary card)
  useEffect(() => {
    const values = Object.values(batches)
      .flatMap(batch => ['before', 'after'].map(stage => extractParamFromSample(batch[stage], param)))
      .filter(v => typeof v === 'number' && !isNaN(v));
    setSummary({
      mean: values.length ? mean(values) : null,
      median: values.length ? median(values) : null,
      std: values.length ? standardDeviation(values) : null,
      min: values.length ? min(values) : null,
      max: values.length ? max(values) : null,
      count: values.length
    });
  }, [batches, param]);

  // Correlation & regression (main chart: keep using timing, but matrix: use both stages)
  useEffect(() => {
    setCorrelationError('');
    // Use only selected timing for main chart
    const pairs = Object.values(batches)
      .map(batch => {
        const x = extractParamFromSample(batch[timing], paramX);
        const y = extractParamFromSample(batch[timing], paramY);
        return (typeof x === 'number' && !isNaN(x) && typeof y === 'number' && !isNaN(y)) ? [x, y] : null;
      })
      .filter(Boolean);
    if (pairs.length < 2) {
      setCorrelation(null);
      setRegression(null);
      setCorrelationError('Not enough valid data points for correlation/regression. Please select parameters with more data.');
      return;
    }
    try {
      const xVals = pairs.map(p => p[0]);
      const yVals = pairs.map(p => p[1]);
      // DEBUG: Log X and Y values for regression
      console.log('DEBUG: Regression X values', xVals);
      console.log('DEBUG: Regression Y values', yVals);
      const corr = sampleCorrelation(xVals, yVals);
      setCorrelation(isNaN(corr) ? null : corr);
      // Only fit regression if there is variance in x
      const xVariance = Math.max(...xVals) - Math.min(...xVals);
      if (xVariance === 0) {
        setRegression(null);
        setCorrelationError('Regression cannot be calculated when all X values are the same. Try different parameters.');
        return;
      }
      const lr = linearRegression(pairs);
      const r2val = rSquared(pairs, xi => lr.m * xi[0] + lr.b);
      setRegression((isNaN(lr.m) || isNaN(lr.b) || isNaN(r2val)) ? null : { m: lr.m, b: lr.b, r2: r2val });
      if (isNaN(corr) || isNaN(lr.m) || isNaN(lr.b) || isNaN(r2val)) {
        setCorrelationError('Correlation or regression could not be calculated. This usually happens when all X or Y values are the same, or there are too few data points. Try different parameters.');
      }
    } catch (e) {
      setCorrelation(null);
      setRegression(null);
      setCorrelationError('Error calculating correlation/regression. Try different parameters.');
    }
  }, [batches, paramX, paramY, timing]);

  // Suggest best parameters for correlation/regression
  function suggestBestCorrelation() {
    let best = { paramX: '', paramY: '', corr: 0 };
    PARAM_OPTIONS.forEach(xOpt => {
      PARAM_OPTIONS.forEach(yOpt => {
        if (xOpt.key === yOpt.key) return;
        const xVals = Object.values(batches).map(batch => extractParamFromSample(batch[timing], xOpt.key)).filter(v => typeof v === 'number' && !isNaN(v));
        const yVals = Object.values(batches).map(batch => extractParamFromSample(batch[timing], yOpt.key)).filter(v => typeof v === 'number' && !isNaN(v));
        if (xVals.length !== yVals.length || xVals.length < 3) return;
        const corr = Math.abs(sampleCorrelation(xVals, yVals));
        if (!isNaN(corr) && corr > best.corr) {
          best = { paramX: xOpt.key, paramY: yOpt.key, corr };
        }
      });
    });
    return best.corr > 0.5 ? best : null;
  }

  const bestCorr = useMemo(() => suggestBestCorrelation(), [batches, timing]);

  // Correlation and regression matrices
  const [corrMatrix, r2Matrix, paramLabels] = useMemo(() => {
    const labels = PARAM_OPTIONS.map(opt => opt.label);
    const keys = PARAM_OPTIONS.map(opt => opt.key);
    const n = keys.length;
    const corr = Array.from({ length: n }, () => Array(n).fill(null));
    const r2 = Array.from({ length: n }, () => Array(n).fill(null));
    for (let i = 0; i < n; ++i) {
      for (let j = 0; j < n; ++j) {
        if (i === j) continue;
        // Use both before and after samples for each batch
        const pairs = Object.values(batches)
          .flatMap(batch => ['before', 'after'].map(stage => {
            const x = extractParamFromSample(batch[stage], keys[i]);
            const y = extractParamFromSample(batch[stage], keys[j]);
            return (typeof x === 'number' && !isNaN(x) && typeof y === 'number' && !isNaN(y)) ? [x, y] : null;
          }))
          .filter(Boolean);
        if (pairs.length < 2) {
          corr[i][j] = null;
          r2[i][j] = null;
          continue;
        }
        const xVals = pairs.map(p => p[0]);
        const yVals = pairs.map(p => p[1]);
        const xVariance = Math.max(...xVals) - Math.min(...xVals);
        if (xVariance === 0) {
          corr[i][j] = null;
          r2[i][j] = null;
          continue;
        }
        try {
          const corrVal = sampleCorrelation(xVals, yVals);
          corr[i][j] = isNaN(corrVal) ? null : corrVal;
          const lr = linearRegression(pairs);
          const r2val = rSquared(pairs, xi => lr.m * xi[0] + lr.b);
          r2[i][j] = isNaN(r2val) ? null : r2val;
        } catch {
          corr[i][j] = null;
          r2[i][j] = null;
        }
      }
    }
    return [corr, r2, labels];
  }, [batches, timing]);

  // Dropdown suggestion for Y parameter with highest correlation to X
  const suggestedY = useMemo(() => {
    const xIdx = PARAM_OPTIONS.findIndex(opt => opt.key === paramX);
    if (xIdx === -1) return paramY;
    let best = { idx: -1, corr: 0 };
    for (let j = 0; j < corrMatrix.length; ++j) {
      if (j === xIdx) continue;
      const val = corrMatrix[xIdx][j];
      if (typeof val === 'number' && Math.abs(val) > Math.abs(best.corr)) {
        best = { idx: j, corr: val };
      }
    }
    return best.idx !== -1 ? PARAM_OPTIONS[best.idx].key : paramY;
  }, [paramX, corrMatrix, paramY]);

  // DEBUG: Log valid pairs for each parameter pair in the regression matrix (using both before and after)
  useEffect(() => {
    if (!batches || Object.keys(batches).length === 0) return;
    const debugMatrix = [];
    for (let i = 0; i < PARAM_OPTIONS.length; ++i) {
      for (let j = 0; j < PARAM_OPTIONS.length; ++j) {
        if (i === j) continue;
        const keyX = PARAM_OPTIONS[i].key;
        const keyY = PARAM_OPTIONS[j].key;
        // Use both before and after samples for each batch
        const pairs = Object.values(batches)
          .flatMap(batch => ['before', 'after'].map(stage => {
            const x = extractParamFromSample(batch[stage], keyX);
            const y = extractParamFromSample(batch[stage], keyY);
            return (typeof x === 'number' && !isNaN(x) && typeof y === 'number' && !isNaN(y)) ? [x, y] : null;
          }))
          .filter(Boolean);
        debugMatrix.push({ x: keyX, y: keyY, count: pairs.length, pairs });
      }
    }
    // eslint-disable-next-line no-console
    console.log('DEBUG: Regression matrix pairs', debugMatrix);
  }, [batches]);

  return (
    <div className="analysis-root">
      <h2>Statistical Analysis</h2>
      {/* Summary statistics section at the top */}
      <div className="analysis-section">
        <h3>Summary Statistics <InfoIcon tooltip="Shows mean, median, std dev, min, max, and count for the selected parameter across all batches. Helps you quickly understand the distribution and spread of your data." /></h3>
        <div className="analysis-controls">
          <label>Parameter:
            <select value={param} onChange={e => setParam(e.target.value)}>
              {PARAM_OPTIONS.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
            </select>
          </label>
          <label>Timing:
            <select value={timing} onChange={e => setTiming(e.target.value)}>
              <option value="before">Before Treatment</option>
              <option value="after">After Treatment</option>
            </select>
          </label>
        </div>
        <div className="analysis-summary-cards">
          <div className="analysis-card">Mean: <b>{typeof summary.mean === 'number' ? summary.mean.toFixed(2) : 'N/A'}</b> <InfoIcon tooltip="The average value of the selected parameter." /></div>
          <div className="analysis-card">Median: <b>{typeof summary.median === 'number' ? summary.median.toFixed(2) : 'N/A'}</b> <InfoIcon tooltip="The middle value when all values are sorted. Less sensitive to outliers than the mean." /></div>
          <div className="analysis-card">Std Dev: <b>{typeof summary.std === 'number' ? summary.std.toFixed(2) : 'N/A'}</b> <InfoIcon tooltip="A measure of how spread out the values are. Higher means more variability." /></div>
          <div className="analysis-card">Min: <b>{typeof summary.min === 'number' ? summary.min.toFixed(2) : 'N/A'}</b> <InfoIcon tooltip="The smallest value in the dataset." /></div>
          <div className="analysis-card">Max: <b>{typeof summary.max === 'number' ? summary.max.toFixed(2) : 'N/A'}</b> <InfoIcon tooltip="The largest value in the dataset." /></div>
          <div className="analysis-card">Count: <b>{summary.count}</b> <InfoIcon tooltip="The number of data points used in the calculation." /></div>
        </div>
        {/* Summary Line Chart */}
        <div className="analysis-chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={Object.entries(batches).map(([batchId, batch]) => ({
              batchId,
              value: extractParamFromSample(batch[timing], param)
            })).filter(d => typeof d.value === 'number' && !isNaN(d.value))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="batchId" angle={-45} textAnchor="end" height={60} interval={0} stroke="#ffd700" />
              <YAxis stroke="#ffd700" />
              <RechartsTooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#ffd700" strokeWidth={2} dot={{ r: 4 }} name={param + ' (' + timing + ')'} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Correlation analysis section */}
      <div className="analysis-section">
        <h3>Correlation Analysis <InfoIcon tooltip="Correlation between two parameters. Choose X and Y, then see the relationship." /></h3>
        <div className="analysis-controls analysis-controls-center">
          <label>X Parameter:
            <select value={paramX} onChange={e => setParamX(e.target.value)}>
              {PARAM_OPTIONS.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
            </select>
          </label>
          <label>Y Parameter:
            <select value={paramY} onChange={e => setParamY(e.target.value)}>
              {PARAM_OPTIONS.map(opt => (
                <option key={opt.key} value={opt.key} style={suggestedY === opt.key ? { background: '#1e7e34', color: '#fff', fontWeight: 600 } : {}}>
                  {opt.label}{suggestedY === opt.key ? ' (suggested)' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
        {correlationError && (
          <div className="analysis-error">
            {correlationError}
            {bestCorr && (
              <div style={{ marginTop: 8 }}>
                <b>Suggested best parameters for analysis:</b><br />
                X: <b>{PARAM_OPTIONS.find(opt => opt.key === bestCorr.paramX)?.label}</b>, Y: <b>{PARAM_OPTIONS.find(opt => opt.key === bestCorr.paramY)?.label}</b> (Correlation: {bestCorr.corr.toFixed(2)})
              </div>
            )}
          </div>
        )}
        {/* Correlation Line Chart */}
        <div className="analysis-chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={Object.values(batches).map(batch => {
              const x = extractParamFromSample(batch[timing], paramX);
              const y = extractParamFromSample(batch[timing], paramY);
              return (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) ? { x, y } : null;
            }).filter(Boolean).sort((a, b) => a.x - b.x)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis dataKey="x" name={paramX} stroke="#ffd700" />
              <YAxis dataKey="y" name={paramY} stroke="#ffd700" />
              <RechartsTooltip />
              <Legend />
              <Line type="monotone" dataKey="y" stroke="#ffd700" strokeWidth={2} dot={{ r: 4 }} name={paramY + ' vs ' + paramX} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="analysis-summary-cards">
          <div className="analysis-card">Correlation: <b>{typeof correlation === 'number' ? correlation.toFixed(3) : 'N/A'}</b> <InfoIcon tooltip="Pearson correlation coefficient between X and Y. Shows how strongly the two variables are related." /></div>
        </div>
      </div>

      {/* Correlation Matrix */}
      <div className="analysis-section" style={{ display: 'flex', flexDirection: 'row', gap: '2rem', justifyContent: 'center', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 350 }}>
          <h3 style={{ textAlign: 'center' }}>Correlation Matrix <InfoIcon tooltip="Shows the correlation coefficient (r) for all parameter pairs. Strong relationships are highlighted." /></h3>
          <MatrixTable matrix={corrMatrix} paramLabels={paramLabels} type="correlation" />
        </div>
      </div>

      {/* Descriptions for correlation and regression */}
      <div className="analysis-section" style={{ maxWidth: 900, margin: '2rem auto 0 auto', background: '#232323', border: '1px solid #ffd700', borderRadius: 12, padding: '1.2rem 2rem', color: '#ffd700', fontSize: '1.08rem' }}>
        <h3 style={{ color: '#ffd700', textAlign: 'center', marginBottom: 12 }}>What do these values mean?</h3>
        <ul style={{ lineHeight: 1.7 }}>
          <li><b>Correlation (r):</b> Measures the strength and direction of a linear relationship between two variables. r = 1: perfect positive, r = -1: perfect negative, r = 0: no linear correlation. Values closer to ±1 indicate a stronger relationship.</li>
          <li><b>Color Highlights:</b> In the matrices, green = strong, yellow = moderate, orange = weak, gray = very weak relationship.</li>
        </ul>
      </div>
    </div>
  );
};

export default AnalysisPage;
