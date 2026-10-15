import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { RootState } from '../../state/store';
import { defaultAppPath, moduleIdForPath } from '../config/menu.config';
import { routerPathNames } from '../../routes/routerPathNames';

export const DefaultAppRedirect: React.FC = () => {
  const moduleIds = useSelector((s: RootState) => s.loginData.moduleIds || []);
  return <Navigate to={defaultAppPath(moduleIds)} replace />;
};

const ModuleAccessGuard: React.FC = () => {
  const location = useLocation();
  const moduleIds = useSelector((s: RootState) => s.loginData.moduleIds || []);
  const needed = moduleIdForPath(location.pathname);
  if (needed != null && !moduleIds.map(Number).includes(needed)) {
    const dest = defaultAppPath(moduleIds);
    const destModule = moduleIdForPath(dest);
    return <Navigate to={destModule === needed ? routerPathNames.dashboard : dest} replace />;
  }
  return <Outlet />;
};

export default ModuleAccessGuard;
