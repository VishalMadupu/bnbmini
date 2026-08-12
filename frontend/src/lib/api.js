import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;
export const fileUrl = (url) => (url?.startsWith("http") ? url : `${BACKEND_URL}${url}`);

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const url = config.url || "";
  if (url.startsWith("/admin") && url !== "/admin/login") {
    const t = localStorage.getItem("bnb_admin_token");
    if (t) config.headers.Authorization = `Bearer ${t}`;
  }
  return config;
});

export default api;
