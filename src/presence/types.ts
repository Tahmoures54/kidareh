export type NeighborhoodId =
  | "vanak"
  | "jordan"
  | "elahiyeh"
  | "tajrish"
  | "pasdaran"
  | "saadat"
  | "valiasr"
  | "enghelab"
  | "niavaran"
  | "shahrak"
  | "mirdamad"
  | "mellat";

export type ListingCategory =
  | "digital"
  | "audio"
  | "gaming"
  | "home"
  | "fashion"
  | "sport"
  | "beauty"
  | "books"
  | "kids"
  | "tools";

export type Condition = "new" | "open-box" | "like-new";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Neighborhood {
  id: NeighborhoodId;
  name: string;
  district: string;
  center: GeoPoint;
}

export interface PresenceStore {
  id: string;
  name: string;
  neighborhood: NeighborhoodId;
  address: string;
  phone: string;
  category: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  verified: boolean;
  licensed: boolean;
  openHour: number;
  closeHour: number;
  lastSeenMinutesAgo: number;
  sellerOnline: boolean;
  responseMins: number;
  trustScore: number;
  cover: string;
}

export interface PresenceListing {
  id: string;
  sku: string;
  skuLabel: string;
  name: string;
  brand: string;
  category: ListingCategory;
  price: number;
  oldPrice?: number;
  stock: number;
  condition: Condition;
  storeId: string;
  image: string;
  images: string[];
  description: string;
  updatedMinutesAgo: number;
  views: number;
  inspectable: boolean;
  holdable: boolean;
  warranty: string;
  specs: string[];
}

export interface EnrichedListing extends PresenceListing {
  store: PresenceStore;
  neighborhood: Neighborhood;
  distanceKm: number;
  walkMinutes: number;
  openNow: boolean;
  closesInMinutes: number | null;
  savings: number;
  savingsPct: number;
  freshnessLabel: string;
  stockLabel: string;
}

export interface RadarGroup {
  sku: string;
  label: string;
  category: ListingCategory;
  listings: EnrichedListing[];
  cheapest: EnrichedListing;
  nearest: EnrichedListing;
  spreadToman: number;
  storeCount: number;
}

export interface TripStop {
  listing: EnrichedListing;
  walkFromPrev: number;
  cumulativeWalk: number;
}

export interface TripPlan {
  stops: TripStop[];
  totalWalkMinutes: number;
  totalKm: number;
  totalToman: number;
  stores: number;
}

export interface HoldRecord {
  id: string;
  listingId: string;
  sku: string;
  productName: string;
  storeName: string;
  neighborhood: string;
  price: number;
  pickupCode: string;
  holdMinutes: number;
  createdAt: string;
  expiresAt: string;
  status: "requested" | "seller_confirmed" | "ready_for_pickup" | "completed" | "cancelled" | "expired";
  image: string;
  storeLat: number;
  storeLng: number;
  guest: boolean;
}

export interface PresenceOrigin {
  lat: number;
  lng: number;
  label: string;
  neighborhoodId?: NeighborhoodId;
}

export interface PresenceQuery {
  q?: string;
  category?: ListingCategory | "all";
  radiusKm?: number;
  openNow?: boolean;
  verifiedOnly?: boolean;
  inStock?: boolean;
  holdable?: boolean;
  maxWalkMinutes?: number;
  sort?: "nearest" | "cheapest" | "newest" | "trust";
}
