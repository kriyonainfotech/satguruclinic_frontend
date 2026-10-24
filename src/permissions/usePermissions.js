import { useEffect, useState } from 'react';
import axios from 'axios';
import { getDefaultModules } from './modules';

// Logged-in user ki module permissions ek hi jagah se (sab components share karte hain).
// localStorage me cache rehta hai taaki page refresh pe sidebar turant dikhe,
// phir backend se fresh permissions aa jaati hain.
const CACHE_KEY = 'permissions';

const getUser = () => JSON.parse(localStorage.getItem('user') || '{}');
const getUserId = (user) => user.userId || user._id || user.id || '';

const readCache = () => {
  const user = getUser();
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached && cached.userId === getUserId(user) && cached.modules) return cached.modules;
  } catch (e) {
    // cache kharab ho to ignore
  }
  return null;
};

let state = { modules: readCache(), loaded: false };
let inFlight = null;
const listeners = new Set();

const setState = (next) => {
  state = { ...state, ...next };
  listeners.forEach(fn => fn(state));
};

export const refreshPermissions = () => {
  const token = localStorage.getItem('token');
  if (!token) return Promise.resolve();
  if (inFlight) return inFlight;

  inFlight = axios.get(`${import.meta.env.VITE_API_BASE_URL}/permissions/me`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ userId: getUserId(getUser()), modules: res.data.modules }));
      setState({ modules: res.data.modules, loaded: true });
    })
    .catch(err => {
      console.error('Error fetching permissions', err);
      // Fail hone pe cache/defaults hi chalte rahenge
      setState({ loaded: true });
    })
    .finally(() => { inFlight = null; });
  return inFlight;
};

export const clearPermissionsCache = () => {
  localStorage.removeItem(CACHE_KEY);
  state = { modules: null, loaded: false };
};

const usePermissions = () => {
  const [snapshot, setSnapshot] = useState(state);

  useEffect(() => {
    listeners.add(setSnapshot);
    if (!state.loaded) refreshPermissions();
    return () => listeners.delete(setSnapshot);
  }, []);

  const user = getUser();
  const modules = snapshot.modules || getDefaultModules(user.role);

  // key = 'rule-management' ya 'rule-management:create' (action ke liye module bhi on hona chahiye)
  const can = (key) => {
    if (user.role === 'superadmin') return true;
    const moduleKey = key.split(':')[0];
    if (!modules[moduleKey]) return false;
    if (modules[key] === undefined) return !!getDefaultModules(user.role)[key];
    return !!modules[key];
  };

  return { can, modules, loaded: snapshot.loaded };
};

export default usePermissions;
