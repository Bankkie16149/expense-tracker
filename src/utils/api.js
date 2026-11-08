export const fetchWithAuth = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const API_BASE_URL = import.meta.env.VITE_API_URL || '';
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    // Unauthorized or session expired: clear local storage and redirect to login with return target
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== '/' && !currentPath.startsWith('/forgot-password') && !currentPath.startsWith('/reset-password')) {
      window.location.href = `/?redirect=${encodeURIComponent(currentPath)}`;
    } else {
      window.location.href = '/';
    }
  }

  return response;
};
