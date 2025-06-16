import React from 'react';
import './DashboardStatInfo.css';

const DashboardStatInfo = ({ children, tooltip }) => (
  <span className="dashboard-stat-info">
    <span className="info-icon" tabIndex={0} aria-label="info">i</span>
    <span className="info-tooltip">{tooltip}</span>
    {children}
  </span>
);

export default DashboardStatInfo;
