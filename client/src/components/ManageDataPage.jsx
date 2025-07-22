import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './AnalysisPage.css'; // Reuse design styles
import SampleChatModal from './SampleChatModal';

const API_BASE = import.meta.env.VITE_API_URL;

function ManageDataPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [tab, setTab] = useState('view');
  const [chatSample, setChatSample] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/samples/all`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch: ' + res.status);
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    setDeleting(id);
    try {
      const res = await fetch(`${API_BASE}/api/samples/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      setData(data.filter(item => item._id !== id));
    } catch (err) {
      alert('Delete failed: ' + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const filteredData = data.filter(item =>
    item._id?.toLowerCase().includes(search.toLowerCase()) ||
    item.method?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="analysis-page">
      <div className="tabs-row">
        <button className={`tab-btn${tab==='view' ? ' active' : ''}`} onClick={()=>setTab('view')}>View Data</button>
        <button className={`tab-btn${tab==='ask' ? ' active' : ''}`} onClick={()=>setTab('ask')}>Ask AI About Data</button>
      </div>
      {tab === 'view' && (
        <>
          <h2>Manage Existing Data</h2>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <input
              type="text"
              placeholder="Search by ID, method..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="search-input"
              aria-label="Search data"
              style={{maxWidth:'350px'}}
            />
            <button
              className="form-btn"
              style={{marginLeft:'1rem'}}
              onClick={() => window.location.href='/add'}
            >Add New Data</button>
          </div>
          <div className="table-container">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Method</th>
                  <th>Timestamp</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr><td colSpan={4}>No data found.</td></tr>
                ) : (
                  filteredData.map(item => (
                    <tr key={item._id}>
                      <td>{item._id}</td>
                      <td>{item.method?.name || '-'}</td>
                      <td>{item.sampleMeta?.timestamp ? new Date(item.sampleMeta.timestamp).toLocaleString() : '-'}</td>
                      <td>
                        <button
                          className="edit-link form-btn"
                          style={{marginRight:'0.5rem'}}
                          onClick={() => window.location.href=`/edit/${item._id}`}
                        >Edit</button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(item._id)}
                          disabled={deleting === item._id}
                          aria-label={`Delete entry ${item._id}`}
                        >{deleting === item._id ? 'Deleting...' : 'Delete'}</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
      {tab === 'ask' && (
        <>
          <h2>Ask AI About Data Sample</h2>
          <div style={{marginBottom:'1rem'}}>
            <select
              className="search-input"
              style={{maxWidth:'350px'}}
              onChange={e => {
                const sample = data.find(d => d._id === e.target.value);
                setChatSample(sample || null);
              }}
              defaultValue=""
            >
              <option value="" disabled>Select a sample...</option>
              {data.map(item => (
                <option key={item._id} value={item._id}>
                  {item._id} | {item.method?.name || '-'} | {item.sampleMeta?.timestamp ? new Date(item.sampleMeta.timestamp).toLocaleString() : '-'}
                </option>
              ))}
            </select>
          </div>
          {chatSample && (
            <SampleChatModal sample={chatSample} onClose={()=>setChatSample(null)} />
          )}
        </>
      )}
    </div>
  );
}

export default ManageDataPage;
