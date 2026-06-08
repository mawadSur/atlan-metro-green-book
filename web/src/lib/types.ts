// Shared types for the Green Book web app.

export type LocationType =
  | 'masjid'
  | 'restaurant'
  | 'coffee'
  | 'grocery'
  | 'garments'
  | 'park'
  | 'museum'
  | 'attraction'
  | 'mall'
  | 'worldcup_venue';

export interface Location {
  id: string;
  city_id: string;
  type: LocationType;
  name_en: string;
  name_ar: string;
  name_es: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  hours_en: string;
  hours_ar: string;
  hours_es: string;
  halal_certified: boolean;
  halal_status: 'verified' | 'community-listed' | 'unverified';
  verified_by: string;
  verified_at: string | null;
  alcohol_free: boolean;
  prayer_space: boolean;
  family_friendly: boolean;
  worldcup_special: boolean;
  discount_code: string | null;
  discount_offer_en: string;
  discount_offer_ar: string;
  discount_offer_es: string;
  image_url: string;
  source: string;
  osm_id: string | null;
}

export interface City {
  id: string;
  name_en: string;
  name_ar: string;
  name_es: string;
  country: string;
  center_lat: number;
  center_lng: number;
  default_zoom: number;
}

export type Lang = 'en' | 'ar' | 'es';

export interface Filters {
  halal_certified: boolean;
  alcohol_free: boolean;
  prayer_space: boolean;
  family_friendly: boolean;
}

// Admin / business portal — roles, claims, and audit logging.

export type Role = 'user' | 'business' | 'admin';

export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  email: string | null;
  role: Role;
  created_at: string;
}

export interface ClaimRequest {
  id: string;
  requester_uid: string;
  location_id: string;
  status: ClaimStatus;
  note: string | null;
  created_at: string;
  decided_by: string | null;
  decided_at: string | null;
}

export interface AuditLogEntry {
  id: string;
  actor_uid: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}
