export type ShipmentStatus = 'Delivered' | 'In transit' | 'Delayed' | 'Exception';

export interface TrackingEvent {
  title: string;
  location: string;
  time: string;
  complete: boolean;
}

export interface ShipmentRecord {
  id: string;
  reference: string;
  status: ShipmentStatus;
  origin: string;
  destination: string;
  service: string;
  eta: string;
  recipient: string;
  events: TrackingEvent[];
}

export interface QuoteRequest {
  mode: 'domestic' | 'international';
  from: string;
  to: string;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
}

export interface QuoteResult {
  service: string;
  eta: string;
  price: number;
  badge?: string;
  description: string;
}

export interface ServiceLocation {
  city: string;
  pin: string;
  address: string;
  hours: string;
  phone: string;
  services: string[];
  coordinates: [number, number];
}

export interface ShippingService {
  slug: string;
  name: string;
  eyebrow: string;
  summary: string;
  description: string;
  features: string[];
  idealFor: string;
  accent: string;
}
