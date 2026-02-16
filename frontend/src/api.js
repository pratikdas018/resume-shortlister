import axios from "axios";

export const AUTH_TOKEN_STORAGE_KEY = "ats-auth-token";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
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
