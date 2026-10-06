import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckSquareIcon,
  LogoutIcon,
  XIcon,
  DashboardIcon,
  ShieldCheckIcon,
  UsersIcon,
  CalendarCheckIcon,
  BookOpenIcon,
  BookmarkIcon,
  SlidersIcon,
  HeartPulseIcon,
  PhoneCallIcon,
  CalendarDaysIcon,
  PackageIcon,
  ClipboardListIcon,
  UserCheckIcon,
  BanknoteIcon,
  CreditCardIcon,
  QrCodeIcon,
  SettingsIcon,
  BellIcon
} from './Icons';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const mainContentRef = useRef(null);

  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


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
    if (window.innerWidth <= 992) {
      setIsMobileMenuOpen(!isMobileMenuOpen);
    } else {
      setIsSidebarHidden(false);
    }
  };

  const closeMobileMenu = () => {
    if (window.innerWidth <= 992) {
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
            <button className="mobile-menu-close" onClick={closeMobileMenu} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}>
              <XIcon size={24} />
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


          {user.role === 'superadmin' && (
            <li className={location.pathname === '/superadmin/schedule-management' ? 'active' : ''} onClick={closeMobileMenu}>
              <Link to="/superadmin/schedule-management">
                <CalendarDaysIcon size={14} />
                <span>Schedule Management</span>
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

          {(user.role === 'superadmin' || user.role === 'admin') && (
            <li className={location.pathname === '/rule-management' ? 'active' : ''} onClick={closeMobileMenu}>
              <Link to="/rule-management">
                <SlidersIcon size={14} />
                <span>Rule Management</span>
              </Link>
            </li>
          )}

          <li className={location.pathname === '/my-workspace' || location.pathname === '/my-sop' ? 'active' : ''} onClick={closeMobileMenu}>
            <Link to="/my-workspace">
              <BookmarkIcon size={14} />
              <span>My SOP and Rules</span>
            </Link>
          </li>

          
          <li className={location.pathname === '/tasks' || location.pathname === '/my-tasks' ? 'active' : ''} onClick={closeMobileMenu}>
            <Link to="/tasks">
              <ClipboardListIcon size={14} />
              <span>Task Management</span>
            </Link>
          </li>

          <li className={location.pathname === '/patients' ? 'active' : ''} onClick={closeMobileMenu}>
            <Link to="/patients">
              <HeartPulseIcon size={14} />
              <span>Patient Database</span>
            </Link>
          </li>
          
          <li className={location.pathname === '/leads' ? 'active' : ''} onClick={closeMobileMenu}>
            <Link to="/leads">
              <UsersIcon size={14} />
              <span>Leads</span>
            </Link>
          </li>


          <li className={location.pathname === '/reminders' ? 'active' : ''} onClick={closeMobileMenu}>
            <Link to="/reminders">
              <BellIcon size={14} />
              <span>Reminders</span>
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
          
          {(user.role === 'superadmin' || user.role === 'admin') && (
            <li className={location.pathname === '/checklist-templates' ? 'active' : ''}  onClick={closeMobileMenu}>
              <Link to="/checklist-templates">
                <CheckSquareIcon size={14} />
                <span>Checklist Templates</span>
              </Link>
            </li>
          )}
          
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
        <div className="global-topbar">
          <div className="topbar-left">
            <button className="hamburger-btn" onClick={() => { if (window.innerWidth <= 992) { setIsMobileMenuOpen(!isMobileMenuOpen); } else { setIsSidebarHidden(!isSidebarHidden); } }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <h2 className="topbar-brand">Satguru Clinic</h2>
          </div>
          <div className="topbar-right">
            <div className="profile-menu-container" ref={profileMenuRef}>
              <div className="profile-avatar-btn" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                {(user.name || user.role || 'U').charAt(0).toUpperCase()}
              </div>
              {isProfileOpen && (
                <div className="profile-dropdown-panel">
                  <div className="panel-header">
                    <div className="panel-avatar">{(user.name || user.role || 'U').charAt(0).toUpperCase()}</div>
                    <div className="panel-user-info">
                      <span className="panel-name">{user.name || 'User'}</span>
                      <span className="panel-email">{user.email || user.role || 'No Email'}</span>
                    </div>
                  </div>
                  <div className="panel-body">
                    <button onClick={handleLogout} className="panel-logout-btn">
                      <LogoutIcon size={16} /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="page-content-wrapper">
          {children}
        </div>
      </div>

    </div>
  );
};

export default Layout;












