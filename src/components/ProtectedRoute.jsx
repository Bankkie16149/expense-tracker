import { Navigate, useLocation } from 'react-router-dom';

/**
 * Route Guard component:
 * - Checks if user has a valid active token / session in localStorage.
 * - If valid, permits access to the route immediately.
 * - If not logged in or session expired, redirects to Login page with a return URL
 *   to prevent unauthorized access to sensitive financial accounts.
 */
const hasValidSession = () => {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem('token')) return true;
  if (document.cookie) {
    const match = document.cookie.match(/(?:^|;\s*)(?:token|session|auth|connect\.sid)=([^;]+)/);
    if (match && match[1]) return true;
  }
  return false;
};

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = hasValidSession();

  if (!isAuthenticated) {
    const returnTarget = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/?redirect=${returnTarget}`} replace />;
  }

  return children;
};

export default ProtectedRoute;
