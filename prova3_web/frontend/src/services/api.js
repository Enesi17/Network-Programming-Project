import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',  // Adjust this URL as needed
});

export const login = (username, password) => api.post('/login', { username, password });
export const signup = (username, password, email) => api.post('/signup', { username, password, email });
export const getProfile = (userId) => api.get(`/profile/${userId}`);
export const updateProfile = (userId, profileData) => api.put(`/profile/${userId}`, profileData);

export default api;
