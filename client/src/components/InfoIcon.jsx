import React from 'react';

const InfoIcon = ({ tooltip }) => (
  <span className="info-icon" tabIndex={0} title={tooltip} style={{
    display: 'inline-block',
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#222',
    border: '1.5px solid #ffd700',
    color: '#ffd700',
    fontWeight: 'bold',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: '18px',
    marginLeft: 6,
    cursor: 'pointer',
    verticalAlign: 'middle'
  }}>i</span>
);

export default InfoIcon;
