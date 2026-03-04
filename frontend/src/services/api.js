import axios from 'axios';

// Our main Axios instance. `withCredentials: true` is super important here so it automatically sends our HttpOnly cookies to the backend.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
    withCredentials: true,
});

// Automatically handle 401s (expired access token) by hitting the refresh endpoint silently
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // skip retry for auth endpoints to prevent infinite loops
        const skipRetryUrls = ['/users/refresh-token', '/users/logout', '/users/login', '/users/register'];
        const shouldSkip = skipRetryUrls.some(url => originalRequest.url?.includes(url));

        if (error.response?.status === 401 && !originalRequest._retry && !shouldSkip) {
            originalRequest._retry = true;

            try {
                await api.post('/users/refresh-token');
                return api(originalRequest);
            } catch (refreshError) {
                console.error("Session expired. Please log in again.");
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
