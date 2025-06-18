import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import DashboardStatInfo from './DashboardStatInfo'; // Adjust the import path as needed

const PARAMETER_OPTIONS = [
  { key: 'BOD', label: 'BOD' },
  { key: 'COD', label: 'COD' },
  { key: 'pH', label: 'pH' },
  { key: 'TDS', label: 'TDS' },
  { key: 'DO', label: 'DO' },
  { key: 'temperature', label: 'Temperature' },
  { key: 'turbidity', label: 'Turbidity' },
];

// Heavy metals keys and labels
const HEAVY_METALS = [
  { key: 'Cr', label: 'Chromium (Cr)' },
  { key: 'Pb', label: 'Lead (Pb)' },
  { key: 'Nitrates', label: 'Nitrates' },
  { key: 'Ammonia', label: 'Ammonia' },
];

const apiUrl = import.meta.env.VITE_API_URL;

const TimelinePage = () => {
  const [data, setData] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState('');

  useEffect(() => {
    axios.get(`${apiUrl}/api/samples/all`)
      .then(res => {
        if (Array.isArray(res.data)) setData(res.data);
        else if (res.data && typeof res.data === 'object') setData([res.data]);
        else setData([]);
      })
      .catch(() => setData([]));
  }, []);

  // Extract unique method names
  const methodNames = Array.from(new Set(data.map(entry => entry.method?.name).filter(Boolean)));

  // Water quality timelines
  const getTimelineData = (param) =>
    data
      .filter(entry =>
        (!selectedMethod || entry.method?.name === selectedMethod) &&
        entry.sampleMeta?.stage === 'after' &&
        entry.measurements && entry.measurements.waterQuality &&
        entry.measurements.waterQuality[param] !== undefined
      )
      .map(entry => ({
        timestamp: entry.sampleMeta.timestamp,
        value: entry.measurements.waterQuality[param],
        batch: entry.sampleMeta.batchId
      }))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Dye concentration timeline (initial and final)
  const dyeConcentrationTimeline = data
    .filter(entry => (!selectedMethod || entry.method?.name === selectedMethod) && entry.sampleMeta?.stage === 'after' && entry.measurements?.dye)
    .map(entry => ({
      timestamp: entry.sampleMeta.timestamp,
      initialConcentration: entry.measurements.dye.initialConcentration,
      finalConcentration: entry.measurements.dye.finalConcentration,
      batch: entry.sampleMeta.batchId
    }))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Dye absorbance timeline (before and after)
  const dyeAbsorbanceTimeline = data
    .filter(entry => (!selectedMethod || entry.method?.name === selectedMethod) && entry.sampleMeta?.stage === 'after' && entry.measurements?.dye)
    .map(entry => ({
      timestamp: entry.sampleMeta.timestamp,
      absorbanceBefore: entry.measurements.dye.absorbanceInitial,
      absorbanceAfter: entry.measurements.dye.absorbanceFinal,
      batch: entry.sampleMeta.batchId
    }))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Heavy metals timeline
  const getHeavyMetalTimeline = (metalKey) =>
    data
      .filter(entry =>
        (!selectedMethod || entry.method?.name === selectedMethod) &&
        entry.sampleMeta?.stage === 'after' &&
        entry.measurements && entry.measurements.heavyMetals &&
        entry.measurements.heavyMetals[metalKey] !== undefined
      )
      .map(entry => ({
        timestamp: entry.sampleMeta.timestamp,
        value: entry.measurements.heavyMetals[metalKey],
        batch: entry.sampleMeta.batchId
      }))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return (
    <div className="main-content" style={{color:'#fff', padding: 32, minHeight: 'calc(100vh - 72px)'}}>
      <h2 style={{color:'#ffd700'}}>Timeline Analysis</h2>
      {/* Method Selector Dropdown */}
      <div style={{ marginBottom: 32 }}>
        <label htmlFor="method-select" style={{ color: '#ffd700', fontWeight: 600, marginRight: 8 }}>Select Method:</label>
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
      {/* Water Quality Heading */}
      <h3 style={{color:'#43cea2', marginBottom: 16, fontSize: '1.2rem', borderBottom: '2px solid #43cea2', paddingBottom: 4}}>
        Water Quality Parameters
        <DashboardStatInfo tooltip="Timelines for each water quality parameter (BOD, COD, pH, etc.) after treatment. X-axis: date, Y-axis: value." />
      </h3>
      {/* Water Quality Timelines - 2 per row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, marginBottom: 32 }}>
        {PARAMETER_OPTIONS.map((opt, idx) => (
          <div key={opt.key} style={{ flex: '1 1 400px', minWidth: 400, maxWidth: 600, background:'#232323', borderRadius:12, padding:24, marginBottom:32, boxShadow:'0 2px 12px rgba(0,0,0,0.2)', color:'#f2f2f2' }}>
            <h3 style={{color:'#ffd700', fontSize:'1.1rem', marginBottom:8}}>
              {opt.label} Timeline
              <DashboardStatInfo tooltip={`Line chart showing ${opt.label} values after treatment for each batch over time.`} />
            </h3>
            {getTimelineData(opt.key).length === 0 ? (
              <p style={{color:'#aaa'}}>No timeline data for this parameter.</p>
            ) : (
              <ResponsiveContainer width={"100%"} height={220}>
                <LineChart data={getTimelineData(opt.key)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="timestamp" tickFormatter={t => new Date(t).toLocaleDateString()} stroke="#fff" />
                  <YAxis stroke="#fff" />
                  <Tooltip labelFormatter={t => new Date(t).toLocaleString()} contentStyle={{background:'#232323',color:'#fff',border:'1px solid #444'}}/>
                  <Legend wrapperStyle={{color:'#fff'}}/>
                  <Line type="monotone" dataKey="value" name={opt.label} stroke="#ffd700" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        ))}
      </div>
      {/* Section Separator */}
      <hr style={{border:0, borderTop:'2px solid #444', margin:'48px 0 32px 0'}} />
      {/* Dye Parameters Timeline */}
      <h3 style={{color:'#43cea2', marginBottom: 16, fontSize: '1.2rem', borderBottom: '2px solid #43cea2', paddingBottom: 4}}>
        Dye Parameters Timeline
        <DashboardStatInfo tooltip="Timelines for dye concentration and absorbance after treatment. Useful for tracking dye removal progress." />
      </h3>
      {/* Dye Concentration and Absorbance Timelines Side by Side */}
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', marginBottom: 32 }}>
        {/* Dye Concentration Timeline */}
        <div style={{ flex: '1 1 400px', minWidth: 400, maxWidth: 600, background:'#232323', borderRadius:12, padding:24, boxShadow:'0 2px 12px rgba(0,0,0,0.2)', color:'#f2f2f2' }}>
          <h3 style={{color:'#43cea2', fontSize:'1.1rem', marginBottom:8}}>
            Dye Concentration Timeline
            <DashboardStatInfo tooltip="Line chart showing initial and final dye concentrations after treatment for each batch over time." />
          </h3>
          {dyeConcentrationTimeline.length === 0 ? (
            <p style={{color:'#aaa'}}>No timeline data for dye concentration.</p>
          ) : (
            <ResponsiveContainer width={"100%"} height={300}>
              <LineChart data={dyeConcentrationTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="timestamp" tickFormatter={t => new Date(t).toLocaleDateString()} stroke="#fff" />
                <YAxis stroke="#fff" />
                <Tooltip labelFormatter={t => new Date(t).toLocaleString()} contentStyle={{background:'#232323',color:'#fff',border:'1px solid #444'}}/>
                <Legend wrapperStyle={{color:'#fff'}}/>
                <Line type="monotone" dataKey="initialConcentration" name="Initial Concentration" stroke="#43cea2" />
                <Line type="monotone" dataKey="finalConcentration" name="Final Concentration" stroke="#ffd700" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        {/* Dye Absorbance Timeline */}
        <div style={{ flex: '1 1 400px', minWidth: 400, maxWidth: 600, background:'#232323', borderRadius:12, padding:24, boxShadow:'0 2px 12px rgba(0,0,0,0.2)', color:'#f2f2f2' }}>
          <h3 style={{color:'#43cea2', fontSize:'1.1rem', marginBottom:8}}>
            Dye Absorbance Timeline
            <DashboardStatInfo tooltip="Line chart showing absorbance before and after treatment for each batch over time." />
          </h3>
          {dyeAbsorbanceTimeline.length === 0 ? (
            <p style={{color:'#aaa'}}>No timeline data for dye absorbance.</p>
          ) : (
            <ResponsiveContainer width={"100%"} height={300}>
              <LineChart data={dyeAbsorbanceTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="timestamp" tickFormatter={t => new Date(t).toLocaleDateString()} stroke="#fff" />
                <YAxis stroke="#fff" />
                <Tooltip labelFormatter={t => new Date(t).toLocaleString()} contentStyle={{background:'#232323',color:'#fff',border:'1px solid #444'}}/>
                <Legend wrapperStyle={{color:'#fff'}}/>
                <Line type="monotone" dataKey="absorbanceBefore" name="Absorbance Before" stroke="#ffb347" />
                <Line type="monotone" dataKey="absorbanceAfter" name="Absorbance After" stroke="#a347ff" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      {/* Section Separator */}
      <hr style={{border:0, borderTop:'2px solid #444', margin:'48px 0 32px 0'}} />
      {/* Heavy Metals Timeline */}
      <h3 style={{color:'#43cea2', marginBottom: 16, fontSize: '1.2rem', borderBottom: '2px solid #43cea2', paddingBottom: 4}}>
        Heavy Metals Parameters Timeline
        <DashboardStatInfo tooltip="Timelines for heavy metals (e.g., Chromium, Lead) after treatment. Useful for monitoring metal removal." />
      </h3>
      {/* Heavy Metals Timelines - 2 per row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, marginBottom: 32 }}>
        {HEAVY_METALS.map(metal => (
          <div key={metal.key} style={{ flex: '1 1 400px', minWidth: 400, maxWidth: 600, background:'#232323', borderRadius:12, padding:24, marginBottom:32, boxShadow:'0 2px 12px rgba(0,0,0,0.2)', color:'#f2f2f2' }}>
            <h3 style={{color:'#ffd700', fontSize:'1.1rem', marginBottom:8}}>
              {metal.label} Timeline
              <DashboardStatInfo tooltip={`Line chart showing ${metal.label} values after treatment for each batch over time.`} />
            </h3>
            {getHeavyMetalTimeline(metal.key).length === 0 ? (
              <p style={{color:'#aaa'}}>No timeline data for this parameter.</p>
            ) : (
              <ResponsiveContainer width={"100%"} height={220}>
                <LineChart data={getHeavyMetalTimeline(metal.key)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="timestamp" tickFormatter={t => new Date(t).toLocaleDateString()} stroke="#fff" />
                  <YAxis stroke="#fff" />
                  <Tooltip labelFormatter={t => new Date(t).toLocaleString()} contentStyle={{background:'#232323',color:'#fff',border:'1px solid #444'}}/>
                  <Legend wrapperStyle={{color:'#fff'}}/>
                  <Line type="monotone" dataKey="value" name={metal.label} stroke="#ffd700" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimelinePage;
