import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically inject JWT token into requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("vendorvision_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response interceptor for authorization failure handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear credentials and force reload to login route
      localStorage.removeItem("vendorvision_token");
      localStorage.removeItem("vendorvision_user");
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ==========================================
// API RESOURCE METHODS
// ==========================================
export const authApi = {
  login: (data: any) => api.post("/api/auth/login", data),
  register: (data: any) => api.post("/api/auth/register", data),
  firebaseLogin: (data: any) => api.post("/api/auth/firebase-login", data),
  getMe: () => api.get("/api/auth/me"),
};

export const vendorApi = {
  getVendors: (params?: { query?: string; category?: string }) => 
    api.get("/api/vendors", { params }),
  getVendor: (id: number) => api.get(`/api/vendors/${id}`),
  createVendor: (data: any) => api.post("/api/vendors", data),
};

export const rfqApi = {
  getRFQs: () => api.get("/api/rfqs"),
  getRFQ: (id: number) => api.get(`/api/rfqs/${id}`),
  createRFQ: (data: any) => api.post("/api/rfqs", data),
  publishRFQ: (id: number) => api.post(`/api/rfqs/${id}/publish`),
  updateStatus: (id: number, status: string) => api.put(`/api/rfqs/${id}/status`, { status }),
};

export const quoteApi = {
  getQuotes: () => api.get("/api/quotes"),
  getQuotesForRFQ: (rfqId: number) => api.get(`/api/quotes/rfq/${rfqId}`),
  submitQuote: (data: any) => api.post("/api/quotes", data),
  acceptQuote: (id: number) => api.post(`/api/quotes/${id}/accept`),
};

export const poApi = {
  getPOs: () => api.get("/api/purchase-orders"),
  getPO: (id: number) => api.get(`/api/purchase-orders/${id}`),
  createPO: (quotationId: number) => api.post("/api/purchase-orders", { quotationId, amount: 1 }), // Amount overridden by quote
  approvePO: (id: number, action: "Approved" | "Rejected", comments?: string) => 
    api.post(`/api/purchase-orders/${id}/approve`, { action, comments }),
};

export const invoiceApi = {
  getInvoices: () => api.get("/api/invoices"),
  getInvoice: (id: number) => api.get(`/api/invoices/${id}`),
  submitInvoice: (data: any) => api.post("/api/invoices", data),
  updateStatus: (id: number, status: string) => api.post(`/api/invoices/${id}/status`, { status }),
};

export const analyticsApi = {
  getSpendAnalytics: () => api.get("/api/analytics"),
};

export const copilotApi = {
  query: (message: string) => api.post("/api/copilot/query", { message }),
};
