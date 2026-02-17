import axios from "axios";

export const AUTH_TOKEN_STORAGE_KEY = "ats-auth-token";

const DEFAULT_PROD_API_URL = "https://resume-shortlister-kqna.onrender.com/api";
const DEFAULT_DEV_API_URL = "http://localhost:5000/api";
const API_BASE_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.PROD ? DEFAULT_PROD_API_URL : DEFAULT_DEV_API_URL);

export const api = axios.create({
  baseURL: API_BASE_URL
});

const getStoredAuthToken = () => {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
};

export const setAuthToken = (token) => {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
};

api.interceptors.request.use((config) => {
  const token = getStoredAuthToken();
  if (!token) {
    return config;
  }

  const nextConfig = { ...config };
  nextConfig.headers = nextConfig.headers || {};
  if (!nextConfig.headers.Authorization) {
    nextConfig.headers.Authorization = `Bearer ${token}`;
  }

  return nextConfig;
});
