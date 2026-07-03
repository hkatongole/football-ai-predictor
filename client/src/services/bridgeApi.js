import axios from 'axios';
import { getAccessToken } from './api.js';

const BRIDGE_URL = import.meta.env.VITE_BRIDGE_URL || 'http://localhost:5050/api/v1';

const bridgeApi = axios.create({ baseURL: BRIDGE_URL });

// Reuse the same access token as the main API client (both trust the same
// JWT_ACCESS_SECRET — the bridge only decodes it to gate premium content,
// it never issues or refreshes tokens itself).
bridgeApi.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default bridgeApi;

