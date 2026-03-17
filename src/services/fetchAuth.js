// Authenticated fetch wrapper
export function fetchAuth(url, options = {}) {
    const token = localStorage.getItem('lumina_token');
    const headers = {
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
}
