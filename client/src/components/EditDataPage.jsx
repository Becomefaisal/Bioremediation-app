import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './AnalysisPage.css';

const API_BASE = import.meta.env.VITE_API_URL;

function EditDataPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', method: '', timestamp: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/samples/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => setForm({
        name: data.name || '',
        method: data.method?.name || '',
        timestamp: data.sampleMeta?.timestamp ? new Date(data.sampleMeta.timestamp).toLocaleString() : ''
      }))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/samples/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name })
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
    <div className="analysis-page">
      <h2>Edit Data Entry</h2>
      {error && <div className="error">{error}</div>}
      <div className="edit-card">
        <form onSubmit={handleSubmit} className="edit-form">
          <label htmlFor="name">Name:</label>
          <input
            id="name"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            className="search-input"
            aria-label="Name"
          />
          <label htmlFor="method">Method:</label>
          <input
            id="method"
            name="method"
            value={form.method}
            disabled
            className="search-input"
            aria-label="Method"
          />
          <label htmlFor="timestamp">Timestamp:</label>
          <input
            id="timestamp"
            name="timestamp"
            value={form.timestamp}
            disabled
            className="search-input"
            aria-label="Timestamp"
          />
          <div className="form-actions">
            <button type="submit" disabled={saving} className="edit-link">{saving ? 'Saving...' : 'Save'}</button>
            <button type="button" onClick={() => navigate('/manage')} className="delete-btn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditDataPage;
