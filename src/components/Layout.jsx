import axios from 'axios';
import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LogoutIcon,
  XIcon,
  DashboardIcon,
  SettingsIcon
} from './Icons';
import usePermissions, { clearPermissionsCache } from '../permissions/usePermissions';
import { PERMISSION_MODULES } from '../permissions/modules';
import './Layout.css';

const Layout = ({ children }) => {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [myPerfScore, setMyPerfScore] = useState(null);
  const { can } = usePermissions();

  useEffect(() => {
    if (user.role === 'team') {
        const token = localStorage.getItem('token');
        axios.get(`${import.meta.env.VITE_API_BASE_URL}/auth/users/team`, { headers: { Authorization: `Bearer ${token}` } })
            .then(res => {
                const me = res.data.find(u => u._id === user.userId || u._id === user._id || u.email === user.email);
                if (me && me.performanceScore !== undefined) {
                    setMyPerfScore(me.performanceScore);
                }
            })
            .catch(err => console.log(err));
    }
  }, []);

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

  
  const perfColor = myPerfScore === null || myPerfScore === undefined ? 'transparent' : (myPerfScore <= 80 ? '#ef4444' : myPerfScore <= 90 ? '#eab308' : '#22c55e');
  const borderStyle = { border: `3px solid ${perfColor}` };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    clearPermissionsCache();
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
          {PERMISSION_MODULES.filter(m => can(m.key)).map(m => {
            const Icon = m.icon;
            const isActive = m.isActive ? m.isActive(location.pathname) : location.pathname === m.path;
            return (
              <li key={m.key} className={isActive ? 'active' : ''} onClick={closeMobileMenu}>
                <Link to={m.path}>
                  <Icon size={14} />
                  <span>{m.label}</span>
                </Link>
              </li>
            );
          })}

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
            <div className="sidebar-avatar" style={borderStyle}>
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
              <div className="profile-avatar-btn" onClick={() => setIsProfileOpen(!isProfileOpen)} style={borderStyle}>
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












