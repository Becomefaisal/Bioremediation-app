import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './FormPage.css';

const API_BASE = import.meta.env.VITE_API_URL;

function EditDataPage() {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/samples/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        setFormData({
          location: data.location || '',
          treatmentMethod: data.method?.name || '',
          waterQuality: {
            before: {
              pH: data.measurements?.waterQuality?.pH || '',
              temperature: data.measurements?.waterQuality?.temperature || '',
              turbidity: data.measurements?.waterQuality?.turbidity || '',
              DO: data.measurements?.waterQuality?.DO || '',
              BOD: data.measurements?.waterQuality?.BOD || '',
              COD: data.measurements?.waterQuality?.COD || '',
              TDS: data.measurements?.waterQuality?.TDS || '',
            },
            after: {
              pH: '', temperature: '', turbidity: '', DO: '', BOD: '', COD: '', TDS: '' // Not available in single entry
            }
          },
          dyeParameters: {
            dyeName: data.measurements?.dye?.name || '',
            initialConcentration: data.measurements?.dye?.initialConcentration || '',
            finalConcentration: data.measurements?.dye?.finalConcentration || '',
            absorbanceBefore: data.measurements?.dye?.absorbanceInitial || '',
            absorbanceAfter: data.measurements?.dye?.absorbanceFinal || '',
          },
          heavyMetals: {
            before: {
              Cr: data.measurements?.heavyMetals?.Cr || '',
              Pb: data.measurements?.heavyMetals?.Pb || '',
              Nitrates: data.measurements?.heavyMetals?.Nitrates || '',
              Ammonia: data.measurements?.heavyMetals?.Ammonia || '',
            },
            after: {
              Cr: '', Pb: '', Nitrates: '', Ammonia: '' // Not available in single entry
            }
          }
        });
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e, section, subSection, field) => {
    const value = e.target.value;
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        location: formData.location,
        method: { name: formData.treatmentMethod, category: '', description: '' },
        measurements: {
          waterQuality: { ...formData.waterQuality.before },
          dye: {
            name: formData.dyeParameters.dyeName,
            initialConcentration: Number(formData.dyeParameters.initialConcentration),
            finalConcentration: Number(formData.dyeParameters.finalConcentration),
            absorbanceInitial: Number(formData.dyeParameters.absorbanceBefore),
            absorbanceFinal: Number(formData.dyeParameters.absorbanceAfter),
            wavelength: 0
          },
          heavyMetals: {
            Cr: Number(formData.heavyMetals.before.Cr),
            Pb: Number(formData.heavyMetals.before.Pb),
            Nitrates: Number(formData.heavyMetals.before.Nitrates),
            Ammonia: Number(formData.heavyMetals.before.Ammonia)
          }
        }
      };
      const res = await fetch(`${API_BASE}/api/samples/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update');
      navigate('/manage');
    } catch (err) {
      setError('Update failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;
  return (
    <form className="form-root wider-form" onSubmit={handleSubmit} autoComplete="off">
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
          <div>
            <label className="form-label">Treatment Method</label>
            <input
              className="form-input"
              type="text"
              value={formData.treatmentMethod}
              onChange={e => handleChange(e, null, null, 'treatmentMethod')}
              placeholder="e.g. Biological Treatment A"
              required
            />
          </div>
        </div>
      </div>
      <div className="form-row">
        <div className="form-section" style={{ flex: 1 }}>
          <div className="form-section-title">Water Quality Parameters</div>
          <div className="form-section-desc">Enter all water quality values for before treatment.</div>
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
          </div>
        </div>
        <div className="form-section" style={{ flex: 1 }}>
          <div className="form-section-title">Dye & Heavy Metals Parameters</div>
          <div className="form-section-desc">Enter dye and heavy metal values for before treatment.</div>
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
          </div>
        </div>
      </div>
      <div className="form-actions">
        <button className="form-btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        <button type="button" onClick={() => navigate('/manage')} className="delete-btn">Cancel</button>
      </div>
      {error && <div className="error" style={{marginTop:'1rem'}}>{error}</div>}
    </form>
  );
}

export default EditDataPage;
