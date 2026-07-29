import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001/api";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("merchke_token");
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("merchke_token");
      localStorage.removeItem("merchke_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: {
    username: string;
    email: string;
    password: string;
    password2: string;
    is_vendor: boolean;
    is_customer: boolean;
    vendor_type?: string;
  }) => api.post("/accounts/register/", data),

  login: (data: { email: string; password: string }) =>
    api.post("/accounts/login/", data),
};

// ── Vendors ─────────────────────────────────────────────────────────────────
export const vendorApi = {
  list: (params?: Record<string, string>) => api.get("/vendors/", { params }),
  detail: (slug: string) => api.get(`/vendors/${slug}/`),
  getProfile: () => api.get("/vendors/me/"),
  updateProfile: (data: FormData) =>
    api.patch("/vendors/me/", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getDashboard: () => api.get("/vendors/dashboard/"),
};

// ── Products ─────────────────────────────────────────────────────────────────
export const productApi = {
  list: (params?: Record<string, string>) =>
    api.get("/products/", { params }),
  detail: (id: number) => api.get(`/products/${id}/`),
  byVendor: (slug: string) => api.get(`/products/vendor/${slug}/`),
  categories: (productType?: string) =>
    api.get("/products/categories/", productType ? { params: { product_type: productType } } : undefined),
  create: (data: FormData) =>
    api.post("/products/", data, { headers: { "Content-Type": "multipart/form-data" } }),
  getOwn: (id: number) => api.get(`/products/${id}/manage/`),
  update: (id: number, data: FormData) =>
    api.patch(`/products/${id}/manage/`, data, { headers: { "Content-Type": "multipart/form-data" } }),
  download: (id: number) => api.get(`/products/${id}/download/`, { responseType: "blob" }),
};

// ── Orders ───────────────────────────────────────────────────────────────────
export const orderApi = {
  create: (data: object) => api.post("/orders/", data),
  list: () => api.get("/orders/"),
  detail: (id: number) => api.get(`/orders/${id}/`),
  confirmReceipt: (id: number) => api.post(`/orders/${id}/confirm/`),
  openDispute: (id: number, data: { reason: string; description: string }) =>
    api.post(`/orders/${id}/dispute/`, data),
  myDisputes: () => api.get("/orders/disputes/"),
};

// ── Reports ──────────────────────────────────────────────────────────────────
export const reportApi = {
  reportProduct: (id: number, data: { reason: string; description?: string }) =>
    api.post(`/products/${id}/report/`, data),
};

// ── Payments ─────────────────────────────────────────────────────────────────
export const paymentApi = {
  stkPush: (data: { order_id: number; phone: string }) =>
    api.post("/payments/mpesa/stk-push/", data),
  queryStatus: (checkout_request_id: string) =>
    api.post("/payments/mpesa/query/", { checkout_request_id }),
};

// ── Events ───────────────────────────────────────────────────────────────────
export const eventApi = {
  list: (params?: Record<string, string>) => api.get("/events/", { params }),
  detail: (id: number) => api.get(`/events/${id}/`),
  mine: () => api.get("/events/mine/"),
  create: (data: FormData) =>
    api.post("/events/", data, { headers: { "Content-Type": "multipart/form-data" } }),
  update: (id: number, data: FormData) =>
    api.patch(`/events/${id}/manage/`, data, { headers: { "Content-Type": "multipart/form-data" } }),
  purchase: (eventId: number, data: { ticket_type_id: number; quantity: number }) =>
    api.post(`/events/${eventId}/purchase/`, data),
};

// ── Ticket Types ──────────────────────────────────────────────────────────────
export const ticketTypeApi = {
  create: (eventId: number, data: {
    name: string; description?: string;
    price: number | string; total_quantity: number | string;
    sale_start?: string; sale_end?: string;
  }) => api.post(`/events/${eventId}/tickets/`, data),
  delete: (eventId: number, ticketId: number) =>
    api.delete(`/events/${eventId}/tickets/${ticketId}/`),
};

// ── Wishlist ──────────────────────────────────────────────────────────────────
export const wishlistApi = {
  list: () => api.get("/products/wishlist/"),
  add: (productId: number) => api.post("/products/wishlist/", { product: productId }),
  remove: (productId: number) => api.delete(`/products/wishlist/${productId}/`),
};

// ── Variants ─────────────────────────────────────────────────────────────────
export const variantApi = {
  create: (productId: number, data: {
    size?: string; color?: string; custom_label?: string;
    price_modifier?: number; stock?: number; sku?: string;
  }) => api.post(`/products/${productId}/variants/`, data),
  delete: (productId: number, variantId: number) =>
    api.delete(`/products/${productId}/variants/${variantId}/`),
};

// ── Reviews ──────────────────────────────────────────────────────────────────
export const reviewApi = {
  listProduct: (productId: number) =>
    api.get(`/reviews/products/${productId}/`),
  createProduct: (productId: number, data: { rating: number; title?: string; body: string }) =>
    api.post(`/reviews/products/${productId}/`, data),
};
