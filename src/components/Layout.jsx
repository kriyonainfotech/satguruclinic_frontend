import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LogoutIcon,
  XIcon,
  DashboardIcon,
  ShieldCheckIcon,
  UsersIcon,
  CalendarCheckIcon,
  BookOpenIcon,
  BookmarkIcon,
  SlidersIcon,
  CheckSquareIcon,
  HeartPulseIcon,
  PhoneCallIcon,
  CalendarDaysIcon,
  PackageIcon,
  ClipboardListIcon,
  UserCheckIcon,
  BanknoteIcon,
  CreditCardIcon,
  QrCodeIcon,
  SettingsIcon
} from './Icons';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const mainContentRef = useRef(null);

  // Automatically reset scroll to top on every page change
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
      mainContentRef.current.scrollLeft = 0;
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname, location.search]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const toggleMobileMenu = () => {
    if (window.innerWidth <= 768) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } else {
      setIsSidebarHidden(false);
    }
  };

  const closeMobileMenu = () => {
    if (window.innerWidth <= 768) {
      setIsMobileMenuOpen(false);
    }
  };

  const manuallyHideSidebar = () => {
    setIsSidebarHidden(true);
  };

  return (
    <div className={`layout-container ${isSidebarHidden ? 'sidebar-hidden' : ''}`} style={{ flexDirection: isSidebarHidden ? 'column' : 'row' }}>
      {/* Mobile Top Bar */}
      <div className={`mobile-topbar ${isSidebarHidden ? 'force-show' : ''}`}>
        <div className="mobile-topbar-brand">Satguru Clinic</div>
        <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
          ☰
        </button>
      </div>

      <div className={`sidebar ${isMobileMenuOpen ? 'open' : ''} ${isSidebarHidden ? 'hidden' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand-mobile">
            <h2>Satguru Clinic</h2>
            <button className="mobile-menu-close" onClick={() => { closeMobileMenu(); manuallyHideSidebar(); }} aria-label="Close menu">
              <XIcon size={20} />
            </button>
          </div>
        </div>

        <ul className="sidebar-nav">
          <li className={location.pathname === '/' ? 'active' : ''} onClick={closeMobileMenu}>
            <Link to="/">
              <DashboardIcon size={14} />
              <span>Dashboard</span>
            </Link>
          </li>
          {user.role === 'superadmin' && (
            <li className={location.pathname === '/admin-management' ? 'active' : ''} onClick={closeMobileMenu}>
              <Link to="/admin-management">
                <ShieldCheckIcon size={14} />
                <span>Admin Management</span>
              </Link>
            </li>
          )}
          {(user.role === 'superadmin' || user.role === 'admin') && (
            <li className={location.pathname === '/team-management' ? 'active' : ''} onClick={closeMobileMenu}>
              <Link to="/team-management">
                <UsersIcon size={14} />
                <span>Team Management</span>
              </Link>
            </li>
          )}

          <li className={location.pathname === '/appointments' ? 'active' : ''} onClick={closeMobileMenu}>
            <Link to="/appointments">
              <CalendarCheckIcon size={14} />
              <span>Appointments</span>
            </Link>
          </li>

          {(user.role === 'superadmin' || user.role === 'admin') && (
            <li className={location.pathname === '/sop-management' ? 'active' : ''} onClick={closeMobileMenu}>
              <Link to="/sop-management">
                <BookOpenIcon size={14} />
                <span>SOP Management</span>
              </Link>
            </li>
          )}

          <li className={location.pathname === '/my-sop' ? 'active' : ''} onClick={closeMobileMenu}>
            <Link to="/my-sop">
              <BookmarkIcon size={14} />
              <span>My SOP</span>
            </Link>
          </li>

          {(user.role === 'superadmin' || user.role === 'admin') && (
            <li className={location.pathname === '/rule-management' ? 'active' : ''} onClick={closeMobileMenu}>
              <Link to="/rule-management">
                <SlidersIcon size={14} />
                <span>Rule Management</span>
              </Link>
            </li>
          )}

          <li className={location.pathname === '/my-rules' ? 'active' : ''} onClick={closeMobileMenu}>
            <Link to="/my-rules">
              <CheckSquareIcon size={14} />
              <span>My Rules</span>
            </Link>
          </li>

          <li className={location.pathname === '/patients' ? 'active' : ''} onClick={closeMobileMenu}>
            <Link to="/patients">
              <HeartPulseIcon size={14} />
              <span>Patient Database</span>
            </Link>
          </li>
          
          {user && (user.role === 'superadmin' || user.role === 'admin') && (
            <li className={location.pathname === '/call-logs' ? 'active' : ''} onClick={closeMobileMenu}>
              <Link to="/call-logs">
                <PhoneCallIcon size={14} />
                <span>Call Logs</span>
              </Link>
            </li>
          )}

          {user && (user.role === 'admin' || user.role === 'team') && (
            <li className={location.pathname === '/calls' ? 'active' : ''} onClick={closeMobileMenu}>
              <Link to="/calls">
                <PhoneCallIcon size={14} />
                <span>Followup Calls</span>
              </Link>
            </li>
          )}

          <li className={location.pathname === '/holidays' ? 'active' : ''} onClick={closeMobileMenu}>
            <Link to="/holidays">
              <CalendarDaysIcon size={14} />
              <span>Holidays & Events</span>
            </Link>
          </li>
          
          <li className={location.pathname.startsWith('/services') ? 'active' : ''} onClick={closeMobileMenu}>
            <Link to="/services">
              <PackageIcon size={14} />
              <span>Services & Packages</span>
            </Link>
          </li>
       
          <li className={location.pathname === '/tasks' || location.pathname === '/my-tasks' ? 'active' : ''} onClick={closeMobileMenu}>
            <Link to="/tasks">
              <ClipboardListIcon size={14} />
              <span>Task Management</span>
            </Link>
          </li>
          
          {(user.role === 'superadmin' || user.role === 'admin') && (
            <li className={location.pathname === '/attendance' ? 'active' : ''} onClick={closeMobileMenu}>
              <Link to="/attendance">
                <UserCheckIcon size={14} />
                <span>Attendance</span>
              </Link>
            </li>
          )}
          
          {(user.role === 'superadmin' || user.role === 'admin') && (
            <li className={location.pathname === '/payroll' ? 'active' : ''} onClick={closeMobileMenu}>
              <Link to="/payroll">
                <BanknoteIcon size={14} />
                <span>Payroll & Salaries</span>
              </Link>
            </li>
          )}
          
          {user.role === 'superadmin' && (
            <li className={location.pathname === '/superadmin/payments' ? 'active' : ''} onClick={closeMobileMenu}>
              <Link to="/superadmin/payments">
                <CreditCardIcon size={14} />
                <span>Payments & Finances</span>
              </Link>
            </li>
          )}

          {user.role === 'superadmin' && (
            <li className={location.pathname === '/superadmin/payment-qr' ? 'active' : ''} onClick={closeMobileMenu}>
              <Link to="/superadmin/payment-qr">
                <QrCodeIcon size={14} />
                <span>Payment QR</span>
              </Link>
            </li>
          )}
          
          {user.role === 'superadmin' && (
            <li className={location.pathname === '/website-settings' ? 'active' : ''} onClick={closeMobileMenu}>
              <Link to="/website-settings">
                <SettingsIcon size={14} />
                <span>Website Settings</span>
              </Link>
            </li>
          )}
        </ul>

        {/* Niche logout button ke sath team ya admin member ka name */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">
              {(user.name || user.role || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-details">
              <span className="sidebar-user-name" title={user.name}>{user.name || 'User'}</span>
              <span className="sidebar-user-role">{user.role || 'Member'}</span>
            </div>
          </div>
          <button onClick={handleLogout} className="logout-btn" title="Logout" aria-label="Logout">
            <LogoutIcon size={16} />
            <span>Logout</span>
          </button>
        </div>
      </div>
      
      {isMobileMenuOpen && <div className="sidebar-overlay" onClick={closeMobileMenu}></div>}

      <div className="main-content" ref={mainContentRef}>
        {children}
      </div>
    </div>
  );
};

export default Layout;
