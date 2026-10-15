import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse } from '@fortawesome/free-solid-svg-icons';
import { routerPathNames } from '../routes/routerPathNames';
import { version as appVersion } from '../../package.json';

interface ModuleSidebarShellProps {
  title: React.ReactNode;
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  children: React.ReactNode;
  className?: string;
}

const ModuleSidebarShell: React.FC<ModuleSidebarShellProps> = ({
  title,
  collapsed,
  mobileOpen,
  onCloseMobile,
  children,
  className = '',
}) => {
  const location = useLocation();
  const homePath = routerPathNames.dashboard;
  const isHome = location.pathname === homePath;

  return (
    <>
      <div
        className={`mobile-overlay ${mobileOpen ? 'show' : ''}`}
        onClick={onCloseMobile}
      />

      <div
        className={`module-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''} ${className}`.trim()}
      >
        <div className="module-sidebar-inner">
          <div className="module-sidebar-content">
            <div className="sidebar-header">
              <h2 className="sidebar-header-title">{title}</h2>
            </div>
            <div className="sidebar-nav">
              <ul className="sidebar-menu">
                <li className="menu-item">
                  <Link
                    to={homePath}
                    className={`menu-item-button ${isHome ? 'active' : ''}`}
                    onClick={onCloseMobile}
                    title={collapsed ? 'Home' : undefined}
                  >
                    <span className="menu-item-icon">
                      <FontAwesomeIcon icon={faHouse} />
                    </span>
                    <span className="menu-item-text">Home</span>
                  </Link>
                </li>
              </ul>
              {children}
            </div>
          </div>
          <div className="sidebar-footer">
            <div className="sidebar-version" title={`Version ${appVersion}`}>
              v{appVersion}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModuleSidebarShell;
