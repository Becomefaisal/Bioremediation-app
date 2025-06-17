import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import FormPage from './components/FormPage';
import ComparePage from './components/ComparePage';
import TimelinePage from './components/TimelinePage';
import BatchDetail from './components/BatchDetail';
import AnalysisPage from './components/AnalysisPage';
import PredictionForm from './components/PredictionForm';
import './App.css';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/add" element={<FormPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/batch/:batchId" element={<BatchDetail />} />
        <Route path="/analysis" element={<AnalysisPage />} />
        <Route path="/prediction" element={<PredictionForm />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
