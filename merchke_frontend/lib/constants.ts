// Category lists shared by browse pages and dashboard forms. Values match the Django choices.

export const VENDOR_TYPES = [
  { value: "artist", label: "Artists", icon: "🎨" },
  { value: "dj", label: "DJs", icon: "🎧" },
  { value: "creative", label: "Creatives", icon: "🎭" },
  { value: "jersey", label: "Jerseys", icon: "👕" },
  { value: "brand", label: "Local Brands", icon: "🏷️" },
  { value: "events", label: "Events", icon: "🎟️" },
  { value: "digital", label: "Digital", icon: "📲" },
  { value: "makeup", label: "Makeup", icon: "💄" },
  { value: "tattoo", label: "Tattoo", icon: "🖋️" },
  { value: "biker", label: "Bikers", icon: "🏍️" },
] as const;

export const JOB_CATEGORIES = [
  { value: "", label: "All jobs", icon: "💼" },
  { value: "creative", label: "Creative", icon: "🎨" },
  { value: "media", label: "Media", icon: "📺" },
  { value: "club_dj", label: "Club / DJ", icon: "🎧" },
  { value: "photography", label: "Photography", icon: "📸" },
  { value: "videography", label: "Videography", icon: "🎬" },
  { value: "other", label: "Other", icon: "✨" },
];

export const SERVICE_CATEGORIES = [
  { value: "makeup", label: "Makeup Artists", short: "Makeup", icon: "💄", blurb: "Glam for shoots, weddings and stage." },
  { value: "tattoo", label: "Tattoo Artists", short: "Tattoo", icon: "🖋️", blurb: "Flash art, custom pieces, booking deposits." },
  { value: "props", label: "Video Props for Rent", short: "Props", icon: "🚗", blurb: "Cars, locations, houses, parks, wardrobe." },
  { value: "models", label: "Models & Video Vixens", short: "Models", icon: "✨", blurb: "Verified talent for music videos and ads." },
  { value: "bikers", label: "Bikers & Moto Shows", short: "Bikers", icon: "🏍️", blurb: "Stunt riders, convoys and moto shows." },
  { value: "photography", label: "Photographers", short: "Photo", icon: "📸", blurb: "Events, portraits, product shoots." },
  { value: "videography", label: "Videographers", short: "Video", icon: "🎬", blurb: "Music videos, ads, event coverage." },
  { value: "other", label: "Other Services", short: "Other", icon: "🎭", blurb: "Stylists, dancers, MCs and more." },
] as const;

export type ServiceCategoryValue = (typeof SERVICE_CATEGORIES)[number]["value"];

export const PROP_TYPES = [
  { value: "car", label: "Cars" },
  { value: "location", label: "Locations" },
  { value: "house", label: "Houses" },
  { value: "park", label: "Parks / Outdoor" },
  { value: "wardrobe", label: "Wardrobe" },
  { value: "other", label: "Other" },
];

export const PODCAST_CATEGORIES = [
  { value: "", label: "All", icon: "🎙️" },
  { value: "music", label: "Music & Culture", icon: "🎶" },
  { value: "comedy", label: "Comedy", icon: "😂" },
  { value: "sports", label: "Sports", icon: "⚽" },
  { value: "business", label: "Business & Hustle", icon: "💼" },
  { value: "lifestyle", label: "Lifestyle", icon: "🌴" },
  { value: "news", label: "News & Politics", icon: "📰" },
  { value: "other", label: "Other", icon: "✨" },
];

export const KENYAN_CITIES = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Naivasha", "Nanyuki", "Diani", "Malindi", "Machakos", "Nyeri"];
