import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './FormPage.css';

const apiUrl = import.meta.env.VITE_API_URL;

const FormPage = () => {
  const [formData, setFormData] = useState({
    location: '',
    treatmentMethod: '',
    waterQuality: {
      before: { pH: '', temperature: '', turbidity: '', DO: '', BOD: '', COD: '', TDS: '' },
      after: { pH: '', temperature: '', turbidity: '', DO: '', BOD: '', COD: '', TDS: '' },
    },
    dyeParameters: {
      dyeName: '', initialConcentration: '', finalConcentration: '', absorbanceBefore: '', absorbanceAfter: '',
    },
    heavyMetals: {
      before: { Cr: '', Pb: '', Nitrates: '', Ammonia: '' },
      after: { Cr: '', Pb: '', Nitrates: '', Ammonia: '' },
    },
  });
  const [submitting, setSubmitting] = useState(false);
  const [methodSuggestions, setMethodSuggestions] = useState([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const methodInputRef = useRef(null);

  // Fetch unique treatment method names from MongoDB (use Vite proxy)
  useEffect(() => {
    async function fetchMethods() {
      try {
        const res = await axios.get(`${apiUrl}/api/samples/method-names`);
        const unique = Array.isArray(res.data) ? res.data.filter(Boolean) : [];
        setMethodSuggestions(unique);
        setFilteredSuggestions(unique);
      } catch (e) {
        setMethodSuggestions([]);
        setFilteredSuggestions([]);
      }
    }
    fetchMethods();
  }, []);

  const handleChange = (e, section, subSection, field) => {
    const value = e.target.value;
    if (field === 'treatmentMethod') {
      setShowSuggestions(true);
      setFilteredSuggestions(
        methodSuggestions.filter(m => m.toLowerCase().includes(value.toLowerCase()))
      );
    }
    if (subSection) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [subSection]: {
            ...prev[section][subSection],
            [field]: value,
          },
        },
      }));
    } else if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setFormData(prev => ({ ...prev, treatmentMethod: suggestion }));
    setShowSuggestions(false);
  };

  // Hide suggestions when clicking outside or on blur
  useEffect(() => {
    function handleClickOutside(event) {
      if (methodInputRef.current && !methodInputRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        location: formData.location,
        method: { name: formData.treatmentMethod, category: '', description: '' },
        sampleMeta: {
          batchId: `Batch${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).substring(2, 7)}`,
          operator: '',
          timestamp: new Date().toISOString()
        },
        beforeMeasurements: {
          waterQuality: { ...formData.waterQuality.before },
          dye: {
            name: formData.dyeParameters.dyeName,
            initialConcentration: Number(formData.dyeParameters.initialConcentration),
            absorbanceInitial: Number(formData.dyeParameters.absorbanceBefore),
            wavelength: 0
          },
          heavyMetals: {
            Cr: Number(formData.heavyMetals.before.Cr),
            Pb: Number(formData.heavyMetals.before.Pb),
            Nitrates: Number(formData.heavyMetals.before.Nitrates),
            Ammonia: Number(formData.heavyMetals.before.Ammonia)
          }
        },
        afterMeasurements: {
          waterQuality: { ...formData.waterQuality.after },
          dye: {
            name: formData.dyeParameters.dyeName,
            finalConcentration: Number(formData.dyeParameters.finalConcentration),
            absorbanceFinal: Number(formData.dyeParameters.absorbanceAfter),
            wavelength: 0
          },
          heavyMetals: {
            Cr: Number(formData.heavyMetals.after.Cr),
            Pb: Number(formData.heavyMetals.after.Pb),
            Nitrates: Number(formData.heavyMetals.after.Nitrates),
            Ammonia: Number(formData.heavyMetals.after.Ammonia)
          }
        }
      };
      await axios.post('/api/samples/add', payload);
      setFormData({
        location: '',
        treatmentMethod: '',
        waterQuality: {
          before: { pH: '', temperature: '', turbidity: '', DO: '', BOD: '', COD: '', TDS: '' },
          after: { pH: '', temperature: '', turbidity: '', DO: '', BOD: '', COD: '', TDS: '' },
        },
        dyeParameters: {
          dyeName: '', initialConcentration: '', finalConcentration: '', absorbanceBefore: '', absorbanceAfter: '',
        },
        heavyMetals: {
          before: { Cr: '', Pb: '', Nitrates: '', Ammonia: '' },
          after: { Cr: '', Pb: '', Nitrates: '', Ammonia: '' },
        },
      });
      alert('Sample data submitted successfully!');
    } catch (err) {
      alert('Error submitting data.');
    }
    setSubmitting(false);
  };

  return (
    <form className="form-root wider-form" onSubmit={handleSubmit} autoComplete="off">
      {/* General Info Section at Top */}
      <div className="form-section">
        <div className="form-section-title">General Information</div>
        <div className="form-grid">
          <div>
            <label className="form-label">Location</label>
            <input
              className="form-input"
              type="text"
              value={formData.location}
              onChange={e => handleChange(e, null, null, 'location')}
              placeholder="e.g. Unit 5, Delhi"
              required
            />
          </div>
          <div ref={methodInputRef} style={{position:'relative'}}>
            <label className="form-label">Treatment Method</label>
            <input
              className="form-input"
              type="text"
              value={formData.treatmentMethod}
              onChange={e => {
                handleChange(e, null, null, 'treatmentMethod');
                setShowSuggestions(true);
              }}
              placeholder="e.g. Biological Treatment A"
              autoComplete="off"
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              required
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
              <ul className="suggestion-list" style={{position:'absolute',top:'100%',left:0,right:0,maxWidth:'100%',overflowX:'auto'}}>
                {filteredSuggestions.map((m, i) => (
                  <li key={i} className="suggestion-item" onMouseDown={e => { e.preventDefault(); handleSuggestionClick(m); }}>{m}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      {/* Two-Card Layout for Parameters */}
      <div className="form-row">
        {/* Water Quality Card */}
        <div className="form-section" style={{ flex: 1 }}>
          <div className="form-section-title">Water Quality Parameters</div>
          <div className="form-section-desc">Enter all water quality values for before and after treatment.</div>
          <div className="form-grid">
            <div>
              <div className="form-label" style={{ color: '#ffd700' }}>Before</div>
              <label className="form-label">pH</label>
              <input className="form-input" type="number" step="any" value={formData.waterQuality.before.pH} onChange={e => handleChange(e, 'waterQuality', 'before', 'pH')} placeholder="e.g. 7.2" />
              <label className="form-label">temperature</label>
              <input className="form-input" type="number" step="any" value={formData.waterQuality.before.temperature} onChange={e => handleChange(e, 'waterQuality', 'before', 'temperature')} placeholder="e.g. 30.5 (°C)" />
              <label className="form-label">turbidity</label>
              <input className="form-input" type="number" step="any" value={formData.waterQuality.before.turbidity} onChange={e => handleChange(e, 'waterQuality', 'before', 'turbidity')} placeholder="e.g. 45 (NTU)" />
              <label className="form-label">DO</label>
              <input className="form-input" type="number" step="any" value={formData.waterQuality.before.DO} onChange={e => handleChange(e, 'waterQuality', 'before', 'DO')} placeholder="e.g. 2.5 (mg/L)" />
              <label className="form-label">BOD</label>
              <input className="form-input" type="number" step="any" value={formData.waterQuality.before.BOD} onChange={e => handleChange(e, 'waterQuality', 'before', 'BOD')} placeholder="e.g. 120 (mg/L)" />
              <label className="form-label">COD</label>
              <input className="form-input" type="number" step="any" value={formData.waterQuality.before.COD} onChange={e => handleChange(e, 'waterQuality', 'before', 'COD')} placeholder="e.g. 300 (mg/L)" />
              <label className="form-label">TDS</label>
              <input className="form-input" type="number" step="any" value={formData.waterQuality.before.TDS} onChange={e => handleChange(e, 'waterQuality', 'before', 'TDS')} placeholder="e.g. 1800 (mg/L)" />
            </div>
            <div>
              <div className="form-label" style={{ color: '#ffd700' }}>After</div>
              <label className="form-label">pH</label>
              <input className="form-input" type="number" step="any" value={formData.waterQuality.after.pH} onChange={e => handleChange(e, 'waterQuality', 'after', 'pH')} placeholder="e.g. 7.0" />
              <label className="form-label">temperature</label>
              <input className="form-input" type="number" step="any" value={formData.waterQuality.after.temperature} onChange={e => handleChange(e, 'waterQuality', 'after', 'temperature')} placeholder="e.g. 29.0 (°C)" />
              <label className="form-label">turbidity</label>
              <input className="form-input" type="number" step="any" value={formData.waterQuality.after.turbidity} onChange={e => handleChange(e, 'waterQuality', 'after', 'turbidity')} placeholder="e.g. 10 (NTU)" />
              <label className="form-label">DO</label>
              <input className="form-input" type="number" step="any" value={formData.waterQuality.after.DO} onChange={e => handleChange(e, 'waterQuality', 'after', 'DO')} placeholder="e.g. 4.0 (mg/L)" />
              <label className="form-label">BOD</label>
              <input className="form-input" type="number" step="any" value={formData.waterQuality.after.BOD} onChange={e => handleChange(e, 'waterQuality', 'after', 'BOD')} placeholder="e.g. 30 (mg/L)" />
              <label className="form-label">COD</label>
              <input className="form-input" type="number" step="any" value={formData.waterQuality.after.COD} onChange={e => handleChange(e, 'waterQuality', 'after', 'COD')} placeholder="e.g. 80 (mg/L)" />
              <label className="form-label">TDS</label>
              <input className="form-input" type="number" step="any" value={formData.waterQuality.after.TDS} onChange={e => handleChange(e, 'waterQuality', 'after', 'TDS')} placeholder="e.g. 900 (mg/L)" />
            </div>
          </div>
        </div>
        {/* Dye and Heavy Metals Card */}
        <div className="form-section" style={{ flex: 1 }}>
          <div className="form-section-title">Dye & Heavy Metals Parameters</div>
          <div className="form-section-desc">Enter dye and heavy metal values for before and after treatment.</div>
          <div className="form-grid">
            <div>
              <label className="form-label">Dye Name</label>
              <input className="form-input" type="text" value={formData.dyeParameters.dyeName} onChange={e => handleChange(e, 'dyeParameters', null, 'dyeName')} placeholder="e.g. Reactive Blue 19" />
              <label className="form-label">Initial Concentration</label>
              <input className="form-input" type="number" step="any" value={formData.dyeParameters.initialConcentration} onChange={e => handleChange(e, 'dyeParameters', null, 'initialConcentration')} placeholder="e.g. 100 (mg/L)" />
              <label className="form-label">Absorbance Before</label>
              <input className="form-input" type="number" step="any" value={formData.dyeParameters.absorbanceBefore} onChange={e => handleChange(e, 'dyeParameters', null, 'absorbanceBefore')} placeholder="e.g. 1.3" />
              <label className="form-label">Cr (Before)</label>
              <input className="form-input" type="number" step="any" value={formData.heavyMetals.before.Cr} onChange={e => handleChange(e, 'heavyMetals', 'before', 'Cr')} placeholder="e.g. 0.6 (mg/L)" />
              <label className="form-label">Pb (Before)</label>
              <input className="form-input" type="number" step="any" value={formData.heavyMetals.before.Pb} onChange={e => handleChange(e, 'heavyMetals', 'before', 'Pb')} placeholder="e.g. 0.2 (mg/L)" />
              <label className="form-label">Nitrates (Before)</label>
              <input className="form-input" type="number" step="any" value={formData.heavyMetals.before.Nitrates} onChange={e => handleChange(e, 'heavyMetals', 'before', 'Nitrates')} placeholder="e.g. 1.0 (mg/L)" />
              <label className="form-label">Ammonia (Before)</label>
              <input className="form-input" type="number" step="any" value={formData.heavyMetals.before.Ammonia} onChange={e => handleChange(e, 'heavyMetals', 'before', 'Ammonia')} placeholder="e.g. 1.8 (mg/L)" />
            </div>
            <div>
              <label className="form-label">Final Concentration</label>
              <input className="form-input" type="number" step="any" value={formData.dyeParameters.finalConcentration} onChange={e => handleChange(e, 'dyeParameters', null, 'finalConcentration')} placeholder="e.g. 10 (mg/L)" />
              <label className="form-label">Absorbance After</label>
              <input className="form-input" type="number" step="any" value={formData.dyeParameters.absorbanceAfter} onChange={e => handleChange(e, 'dyeParameters', null, 'absorbanceAfter')} placeholder="e.g. 0.2" />
              <label className="form-label">Cr (After)</label>
              <input className="form-input" type="number" step="any" value={formData.heavyMetals.after.Cr} onChange={e => handleChange(e, 'heavyMetals', 'after', 'Cr')} placeholder="e.g. 0.1 (mg/L)" />
              <label className="form-label">Pb (After)</label>
              <input className="form-input" type="number" step="any" value={formData.heavyMetals.after.Pb} onChange={e => handleChange(e, 'heavyMetals', 'after', 'Pb')} placeholder="e.g. 0.05 (mg/L)" />
              <label className="form-label">Nitrates (After)</label>
              <input className="form-input" type="number" step="any" value={formData.heavyMetals.after.Nitrates} onChange={e => handleChange(e, 'heavyMetals', 'after', 'Nitrates')} placeholder="e.g. 0.2 (mg/L)" />
              <label className="form-label">Ammonia (After)</label>
              <input className="form-input" type="number" step="any" value={formData.heavyMetals.after.Ammonia} onChange={e => handleChange(e, 'heavyMetals', 'after', 'Ammonia')} placeholder="e.g. 0.3 (mg/L)" />
            </div>
          </div>
        </div>
      </div>
      <div className="form-actions">
        <button className="form-btn" type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit'}</button>
      </div>
    </form>
  );
};

export default FormPage;
