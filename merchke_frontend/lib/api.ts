import axios from "axios";
import { API_BASE } from "./config";
import type {
  Ad, Escrow, Job, JobApplication, ListingFee, MerchEvent, MpesaTransaction, Order, Podcast,
  PodcastEpisode, Product, Service, ServiceBooking, Ticket, VendorDashboard, VendorProfile,
} from "./types";

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

const TOKEN_KEY = "merchke_token";
const AUTH_PATHS = ["/accounts/login/", "/accounts/register/"];

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// A 401 on an authenticated request means the token is stale: log out and go to /login.
// Login/register 401s are just wrong credentials and must reach the form.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url: string = err.config?.url ?? "";
    const sentToken = Boolean(err.config?.headers?.Authorization);
    if (
      err.response?.status === 401 && typeof window !== "undefined" &&
      sentToken && !AUTH_PATHS.some((p) => url.includes(p))
    ) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("merchke-auth");
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?next=${next}`;
    }
    return Promise.reject(err);
  }
);

export default api;

const multipart = { headers: { "Content-Type": "multipart/form-data" } };

// ── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: {
    username: string; email: string; password: string; password2: string;
    is_vendor: boolean; is_customer: boolean; vendor_type?: string;
  }) => api.post("/accounts/register/", data),
  login: (data: { email: string; password: string }) => api.post("/accounts/login/", data),
};

// ── Vendors ─────────────────────────────────────────────────────────────────
export const vendorApi = {
  list: (params?: Record<string, string>) => api.get("/vendors/", { params }),
  detail: (slug: string) => api.get(`/vendors/${slug}/`),
  getProfile: () => api.get<VendorProfile>("/vendors/me/"),
  updateProfile: (data: FormData) => api.patch<VendorProfile>("/vendors/me/", data, multipart),
  getDashboard: () => api.get<VendorDashboard>("/vendors/dashboard/"),
};

// ── Products ─────────────────────────────────────────────────────────────────
export type ProductCreateResponse = Product & { listing_fee: ListingFee };

export const productApi = {
  list: (params?: Record<string, string>) => api.get<Product[]>("/products/", { params }),
  detail: (id: number) => api.get<Product>(`/products/${id}/`),
  byVendor: (slug: string) => api.get<Product[]>(`/products/vendor/${slug}/`),
  mine: () => api.get<Product[]>("/products/mine/"),
  categories: (productType?: string) =>
    api.get("/products/categories/", productType ? { params: { product_type: productType } } : undefined),
  create: (data: FormData) => api.post<ProductCreateResponse>("/products/", data, multipart),
  getOwn: (id: number) => api.get<Product>(`/products/${id}/manage/`),
  update: (id: number, data: FormData) => api.patch<Product>(`/products/${id}/manage/`, data, multipart),
  download: (id: number) => api.get(`/products/${id}/download/`, { responseType: "blob" }),
  listingFeeStatus: (id: number) => api.get<ListingFee>(`/products/${id}/listing-fee-status/`),
  retryListingFee: (id: number, mpesa_phone?: string) =>
    api.post<ListingFee>(`/products/${id}/listing-fee/retry/`, mpesa_phone ? { mpesa_phone } : {}),
};

// ── Orders & checkout ────────────────────────────────────────────────────────
export type CheckoutPayload = {
  items: { product_id: number; variant_id?: number | null; quantity: number }[];
  phone: string;
  delivery_mode: "delivery" | "pickup";
  delivery_address?: string;
  delivery_town?: string;
  delivery_county?: string;
  delivery_phone?: string;
  notes?: string;
};

export const orderApi = {
  checkout: (data: CheckoutPayload) =>
    api.post<{ orders: Order[]; total: string; transaction: MpesaTransaction }>("/orders/checkout/", data),
  list: () => api.get<Order[]>("/orders/"),
  detail: (id: number) => api.get<Order>(`/orders/${id}/`),
  vendorOrders: () => api.get<Order[]>("/orders/vendor/"),
  ship: (id: number) => api.post<Order>(`/orders/${id}/ship/`),
  myDisputes: () => api.get("/orders/disputes/"),
};

// ── Payments & escrow ────────────────────────────────────────────────────────
export const paymentApi = {
  transaction: (id: number) => api.get<MpesaTransaction>(`/payments/transactions/${id}/`),
  /** Resend the same STK push (same amount, same orders/tickets/ad). */
  retry: (id: number, phone?: string) =>
    api.post<MpesaTransaction>(`/payments/transactions/${id}/retry/`, phone ? { phone } : {}),
  payOrder: (orderId: number, phone: string) =>
    api.post<MpesaTransaction>(`/payments/orders/${orderId}/pay/`, { phone }),
};

export const escrowApi = {
  get: (orderId: number) => api.get<Escrow>(`/escrow/${orderId}/`),
  release: (orderId: number) => api.post<Escrow>(`/escrow/${orderId}/release/`),
  dispute: (orderId: number, data: { reason: string; description: string }) =>
    api.post<{ dispute: unknown; escrow: Escrow }>(`/escrow/${orderId}/dispute/`, data),
};

// ── Reports ──────────────────────────────────────────────────────────────────
export const reportApi = {
  reportProduct: (id: number, data: { reason: string; description?: string }) =>
    api.post(`/products/${id}/report/`, data),
};

// ── Events & tickets ─────────────────────────────────────────────────────────
export const eventApi = {
  list: (params?: Record<string, string>) => api.get<MerchEvent[]>("/events/", { params }),
  detail: (slugOrId: string | number) => api.get<MerchEvent>(`/events/${slugOrId}/`),
  mine: () => api.get<MerchEvent[]>("/events/mine/"),
  create: (data: FormData) => api.post<MerchEvent>("/events/", data, multipart),
  update: (id: number, data: FormData) => api.patch<MerchEvent>(`/events/${id}/manage/`, data, multipart),
  purchaseTickets: (eventId: number, data: { ticket_type_id: number; quantity: number; phone: string }) =>
    api.post<{ order_id: number; order_number: string; total: string; transaction: MpesaTransaction }>(
      `/events/${eventId}/purchase-tickets/`, data),
  boost: (eventId: number, data: FormData) =>
    api.post<{ boost: unknown; transaction: MpesaTransaction }>(`/events/${eventId}/boost/`, data, multipart),
  featuredAds: () => api.get("/events/featured-ads/"),
};

export const ticketTypeApi = {
  create: (eventId: number, data: {
    name: string; description?: string;
    price: number | string; total_quantity: number | string;
    sale_start?: string; sale_end?: string;
  }) => api.post(`/events/${eventId}/tickets/`, data),
  delete: (eventId: number, ticketId: number) => api.delete(`/events/${eventId}/tickets/${ticketId}/`),
};

export const ticketApi = {
  mine: (eventSlug?: string) => api.get<Ticket[]>("/tickets/mine/", { params: eventSlug ? { event: eventSlug } : undefined }),
  verify: (token: string) => api.get<{ valid: boolean; detail: string; ticket: Ticket }>(`/tickets/${token}/verify/`),
  checkIn: (token: string) => api.post<{ valid: boolean; detail: string; ticket: Ticket }>(`/tickets/${token}/verify/`),
};

// ── Wishlist / variants / reviews ────────────────────────────────────────────
export const wishlistApi = {
  list: () => api.get("/products/wishlist/"),
  add: (productId: number) => api.post("/products/wishlist/", { product: productId }),
  remove: (productId: number) => api.delete(`/products/wishlist/${productId}/`),
};

export const variantApi = {
  create: (productId: number, data: {
    size?: string; color?: string; custom_label?: string;
    price_modifier?: number; stock?: number; sku?: string;
  }) => api.post(`/products/${productId}/variants/`, data),
  delete: (productId: number, variantId: number) => api.delete(`/products/${productId}/variants/${variantId}/`),
};

export const reviewApi = {
  listProduct: (productId: number) => api.get(`/reviews/products/${productId}/`),
  createProduct: (productId: number, data: { rating: number; title?: string; body: string }) =>
    api.post(`/reviews/products/${productId}/`, data),
};

// ── Jobs ─────────────────────────────────────────────────────────────────────
export const jobApi = {
  list: (params?: Record<string, string>) => api.get<Job[]>("/jobs/", { params }),
  detail: (id: number) => api.get<Job>(`/jobs/${id}/`),
  mine: () => api.get<Job[]>("/jobs/mine/"),
  create: (data: Record<string, unknown>) => api.post<Job>("/jobs/", data),
  update: (id: number, data: Record<string, unknown>) => api.patch<Job>(`/jobs/${id}/manage/`, data),
  apply: (id: number, data: FormData) => api.post<{ detail: string }>(`/jobs/${id}/apply/`, data, multipart),
  applications: (id: number) => api.get<JobApplication[]>(`/jobs/${id}/applications/`),
  feeStatus: (id: number) => api.get<Job>(`/jobs/${id}/fee-status/`),
  retryFee: (id: number, mpesa_phone?: string) =>
    api.post<Job>(`/jobs/${id}/fee/retry/`, mpesa_phone ? { mpesa_phone } : {}),
};

// ── Services (Hire) ──────────────────────────────────────────────────────────
export const serviceApi = {
  list: (params?: Record<string, string>) => api.get<Service[]>("/services/", { params }),
  detail: (id: number) => api.get<Service>(`/services/${id}/`),
  mine: () => api.get<Service[]>("/services/mine/"),
  create: (data: FormData) => api.post<Service>("/services/", data, multipart),
  update: (id: number, data: FormData) => api.patch<Service>(`/services/${id}/manage/`, data, multipart),
  book: (id: number, data: {
    client_name: string; client_phone: string; client_email: string; date_requested: string; message?: string;
  }) => api.post<{ detail: string; booking: ServiceBooking }>(`/services/${id}/book/`, data),
  bookings: () => api.get<ServiceBooking[]>("/services/bookings/"),
  updateBooking: (id: number, status: "confirmed" | "declined") =>
    api.patch<ServiceBooking>(`/services/bookings/${id}/`, { status }),
};

// ── Podcasts ─────────────────────────────────────────────────────────────────
export const podcastApi = {
  list: (params?: Record<string, string>) => api.get<Podcast[]>("/podcasts/", { params }),
  detail: (slug: string) => api.get<Podcast>(`/podcasts/${slug}/`),
  mine: () => api.get<Podcast[]>("/podcasts/mine/"),
  create: (data: FormData) => api.post<Podcast>("/podcasts/", data, multipart),
  addEpisode: (podcastId: number, data: FormData) =>
    api.post<PodcastEpisode>(`/podcasts/${podcastId}/episodes/`, data, multipart),
};

// ── Ads ──────────────────────────────────────────────────────────────────────
export const adApi = {
  serve: (params: { page: string; ad_type?: string; limit?: string }) => api.get<Ad[]>("/ads/serve/", { params }),
  mine: () => api.get<Ad[]>("/ads/mine/"),
  create: (data: FormData) => api.post<{ ad: Ad; transaction: MpesaTransaction }>("/ads/create/", data, multipart),
};

// ── AI support (Merchi) ──────────────────────────────────────────────────────
export const chatApi = {
  send: (message: string, session_id: string) =>
    api.post<{ reply: string; created_at: string; remaining_today: number }>("/chat/", { message, session_id }),
};
