import React from 'react';
import { Navigate } from 'react-router-dom';
import usePermissions from './usePermissions';

// Route guard: module off hai to Dashboard pe bhej do.
// Agar abhi fresh permissions load nahi hui aur cache "off" bol raha hai, to redirect se pehle load ka wait karo
// (ho sakta hai Superadmin ne abhi abhi on kiya ho).
const RequireModule = ({ module, children }) => {
  const { can, loaded } = usePermissions();

  if (can(module)) return children;
  if (!loaded) return null;
  return <Navigate to="/" replace />;
};

export default RequireModule;
