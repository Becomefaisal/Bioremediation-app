import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => (
  <nav className="navbar">
    <div className="navbar-logo">Bioremediation</div>
    <div className="navbar-links">
      <NavLink to="/dashboard" className={({isActive}) => isActive ? 'active' : ''}>Dashboard</NavLink>
      <NavLink to="/add" className={({isActive}) => isActive ? 'active' : ''}>Add New Data</NavLink>
      <NavLink to="/compare" className={({isActive}) => isActive ? 'active' : ''}>Compare Methods</NavLink>
      <NavLink to="/timeline" className={({isActive}) => isActive ? 'active' : ''}>Timeline</NavLink>
      <NavLink to="/analysis" className={({isActive}) => isActive ? 'active' : ''}>Analysis</NavLink>
      <NavLink to="/prediction" className={({isActive}) => isActive ? 'active' : ''}>AI Prediction</NavLink>
    </div>
  </nav>
);

export default Navbar;
