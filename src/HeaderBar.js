import React, { useEffect, useMemo, useRef, useState } from 'react';
import EventSelector from './EventSelector';
import { useTenant } from './TenantContext';
import './HeaderBar.css';

export default function HeaderBar({ onLogout }) {
  const { currentUser } = useTenant();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  const initials = useMemo(() => {
    const name = currentUser?.displayName || currentUser?.email || 'U';
    const core = String(name).split('@')[0];
    const parts = core.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }, [currentUser]);

  return (
    <div className="header-bar">
      <div className="header-left">
        <EventSelector />
      </div>
      <div className="header-right">
        <div className="user-menu" ref={menuRef}>
          <button className="user-button" onClick={() => setOpen((o) => !o)}>
            <span className="avatar" aria-hidden>{initials}</span>
            <span className="user-meta">
              <span className="user-name">{currentUser?.displayName || 'Signed in'}</span>
              <span className="user-email">{currentUser?.email}</span>
            </span>
            <i className="fas fa-chevron-down user-caret"/>
          </button>
          {open && (
            <div className="menu-dropdown" role="menu">
              <div className="menu-item" style={{ cursor: 'default', color: '#64748b' }}>
                <i className="far fa-user"/>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{currentUser?.displayName || 'Authenticated User'}</div>
                  <div style={{ fontSize: 12 }}>{currentUser?.email}</div>
                </div>
              </div>
              <div className="menu-sep"/>
              <div className="menu-item" onClick={() => setOpen(false)}>
                <i className="far fa-question-circle"/>
                Help & Support
              </div>
              <div className="menu-item" onClick={() => setOpen(false)}>
                <i className="fas fa-cog"/>
                Settings
              </div>
              <div className="menu-sep"/>
              <div className="menu-item" onClick={() => { setOpen(false); onLogout && onLogout(); }} role="menuitem">
                <i className="fas fa-sign-out-alt"/>
                Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
