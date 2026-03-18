import axios from "axios";

const BASE = "/api";

// Initialise token from localStorage so sessions survive page refresh
let token = localStorage.getItem("token");

export const setToken = (t) => {
    token = t;
    if (t) localStorage.setItem("token", t);
    else localStorage.removeItem("token");
};

export const clearToken = () => {
    token = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
};

export const getToken = () => token;

const headers = () => token ? { Authorization: `Bearer ${token}` } : {};

export const api = {
    login: (email, password) =>
        axios.post(`${BASE}/auth/login`, { email, password }),

    signup: (email, password) =>
        axios.post(`${BASE}/auth/signup`, { email, password }),

    verify: (news) =>
        axios.post(`${BASE}/verify`, { news }, { headers: headers() }),

    getHistory: () =>
        axios.get(`${BASE}/history?limit=15`, { headers: headers() }),

    getStats: () =>
        axios.get(`${BASE}/history/stats/overview`, { headers: headers() }),
};
