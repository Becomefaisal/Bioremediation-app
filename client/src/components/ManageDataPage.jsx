
import React, { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL;

function ManageDataPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [tab, setTab] = useState('view');

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
        <button className={`tab-btn active`}>View Data</button>
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
    </div>
  );
}

export default ManageDataPage;
