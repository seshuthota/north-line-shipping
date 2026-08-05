import type { ServiceLocation, ShipmentRecord, ShippingService } from './types';

export const shipments: ShipmentRecord[] = [
  {
    id: 'NL123456789', reference: 'NL-DEL-2408', status: 'In transit', origin: 'Mumbai, MH', destination: 'New Delhi, DL', service: 'Domestic Priority', eta: 'Tomorrow, by 12:00 PM', recipient: 'A. Sharma',
    events: [
      { title: 'Shipment picked up', location: 'Andheri East, Mumbai', time: '05 Aug · 09:42 PM', complete: true },
      { title: 'Arrived at origin hub', location: 'Mumbai Hub', time: '05 Aug · 11:18 PM', complete: true },
      { title: 'Departed on flight NLA 302', location: 'Mumbai Hub', time: '06 Aug · 02:10 AM', complete: true },
      { title: 'Destination facility', location: 'New Delhi Gateway', time: 'Expected 06 Aug · 05:45 AM', complete: false },
      { title: 'Out for delivery', location: 'New Delhi', time: 'Expected by 09:00 AM', complete: false },
    ],
  },
  {
    id: 'NL987654321', reference: 'ECOM-8842', status: 'Delivered', origin: 'Bengaluru, KA', destination: 'Chennai, TN', service: 'eCom Lite Surface', eta: 'Delivered 04 Aug, 02:36 PM', recipient: 'R. Iyer',
    events: [
      { title: 'Shipment picked up', location: 'Whitefield, Bengaluru', time: '02 Aug · 06:20 PM', complete: true },
      { title: 'In transit', location: 'Bengaluru Surface Hub', time: '03 Aug · 01:15 AM', complete: true },
      { title: 'Out for delivery', location: 'Guindy, Chennai', time: '04 Aug · 09:05 AM', complete: true },
      { title: 'Delivered', location: 'Chennai, TN', time: '04 Aug · 02:36 PM', complete: true },
    ],
  },
  {
    id: 'NL246813579', reference: 'CRITICAL-91', status: 'Delayed', origin: 'Kolkata, WB', destination: 'Pune, MH', service: 'Critical Express', eta: 'Updated estimate: 07 Aug', recipient: 'M. Desai',
    events: [
      { title: 'Shipment picked up', location: 'Salt Lake, Kolkata', time: '04 Aug · 04:30 PM', complete: true },
      { title: 'Weather disruption', location: 'Kolkata Gateway', time: '05 Aug · 01:20 AM', complete: true },
      { title: 'Movement rescheduled', location: 'Kolkata Gateway', time: 'Updated 05 Aug · 07:40 AM', complete: false },
    ],
  },
  {
    id: 'NL111111111', reference: 'DOC-4177', status: 'Exception', origin: 'Ahmedabad, GJ', destination: 'Kochi, KL', service: 'Domestic Priority', eta: 'Action required', recipient: 'K. Nair',
    events: [
      { title: 'Shipment picked up', location: 'Ahmedabad, GJ', time: '03 Aug · 05:12 PM', complete: true },
      { title: 'Address clarification required', location: 'Kochi Facility', time: '05 Aug · 10:32 AM', complete: true },
      { title: 'Delivery on hold', location: 'Kochi Facility', time: 'Contact customer service', complete: false },
    ],
  },
];

export const services: ShippingService[] = [
  { slug: 'domestic-priority', name: 'Domestic Priority', eyebrow: 'Air express', summary: 'Time-critical, door-to-door delivery across India.', description: 'Fast, secure air express for documents and packages, with real-time tracking and proof of delivery.', features: ['Next-business-day options', 'Free pickup', 'Regulatory clearance support', 'Digital proof of delivery'], idealFor: 'Urgent documents, samples and high-priority business shipments.', accent: '#ef3f4d' },
  { slug: 'air-express-package', name: 'Air Express Package', eyebrow: 'Commercial freight', summary: 'A reliable air solution for heavier shipments.', description: 'A cost-effective airport-connected express service for packages that need the speed of air transport.', features: ['Door-to-door movement', 'Single-piece shipments from 10 kg', 'Real-time visibility', 'Nationwide air network'], idealFor: 'Commercial packages, inventory replenishment and time-sensitive freight.', accent: '#ff8a3d' },
  { slug: 'surface', name: 'Northline Surface', eyebrow: 'Ground network', summary: 'Dependable, economical movement across India.', description: 'Technology-enabled ground distribution supported by Northline’s nationwide surface network.', features: ['Day-definite delivery', 'Wide PIN-code reach', 'Track and trace', 'Proof of delivery'], idealFor: 'Non-urgent parcels, regular replenishment and cost-conscious shipping.', accent: '#13a38f' },
  { slug: 'ecom-lite', name: 'eCom Lite Surface', eyebrow: 'E-commerce', summary: 'Flexible distribution designed for online commerce.', description: 'A scalable B2C surface product built around visibility, delivery choice and returns.', features: ['Cash-on-delivery support', 'Reverse logistics', 'Delivery notifications', 'Flexible shipment sizes'], idealFor: 'Marketplaces, D2C brands and high-volume online sellers.', accent: '#7258d6' },
  { slug: 'smart-box', name: 'Smart Box', eyebrow: 'Simple pricing', summary: 'One box, one price, anywhere in India.', description: 'Standardized, secure packaging with simplified pricing for domestic shipments.', features: ['10 kg and 25 kg sizes', 'Door-to-door delivery', 'Packaging included', 'Easy budgeting'], idealFor: 'Small businesses that want predictable shipping costs.', accent: '#1369e8' },
  { slug: 'express-pallet', name: 'Express Pallet', eyebrow: 'Heavy freight', summary: 'A secure solution for palletized shipments.', description: 'Specialized handling for larger consolidated loads across Northline’s network.', features: ['50 kg to 100 kg formats', 'Weather-resistant design', 'Faster handling', 'Shipment visibility'], idealFor: 'Manufacturing, automotive and organized heavy shipments.', accent: '#1d887a' },
  { slug: 'airport-to-airport', name: 'Airport-to-Airport', eyebrow: 'Aviation', summary: 'Dedicated domestic air cargo capacity.', description: 'Scheduled airport cargo movement backed by Northline Aviation’s dedicated freighter network.', features: ['Freighter network', 'Bonded warehouses', 'Priority uplift', 'Ground handling expertise'], idealFor: 'High-volume and time-critical airport cargo.', accent: '#d83948' },
  { slug: 'international', name: 'International Services', eyebrow: 'Global partners', summary: 'Door-to-door reach across 220+ countries and territories.', description: 'International document and parcel services through the Northline and OrbitLink global network.', features: ['Express Worldwide', 'Customs expertise', 'Time-definite delivery', 'International tracking'], idealFor: 'Exports, urgent documents, samples and global commerce.', accent: '#d9a400' },
];

export const locations: ServiceLocation[] = [
  { city: 'Mumbai', pin: '400099', address: 'Northline Centre, Sahar Airport Road, Andheri East', hours: 'Mon–Sat · 8:00 AM–9:00 PM', phone: '1800 555 0142', services: ['Pickup', 'Delivery', 'International', 'Smart Box'], coordinates: [22, 28] },
  { city: 'New Delhi', pin: '110037', address: 'Cargo Terminal 2, IGI Airport, New Delhi', hours: 'Open 24 hours', phone: '1800 555 0142', services: ['Pickup', 'Delivery', 'Airport cargo'], coordinates: [55, 17] },
  { city: 'Bengaluru', pin: '560017', address: 'HAL Airport Road, Kodihalli, Bengaluru', hours: 'Mon–Sat · 8:00 AM–8:00 PM', phone: '1800 555 0142', services: ['Pickup', 'Delivery', 'International'], coordinates: [45, 62] },
  { city: 'Chennai', pin: '600016', address: 'GST Road, St. Thomas Mount, Chennai', hours: 'Mon–Sat · 8:30 AM–8:30 PM', phone: '1800 555 0142', services: ['Pickup', 'Delivery', 'Smart Box'], coordinates: [56, 69] },
  { city: 'Kolkata', pin: '700052', address: 'Jessore Road, Airport Gate 1, Kolkata', hours: 'Mon–Sat · 8:00 AM–9:00 PM', phone: '1800 555 0142', services: ['Pickup', 'Delivery', 'International'], coordinates: [72, 41] },
  { city: 'Hyderabad', pin: '500016', address: 'Begumpet Main Road, Hyderabad', hours: 'Mon–Sat · 8:00 AM–8:00 PM', phone: '1800 555 0142', services: ['Pickup', 'Delivery'], coordinates: [44, 52] },
];

export const news = [
  { date: '18 November 2025', tag: 'Network', title: 'A flagship green integrated ground hub opens in Pataudi', summary: 'A major step in strengthening nationwide express connectivity with smarter, more sustainable operations.' },
  { date: '29 October 2025', tag: 'Digital', title: 'Northline launches instant digital account opening', summary: 'A streamlined onboarding experience designed to help Indian businesses begin shipping faster.' },
  { date: '23 September 2025', tag: 'Company', title: 'General price increase effective January 1, 2026', summary: 'The annual price adjustment supports network resilience, service quality and continued innovation.' },
];

export const quickSearch = [
  ...services.map((service) => ({ title: service.name, description: service.summary, href: `/services/${service.slug}`, type: 'Service' })),
  { title: 'Track a shipment', description: 'Get live-style status and delivery progress.', href: '/track#track-form', type: 'Tool' },
  { title: 'Price & transit time', description: 'Compare eligible services and estimated prices.', href: '/ship#quote', type: 'Tool' },
  { title: 'Location finder', description: 'Find service centres and supported locations.', href: '/locations#location-finder', type: 'Tool' },
  { title: 'Banned commodities', description: 'Check items that cannot travel through the network.', href: '/support/regulatory', type: 'Support' },
  { title: 'Customer service', description: 'Contact Northline or submit feedback.', href: '/support#contact', type: 'Support' },
  { title: 'Northline Aviation', description: 'Explore the dedicated air network.', href: '/about', type: 'Company' },
];
