import React, { useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminManagement from './pages/AdminManagement';
import TeamManagement from './pages/TeamManagement';
import Tasks from './pages/Tasks';
import PatientManagement from './pages/PatientManagement';
import Appointments from './pages/Appointments';
import Leads from './pages/Leads';
import Reminders from './pages/Reminders';
import LeadProfile from './pages/LeadProfile';
import ServicesAndPackages from './pages/ServicesAndPackages';
import SOPManagement from './pages/SOPManagement';
import MySOP from './pages/MySOP';
import MyWorkspace from './pages/MyWorkspace';
import RuleManagement from './pages/RuleManagement';
import MyRule from './pages/MyRule';
import WebsiteSettings from './pages/WebsiteSettings';
import Attendance from './pages/Attendance';
import ChecklistTemplates from './pages/ChecklistTemplates';
import Payroll from './pages/Payroll';
import CallLogs from './pages/CallLogs';
import AdminCallLogs from './pages/AdminCallLogs';
import HolidaysEvents from './pages/HolidaysEvents';
import Leaves from './pages/Leaves';
import Payments from './pages/Payments';
import PaymentQR from './pages/PaymentQR';
import ScheduleManagement from './pages/ScheduleManagement';
import HomeExpense from './pages/HomeExpense';
import DailyReport from './pages/DailyReport';
import Complaints from './pages/Complaints';
import PharmacyBills from './pages/PharmacyBills';
import Layout from './components/Layout';
import RequireModule from './permissions/RequireModule';
import { refreshPermissions } from './permissions/usePermissions';
import './App.css';

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    const mainEl = document.querySelector('.page-content-wrapper');
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const API_URL = import.meta.env.VITE_API_BASE_URL;
    const verifySession = async () => {
      try {
        await axios.get(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        if (err.response && (err.response.status === 401 || err.response.status === 404)) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
      }
    };

    verifySession();
    const interval = setInterval(verifySession, 15000);
    window.addEventListener('focus', verifySession);
    // Tab pe wapas aane pe latest permissions (Superadmin ne change kiye ho to sidebar update ho jaye)
    window.addEventListener('focus', refreshPermissions);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', verifySession);
      window.removeEventListener('focus', refreshPermissions);
    };
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={!isAuthenticated ? <Login loginType="Superadmin" /> : <Navigate to="/" />} />
        <Route path="/admin/login" element={!isAuthenticated ? <Login loginType="Admin" /> : <Navigate to="/" />} />
        <Route path="/team/login" element={!isAuthenticated ? <Login loginType="Team" /> : <Navigate to="/" />} />
        
        {/* Protected Routes inside Layout (module on/off Website Settings > Roles & Permissions se) */}
        <Route path="/" element={
          isAuthenticated ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />
        } />
        <Route path="/patients" element={
          isAuthenticated ? <RequireModule module="patients"><Layout><PatientManagement /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/call-logs" element={
          isAuthenticated ? <RequireModule module="call-logs"><Layout><AdminCallLogs /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/calls" element={
          isAuthenticated ? <Layout><CallLogs /></Layout> : <Navigate to="/login" />
        } />
        <Route path="/appointments" element={
          isAuthenticated ? <RequireModule module="appointments"><Layout><Appointments /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/leads" element={
          isAuthenticated ? <RequireModule module="leads"><Layout><Leads /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/reminders" element={
          isAuthenticated ? <RequireModule module="reminders"><Layout><Reminders /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/leads/:id" element={
          isAuthenticated ? <RequireModule module="leads"><Layout><LeadProfile /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/admin-management" element={
          isAuthenticated ? <RequireModule module="admin-management"><Layout><AdminManagement /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/team-management" element={
          isAuthenticated ? <RequireModule module="team-management"><Layout><TeamManagement /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/services" element={
          isAuthenticated ? <RequireModule module="services"><Layout><ServicesAndPackages /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/packages" element={<Navigate to="/services" replace />} />
        <Route path="/tasks" element={
          isAuthenticated ? <RequireModule module="tasks"><Layout><Tasks initialView="all" /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/my-tasks" element={
          isAuthenticated ? <RequireModule module="tasks"><Layout><Tasks initialView="my" /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/sop-management" element={
          isAuthenticated ? <RequireModule module="sop-management"><Layout><SOPManagement /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/my-sop" element={
          isAuthenticated ? <RequireModule module="my-workspace"><Layout><MyWorkspace /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/my-workspace" element={
          isAuthenticated ? <RequireModule module="my-workspace"><Layout><MyWorkspace /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/rule-management" element={
          isAuthenticated ? <RequireModule module="rule-management"><Layout><RuleManagement /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/my-rules" element={
          isAuthenticated ? <RequireModule module="my-workspace"><Layout><MyWorkspace /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/checklist-templates" element={
          isAuthenticated ? <RequireModule module="checklist-templates"><Layout><ChecklistTemplates /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/complaints" element={
          isAuthenticated ? <RequireModule module="complaints"><Layout><Complaints /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/pharmacy-bills" element={
          isAuthenticated ? <RequireModule module="pharmacy-bills"><Layout><PharmacyBills /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/attendance" element={
          isAuthenticated ? <RequireModule module="attendance"><Layout><Attendance /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/payroll" element={
          isAuthenticated ? <RequireModule module="payroll"><Layout><Payroll /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/superadmin/payments" element={
          isAuthenticated ? <RequireModule module="payments"><Layout><Payments /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/superadmin/payment-qr" element={
          isAuthenticated ? <RequireModule module="payment-qr"><Layout><PaymentQR /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/superadmin/schedule-management" element={
          isAuthenticated ? <RequireModule module="schedule-management"><Layout><ScheduleManagement /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/holidays" element={
          isAuthenticated ? <RequireModule module="holidays"><Layout><HolidaysEvents /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/leaves" element={
          isAuthenticated ? <RequireModule module="leaves"><Layout><Leaves /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/daily-reports" element={
          isAuthenticated ? <RequireModule module="daily-reports"><Layout><DailyReport /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/superadmin/home-expense" element={
          isAuthenticated ? <RequireModule module="home-expense"><Layout><HomeExpense /></Layout></RequireModule> : <Navigate to="/login" />
        } />
        <Route path="/website-settings" element={
          isAuthenticated ? (user.role === 'superadmin' ? <Layout><WebsiteSettings /></Layout> : <Navigate to="/" replace />) : <Navigate to="/login" />
        } />
      </Routes>
    </Router>
  );
}

export default App;



