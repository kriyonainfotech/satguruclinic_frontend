import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminManagement from './pages/AdminManagement';
import TeamManagement from './pages/TeamManagement';
import Tasks from './pages/Tasks';
import PatientManagement from './pages/PatientManagement';
import Appointments from './pages/Appointments';
import ServicesAndPackages from './pages/ServicesAndPackages';
import SOPManagement from './pages/SOPManagement';
import MySOP from './pages/MySOP';
import RuleManagement from './pages/RuleManagement';
import MyRule from './pages/MyRule';
import WebsiteSettings from './pages/WebsiteSettings';
import Attendance from './pages/Attendance';
import Payroll from './pages/Payroll';
import CallLogs from './pages/CallLogs';
import AdminCallLogs from './pages/AdminCallLogs';
import HolidaysEvents from './pages/HolidaysEvents';
import Payments from './pages/Payments';
import PaymentQR from './pages/PaymentQR';
import Layout from './components/Layout';
import './App.css';

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const mainEl = document.querySelector('.main-content');
    if (mainEl) {
      mainEl.scrollTop = 0;
      mainEl.scrollLeft = 0;
    }
  }, [pathname, search]);

  return null;
}

// Main App Router
function App() {
  const isAuthenticated = !!localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login loginType="Superadmin" /> : <Navigate to="/" />} />
        <Route path="/admin/login" element={!isAuthenticated ? <Login loginType="Admin" /> : <Navigate to="/" />} />
        <Route path="/team/login" element={!isAuthenticated ? <Login loginType="Team" /> : <Navigate to="/" />} />
        
        {/* Protected Routes inside Layout */}
        <Route path="/" element={
          isAuthenticated ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />
        } />
        <Route path="/patients" element={
          isAuthenticated ? <Layout><PatientManagement /></Layout> : <Navigate to="/login" />
        } />
        
        <Route path="/call-logs" element={
          isAuthenticated ? <Layout><AdminCallLogs /></Layout> : <Navigate to="/login" />
        } />
        <Route path="/calls" element={
          isAuthenticated ? <Layout><CallLogs /></Layout> : <Navigate to="/login" />
        } />
        <Route path="/appointments" element={
          isAuthenticated ? <Layout><Appointments /></Layout> : <Navigate to="/login" />
        } />
        
        <Route path="/admin-management" element={
          isAuthenticated ? <Layout><AdminManagement /></Layout> : <Navigate to="/login" />
        } />
        
        <Route path="/team-management" element={
          isAuthenticated ? (
            user?.role === 'team' ? <Navigate to="/" replace /> : <Layout><TeamManagement /></Layout>
          ) : <Navigate to="/login" />
        } />
        
        <Route path="/services" element={
          isAuthenticated ? <Layout><ServicesAndPackages /></Layout> : <Navigate to="/login" />
        } />

        <Route path="/packages" element={
          <Navigate to="/services" replace />
        } />

        <Route path="/tasks" element={
          isAuthenticated ? <Layout><Tasks initialView="all" /></Layout> : <Navigate to="/login" />
        } />

        <Route path="/my-tasks" element={
          isAuthenticated ? <Layout><Tasks initialView="my" /></Layout> : <Navigate to="/login" />
        } />
        
        <Route path="/sop-management" element={
          isAuthenticated ? <Layout><SOPManagement /></Layout> : <Navigate to="/login" />
        } />

        <Route path="/my-sop" element={
          isAuthenticated ? <Layout><MySOP /></Layout> : <Navigate to="/login" />
        } />

        <Route path="/rule-management" element={
          isAuthenticated ? <Layout><RuleManagement /></Layout> : <Navigate to="/login" />
        } />

        <Route path="/my-rules" element={
          isAuthenticated ? <Layout><MyRule /></Layout> : <Navigate to="/login" />
        } />
        
        <Route path="/website-settings" element={
          isAuthenticated ? <Layout><WebsiteSettings /></Layout> : <Navigate to="/login" />
        } />
        
        <Route path="/attendance" element={
          isAuthenticated ? (
            (user.role === 'superadmin' || user.role === 'admin') ? (
              <Layout><Attendance /></Layout>
            ) : (
              <Navigate to="/" replace />
            )
          ) : <Navigate to="/login" />
        } />
        
        <Route path="/payroll" element={
          isAuthenticated ? (
            (user.role === 'superadmin' || user.role === 'admin') ? (
              <Layout><Payroll /></Layout>
            ) : (
              <Navigate to="/" replace />
            )
          ) : <Navigate to="/login" />
        } />
        <Route path="/superadmin/payments" element={
          isAuthenticated ? (
            user.role === 'superadmin' ? (
              <Layout><Payments /></Layout>
            ) : (
              <Navigate to="/" replace />
            )
          ) : <Navigate to="/login" />
        } />
        <Route path="/superadmin/payment-qr" element={
          isAuthenticated ? (
            user.role === 'superadmin' ? (
              <Layout><PaymentQR /></Layout>
            ) : (
              <Navigate to="/" replace />
            )
          ) : <Navigate to="/login" />
        } />
        <Route path="/holidays" element={isAuthenticated ? <Layout><HolidaysEvents /></Layout> : <Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;

