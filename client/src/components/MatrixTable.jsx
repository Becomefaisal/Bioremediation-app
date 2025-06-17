import React from 'react';
import './MatrixTable.css';

const getColor = (value, type) => {
  if (typeof value !== 'number' || isNaN(value)) return '#222';
  if (type === 'correlation') {
    // Strong positive: green, strong negative: red, weak: yellow
    if (Math.abs(value) > 0.8) return '#1e7e34'; // strong (green)
    if (Math.abs(value) > 0.5) return '#ffc107'; // moderate (yellow)
    if (Math.abs(value) > 0.3) return '#fd7e14'; // weak (orange)
    return '#6c757d'; // very weak (gray)
  }
  if (type === 'r2') {
    if (value > 0.8) return '#1e7e34'; // strong (green)
    if (value > 0.5) return '#ffc107'; // moderate (yellow)
    if (value > 0.3) return '#fd7e14'; // weak (orange)
    return '#6c757d'; // very weak (gray)
  }
  return '#222';
};

const MatrixTable = ({ matrix, paramLabels, type }) => (
  <div className="matrix-table-container">
    <table className="matrix-table">
      <thead>
        <tr>
          <th></th>
          {paramLabels.map(label => <th key={label}>{label}</th>)}
        </tr>
      </thead>
      <tbody>
        {paramLabels.map((rowLabel, i) => (
          <tr key={rowLabel}>
            <th>{rowLabel}</th>
            {paramLabels.map((colLabel, j) => (
              <td key={colLabel} style={{ background: getColor(matrix[i][j], type), color: '#fff', fontWeight: 'bold', minWidth: 60 }}>
                {i === j ? '-' : (typeof matrix[i][j] === 'number' ? matrix[i][j].toFixed(2) : 'N/A')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default MatrixTable;
