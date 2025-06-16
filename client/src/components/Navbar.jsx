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
    </div>
  </nav>
);

export default Navbar;
