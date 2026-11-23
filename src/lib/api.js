import React from 'react';

const TOKEN_KEY = 'dlms_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

async function request(path, { method = 'GET', body, params, signal } = {}) {
  const url = new URL(`/api${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });
  }
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload = body;
  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let response;
  try {
    response = await fetch(url, { method, headers, body: payload, signal });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Cannot reach the library server. Is the API running?');
  }
  let data = null;
  try { data = await response.json(); } catch { /* empty response */ }
  if (!response.ok) {
    const error = new Error(data?.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.code = data?.code;
    throw error;
  }
  return data;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};

export function useApi(path, deps = [], { enabled = true } = {}) {
  const [state, setState] = React.useState({ data: null, loading: enabled, error: null });
  const [nonce, setNonce] = React.useState(0);
  const safeDeps = Array.isArray(deps) ? deps : [];
  React.useEffect(() => {
    if (!enabled) { setState({ data: null, loading: false, error: null }); return; }
    const controller = new AbortController();
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    api.get(path, { signal: controller.signal })
      .then((data) => { if (active) setState({ data, loading: false, error: null }); })
      .catch((error) => { if (active && error.name !== 'AbortError') setState({ data: null, loading: false, error }); });
    return () => { active = false; controller.abort(); };
  }, [path, enabled, nonce, ...safeDeps]);
  return { ...state, refetch: () => setNonce((n) => n + 1) };
}
