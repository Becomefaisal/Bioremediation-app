import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './AnalysisPage.css'; // Reuse design styles

const API_BASE = import.meta.env.VITE_API_URL;

function ManageDataPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);

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
    item.name?.toLowerCase().includes(search.toLowerCase()) ||
    item._id?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="analysis-page">
      <h2>Manage Existing Data</h2>
      <input
        type="text"
        placeholder="Search by name or ID..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="search-input"
        aria-label="Search data"
      />
      <div className="table-container">
        <table className="matrix-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr><td colSpan={3}>No data found.</td></tr>
            ) : (
              filteredData.map(item => (
                <tr key={item._id}>
                  <td>{item._id}</td>
                  <td>{item.name ? String(item.name).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '-'}</td>
                  <td>
                    <Link to={`/edit/${item._id}`} className="edit-link">Edit</Link>
                    {' | '}
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
