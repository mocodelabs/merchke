// Shapes returned by the Django API. Decimal fields arrive as strings.

export type Money = string | number;

export type VendorType =
  | "artist" | "dj" | "creative" | "jersey" | "brand" | "events"
  | "digital" | "makeup" | "tattoo" | "biker" | "other";

export type MpesaTransaction = {
  id: number;
  purpose: "order" | "tickets" | "listing_fee" | "job_fee" | "ad" | "event_boost";
  reference_id: number;
  phone: string;
  amount: Money;
  status: "pending" | "completed" | "failed";
  result_desc: string;
  receipt_number: string;
  is_simulated: boolean;
  created_at: string;
  completed_at: string | null;
};

export type ListingFee = {
  id: number;
  product: number;
  product_name: string;
  product_is_active: boolean;
  amount: Money;
  phone: string;
  status: "pending" | "paid" | "failed" | "expired";
  error: string;
  requested_at: string;
  expires_at: string;
  paid_at: string | null;
};

export type ProductVariant = {
  id: number; size: string; color: string; custom_label: string;
  price_modifier: Money; stock: number; sku: string;
};

export type Product = {
  id: number;
  name: string;
  slug: string | null;
  description: string;
  short_description: string;
  vendor_name: string;
  vendor_slug: string;
  vendor_type: VendorType;
  category: number | null;
  category_name: string | null;
  product_type: "physical" | "digital" | "ticket";
  price: Money;
  sale_price: Money | null;
  effective_price: Money;
  discount_percent: number;
  stock: number;
  image: string;
  images: { id: number; image: string; alt_text: string }[];
  variants: ProductVariant[];
  is_active: boolean;
  is_featured: boolean;
  average_rating: number;
  reviews_count: number;
  in_stock: boolean;
  sales_count: number;
  listing_fee_status: ListingFee["status"] | null;
  download_limit: number | null;
  has_digital_file: boolean;
  digital_file_name: string | null;
  views_count: number;
  created_at: string;
};

export type Escrow = {
  id: number;
  order: number;
  order_number: string;
  vendor: number | null;
  vendor_name: string | null;
  amount: Money;
  commission_percent: Money;
  commission_amount: Money;
  vendor_amount: Money;
  status: "held" | "released" | "refunded" | "disputed";
  auto_release_at: string | null;
  created_at: string;
  released_at: string | null;
  refunded_at: string | null;
};

export type OrderItem = {
  id: number;
  product: number | null;
  product_name: string;
  product_image: string | null;
  product_type: Product["product_type"] | null;
  variant: number | null;
  variant_label: string | null;
  vendor: number | null;
  vendor_name: string | null;
  quantity: number;
  unit_price: Money;
  subtotal: Money;
};

export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

export type Order = {
  id: number;
  order_number: string;
  buyer_name: string;
  delivery_mode: "delivery" | "pickup";
  delivery_address: string;
  delivery_town: string;
  delivery_county: string;
  delivery_phone: string;
  status: OrderStatus;
  notes: string;
  subtotal: Money;
  delivery_fee: Money;
  total_amount: Money;
  buyer_confirmed_at: string | null;
  payout_status: "holding" | "released";
  has_dispute: boolean;
  is_ticket_order: boolean;
  escrow: Escrow | null;
  items: OrderItem[];
  created_at: string;
};

export type TicketType = {
  id: number; name: string; description: string; price: Money;
  total_quantity: number; tickets_sold: number; tickets_remaining: number;
  is_sold_out: boolean; sale_start: string | null; sale_end: string | null;
};

export type EventCategory = "concert" | "tournament" | "comedy" | "podcast_live" | "exhibition" | "ride" | "other";

export type MerchEvent = {
  id: number;
  title: string;
  slug: string;
  description: string;
  short_description: string;
  banner_image: string;
  flyer: string | null;
  vendor_name: string;
  vendor_slug: string;
  venue_name: string;
  venue_address: string;
  town: string;
  county: string;
  google_maps_link: string;
  start_datetime: string;
  end_datetime: string | null;
  status: "draft" | "published" | "sold_out" | "cancelled" | "completed";
  category: EventCategory;
  category_display: string;
  is_featured: boolean;
  genre: string;
  ticket_types: TicketType[];
  min_price: Money | null;
  total_tickets_sold: number;
  is_sold_out: boolean;
  is_past: boolean;
  created_at: string;
};

export type Ticket = {
  id: number;
  ticket_number: string;
  qr_token: string;
  event_title: string;
  event_slug: string;
  event_start: string;
  venue_name: string;
  town: string;
  ticket_type_name: string;
  price: Money;
  order_number: string | null;
  buyer_name: string;
  is_used: boolean;
  used_at: string | null;
  issued_at: string;
};

export type EventAd = {
  id: number; event: number; event_title: string; event_slug: string;
  ad_image: string | null; ad_copy: string; budget_ksh: number; days: number;
  impressions: number; clicks: number; is_active: boolean;
  payment_status: "pending" | "paid" | "failed"; starts_at: string | null; ends_at: string | null;
};

export type JobCategory = "creative" | "media" | "club_dj" | "photography" | "videography" | "other";

export type Job = {
  id: number;
  title: string;
  company: string;
  description: string;
  category: JobCategory;
  category_display: string;
  location: string;
  is_remote: boolean;
  salary_range: string;
  deadline: string | null;
  how_to_apply: string;
  is_active: boolean;
  is_open: boolean;
  created_at: string;
  // owner-only
  fee_amount?: Money;
  fee_status?: "pending" | "paid" | "failed" | "expired";
  fee_error?: string;
  fee_phone?: string;
  applications_count?: number;
};

export type JobApplication = {
  id: number; job: number; job_title: string; applicant_name: string; email: string; phone: string;
  cv_file: string | null; cv_url: string; cover_letter: string; applied_at: string;
};

export type ServiceCategory =
  | "makeup" | "tattoo" | "props" | "models" | "bikers" | "photography" | "videography" | "other";

export type Service = {
  id: number;
  title: string;
  category: ServiceCategory;
  category_display: string;
  prop_type: string;
  prop_type_display: string;
  description: string;
  price_from: number;
  price_to: number | null;
  price_unit: string;
  city: string;
  booking_url: string;
  booking_deposit: number | null;
  is_active: boolean;
  images: { id: number; image: string }[];
  vendor_name: string;
  vendor_slug: string;
  vendor_verified: boolean;
  vendor_rating: number;
  created_at: string;
};

export type ServiceBooking = {
  id: number; service: number; service_title: string; client_name: string; client_phone: string;
  client_email: string; date_requested: string; message: string;
  status: "pending" | "confirmed" | "declined"; created_at: string;
};

export type PodcastEpisode = {
  id: number; podcast: number; title: string; description: string;
  audio_file: string | null; external_url: string; duration: string; published_at: string;
};

export type Podcast = {
  id: number; title: string; slug: string; description: string; cover_image: string;
  category: string; category_display: string;
  spotify_url: string; apple_url: string; youtube_url: string; is_active: boolean;
  vendor_name: string; vendor_slug: string;
  episodes_count: number; latest_episode_at: string | null; created_at: string;
  episodes?: PodcastEpisode[];
};

export type AdType = "banner" | "featured_listing" | "homepage_spotlight";

export type Ad = {
  id: number; ad_type: AdType; ad_type_display: string; target_page: string;
  title: string; tagline: string; image: string; link: string; budget_ksh: number;
  impressions: number; clicks: number; start_date: string; end_date: string;
  is_active: boolean; payment_status: "pending" | "paid" | "failed";
  vendor_name: string; click_url: string; created_at: string;
};

export type VendorDashboard = {
  products_count: number;
  pending_listing_fees: number;
  orders_count: number;
  orders_to_ship: number;
  earnings: { released: number; held: number; disputed: number; commission_paid: number };
  total_revenue: number;
  pending_orders: number;
  monthly_stats: Record<string, { orders: number; revenue: number }>;
};

export type VendorProfile = {
  id: number; vendor_type: VendorType; brand_name: string; slug: string;
  contact_email: string; phone_number: string; mpesa_phone: string;
  is_verified: boolean; is_featured: boolean;
};
