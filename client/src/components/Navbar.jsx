import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const [open, setOpen] = useState(false);
  return (
    <nav className="navbar">
      <div className="navbar-header">
        <div className="navbar-logo">Bioremediation</div>
        <button className="navbar-toggle" aria-label="Toggle navigation" onClick={() => setOpen(o => !o)}>
          <span className="navbar-toggle-bar"></span>
          <span className="navbar-toggle-bar"></span>
          <span className="navbar-toggle-bar"></span>
        </button>
      </div>
      <div className={`navbar-links${open ? ' open' : ''}`}>
        <NavLink to="/dashboard" className={({isActive}) => isActive ? 'active' : ''} onClick={() => setOpen(false)}>Dashboard</NavLink>
        <NavLink to="/add" className={({isActive}) => isActive ? 'active' : ''} onClick={() => setOpen(false)}>Add New Data</NavLink>
        <NavLink to="/compare" className={({isActive}) => isActive ? 'active' : ''} onClick={() => setOpen(false)}>Compare Methods</NavLink>
        <NavLink to="/timeline" className={({isActive}) => isActive ? 'active' : ''} onClick={() => setOpen(false)}>Timeline</NavLink>
        <NavLink to="/analysis" className={({isActive}) => isActive ? 'active' : ''} onClick={() => setOpen(false)}>Analysis</NavLink>
        <NavLink to="/prediction" className={({isActive}) => isActive ? 'active' : ''} onClick={() => setOpen(false)}>AI Prediction</NavLink>
      </div>
    </nav>
  );
};

export default Navbar;
