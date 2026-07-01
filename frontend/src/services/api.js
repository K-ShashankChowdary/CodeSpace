import axios from 'axios';

// Our main Axios instance. `withCredentials: true` sends HttpOnly cookies automatically.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api/v1',
    withCredentials: true,
});

// Attach guest JWT as Authorization header when a guestToken exists in localStorage.
// Regular users are unaffected — their accessToken is an HttpOnly cookie sent automatically.
api.interceptors.request.use((config) => {
    const guestToken = localStorage.getItem("guestToken");
    if (guestToken) {
        config.headers["Authorization"] = `Bearer ${guestToken}`;
    }
    return config;
});

// Automatically handle 401s (expired access token) by hitting the refresh endpoint silently
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // skip retry for auth endpoints to prevent infinite loops
        // also skip retry if we're in a guest session (no refresh token exists)
        const skipRetryUrls = ['/users/refresh-token', '/users/logout', '/users/login', '/users/register', '/sessions/guest-join'];
        const shouldSkip = skipRetryUrls.some(url => originalRequest.url?.includes(url));
        const isGuestRoute = window.location.pathname.startsWith('/join/');
        const isGuest = !!localStorage.getItem("guestToken");

        if (error.response?.status === 401 && !originalRequest._retry && !shouldSkip && !isGuest && !isGuestRoute) {
            originalRequest._retry = true;

            try {
                await api.post('/users/refresh-token');
                return api(originalRequest);
            } catch (refreshError) {
                console.error("Session expired. Please log in again.");
                if (window.location.pathname !== '/auth' && !isGuestRoute) {
                    window.location.href = '/auth';
                }
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
