PRAGMA foreign_keys = ON;

CREATE TABLE metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE shipments (
  waybill TEXT PRIMARY KEY,
  customer_reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('Delivered', 'In transit', 'Delayed', 'Exception')),
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  service_name TEXT NOT NULL,
  eta_text TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tracking_events (
  id INTEGER PRIMARY KEY,
  waybill TEXT NOT NULL REFERENCES shipments(waybill) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  event_time_text TEXT NOT NULL,
  is_complete INTEGER NOT NULL CHECK (is_complete IN (0, 1)),
  UNIQUE (waybill, sequence)
);

CREATE INDEX tracking_events_waybill_sequence ON tracking_events(waybill, sequence);

CREATE TABLE shipping_services (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT NOT NULL,
  ideal_for TEXT NOT NULL,
  accent_colour TEXT NOT NULL
);

CREATE TABLE service_features (
  id INTEGER PRIMARY KEY,
  service_slug TEXT NOT NULL REFERENCES shipping_services(slug) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  feature TEXT NOT NULL,
  UNIQUE (service_slug, sequence)
);

CREATE TABLE service_locations (
  id INTEGER PRIMARY KEY,
  city TEXT NOT NULL,
  pin_code TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  opening_hours TEXT NOT NULL,
  phone TEXT NOT NULL,
  map_x INTEGER NOT NULL,
  map_y INTEGER NOT NULL
);

CREATE TABLE location_services (
  location_id INTEGER NOT NULL REFERENCES service_locations(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  PRIMARY KEY (location_id, service_name)
);

CREATE TABLE shipping_guides (
  topic TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  href TEXT NOT NULL
);

CREATE TABLE shipping_guide_points (
  id INTEGER PRIMARY KEY,
  topic TEXT NOT NULL REFERENCES shipping_guides(topic) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  point TEXT NOT NULL,
  UNIQUE (topic, sequence)
);

CREATE TABLE support_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  phone TEXT NOT NULL,
  opening_hours TEXT NOT NULL,
  support_href TEXT NOT NULL,
  faq_href TEXT NOT NULL
);

CREATE TABLE support_faqs (
  id INTEGER PRIMARY KEY,
  sequence INTEGER NOT NULL UNIQUE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL
);

CREATE TABLE news_items (
  id INTEGER PRIMARY KEY,
  published_date TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL
);

CREATE TABLE quote_rate_cards (
  id INTEGER PRIMARY KEY,
  shipping_mode TEXT NOT NULL CHECK (shipping_mode IN ('domestic', 'international')),
  service_name TEXT NOT NULL,
  eta_text TEXT NOT NULL,
  base_price_inr REAL NOT NULL,
  per_chargeable_kg_inr REAL NOT NULL,
  badge TEXT,
  description TEXT NOT NULL,
  UNIQUE (shipping_mode, service_name)
);

INSERT INTO metadata (key, value) VALUES
  ('service_name', 'Northline Express'),
  ('dataset_type', 'fictional demo data'),
  ('dataset_version', '1.0'),
  ('notice', 'This dataset contains simulated shipments, quotes, locations and support information. It is not connected to a courier network.');

INSERT INTO shipments VALUES
  ('NL123456789', 'NL-DEL-2408', 'In transit', 'Mumbai, MH', 'New Delhi, DL', 'Domestic Priority', 'Tomorrow, by 12:00 PM', 'A. Sharma', CURRENT_TIMESTAMP),
  ('NL987654321', 'ECOM-8842', 'Delivered', 'Bengaluru, KA', 'Chennai, TN', 'eCom Lite Surface', 'Delivered 04 Aug, 02:36 PM', 'R. Iyer', CURRENT_TIMESTAMP),
  ('NL246813579', 'CRITICAL-91', 'Delayed', 'Kolkata, WB', 'Pune, MH', 'Critical Express', 'Updated estimate: 07 Aug', 'M. Desai', CURRENT_TIMESTAMP),
  ('NL111111111', 'DOC-4177', 'Exception', 'Ahmedabad, GJ', 'Kochi, KL', 'Domestic Priority', 'Action required', 'K. Nair', CURRENT_TIMESTAMP);

INSERT INTO tracking_events (waybill, sequence, title, location, event_time_text, is_complete) VALUES
  ('NL123456789', 1, 'Shipment picked up', 'Andheri East, Mumbai', '05 Aug · 09:42 PM', 1),
  ('NL123456789', 2, 'Arrived at origin hub', 'Mumbai Hub', '05 Aug · 11:18 PM', 1),
  ('NL123456789', 3, 'Departed on flight NLA 302', 'Mumbai Hub', '06 Aug · 02:10 AM', 1),
  ('NL123456789', 4, 'Destination facility', 'New Delhi Gateway', 'Expected 06 Aug · 05:45 AM', 0),
  ('NL123456789', 5, 'Out for delivery', 'New Delhi', 'Expected by 09:00 AM', 0),
  ('NL987654321', 1, 'Shipment picked up', 'Whitefield, Bengaluru', '02 Aug · 06:20 PM', 1),
  ('NL987654321', 2, 'In transit', 'Bengaluru Surface Hub', '03 Aug · 01:15 AM', 1),
  ('NL987654321', 3, 'Out for delivery', 'Guindy, Chennai', '04 Aug · 09:05 AM', 1),
  ('NL987654321', 4, 'Delivered', 'Chennai, TN', '04 Aug · 02:36 PM', 1),
  ('NL246813579', 1, 'Shipment picked up', 'Salt Lake, Kolkata', '04 Aug · 04:30 PM', 1),
  ('NL246813579', 2, 'Weather disruption', 'Kolkata Gateway', '05 Aug · 01:20 AM', 1),
  ('NL246813579', 3, 'Movement rescheduled', 'Kolkata Gateway', 'Updated 05 Aug · 07:40 AM', 0),
  ('NL111111111', 1, 'Shipment picked up', 'Ahmedabad, GJ', '03 Aug · 05:12 PM', 1),
  ('NL111111111', 2, 'Address clarification required', 'Kochi Facility', '05 Aug · 10:32 AM', 1),
  ('NL111111111', 3, 'Delivery on hold', 'Kochi Facility', 'Contact customer service', 0);

INSERT INTO shipping_services VALUES
  ('domestic-priority', 'Domestic Priority', 'Air express', 'Time-critical, door-to-door delivery across India.', 'Fast, secure air express for documents and packages, with real-time tracking and proof of delivery.', 'Urgent documents, samples and high-priority business shipments.', '#ef3f4d'),
  ('air-express-package', 'Air Express Package', 'Commercial freight', 'A reliable air solution for heavier shipments.', 'A cost-effective airport-connected express service for packages that need the speed of air transport.', 'Commercial packages, inventory replenishment and time-sensitive freight.', '#ff8a3d'),
  ('surface', 'Northline Surface', 'Ground network', 'Dependable, economical movement across India.', 'Technology-enabled ground distribution supported by Northline’s nationwide surface network.', 'Non-urgent parcels, regular replenishment and cost-conscious shipping.', '#13a38f'),
  ('ecom-lite', 'eCom Lite Surface', 'E-commerce', 'Flexible distribution designed for online commerce.', 'A scalable B2C surface product built around visibility, delivery choice and returns.', 'Marketplaces, D2C brands and high-volume online sellers.', '#7258d6'),
  ('smart-box', 'Smart Box', 'Simple pricing', 'One box, one price, anywhere in India.', 'Standardized, secure packaging with simplified pricing for domestic shipments.', 'Small businesses that want predictable shipping costs.', '#1369e8'),
  ('express-pallet', 'Express Pallet', 'Heavy freight', 'A secure solution for palletized shipments.', 'Specialized handling for larger consolidated loads across Northline’s network.', 'Manufacturing, automotive and organized heavy shipments.', '#1d887a'),
  ('airport-to-airport', 'Airport-to-Airport', 'Aviation', 'Dedicated domestic air cargo capacity.', 'Scheduled airport cargo movement backed by Northline Aviation’s dedicated freighter network.', 'High-volume and time-critical airport cargo.', '#d83948'),
  ('international', 'International Services', 'Global partners', 'Door-to-door reach across 220+ countries and territories.', 'International document and parcel services through the Northline and OrbitLink global network.', 'Exports, urgent documents, samples and global commerce.', '#d9a400');

INSERT INTO service_features (service_slug, sequence, feature) VALUES
  ('domestic-priority', 1, 'Next-business-day options'), ('domestic-priority', 2, 'Free pickup'), ('domestic-priority', 3, 'Regulatory clearance support'), ('domestic-priority', 4, 'Digital proof of delivery'),
  ('air-express-package', 1, 'Door-to-door movement'), ('air-express-package', 2, 'Single-piece shipments from 10 kg'), ('air-express-package', 3, 'Real-time visibility'), ('air-express-package', 4, 'Nationwide air network'),
  ('surface', 1, 'Day-definite delivery'), ('surface', 2, 'Wide PIN-code reach'), ('surface', 3, 'Track and trace'), ('surface', 4, 'Proof of delivery'),
  ('ecom-lite', 1, 'Cash-on-delivery support'), ('ecom-lite', 2, 'Reverse logistics'), ('ecom-lite', 3, 'Delivery notifications'), ('ecom-lite', 4, 'Flexible shipment sizes'),
  ('smart-box', 1, '10 kg and 25 kg sizes'), ('smart-box', 2, 'Door-to-door delivery'), ('smart-box', 3, 'Packaging included'), ('smart-box', 4, 'Easy budgeting'),
  ('express-pallet', 1, '50 kg to 100 kg formats'), ('express-pallet', 2, 'Weather-resistant design'), ('express-pallet', 3, 'Faster handling'), ('express-pallet', 4, 'Shipment visibility'),
  ('airport-to-airport', 1, 'Freighter network'), ('airport-to-airport', 2, 'Bonded warehouses'), ('airport-to-airport', 3, 'Priority uplift'), ('airport-to-airport', 4, 'Ground handling expertise'),
  ('international', 1, 'Express Worldwide'), ('international', 2, 'Customs expertise'), ('international', 3, 'Time-definite delivery'), ('international', 4, 'International tracking');

INSERT INTO service_locations (id, city, pin_code, address, opening_hours, phone, map_x, map_y) VALUES
  (1, 'Mumbai', '400099', 'Northline Centre, Sahar Airport Road, Andheri East', 'Mon–Sat · 8:00 AM–9:00 PM', '1800 555 0142', 22, 28),
  (2, 'New Delhi', '110037', 'Cargo Terminal 2, IGI Airport, New Delhi', 'Open 24 hours', '1800 555 0142', 55, 17),
  (3, 'Bengaluru', '560017', 'HAL Airport Road, Kodihalli, Bengaluru', 'Mon–Sat · 8:00 AM–8:00 PM', '1800 555 0142', 45, 62),
  (4, 'Chennai', '600016', 'GST Road, St. Thomas Mount, Chennai', 'Mon–Sat · 8:30 AM–8:30 PM', '1800 555 0142', 56, 69),
  (5, 'Kolkata', '700052', 'Jessore Road, Airport Gate 1, Kolkata', 'Mon–Sat · 8:00 AM–9:00 PM', '1800 555 0142', 72, 41),
  (6, 'Hyderabad', '500016', 'Begumpet Main Road, Hyderabad', 'Mon–Sat · 8:00 AM–8:00 PM', '1800 555 0142', 44, 52);

INSERT INTO location_services VALUES
  (1, 'Pickup'), (1, 'Delivery'), (1, 'International'), (1, 'Smart Box'),
  (2, 'Pickup'), (2, 'Delivery'), (2, 'Airport cargo'),
  (3, 'Pickup'), (3, 'Delivery'), (3, 'International'),
  (4, 'Pickup'), (4, 'Delivery'), (4, 'Smart Box'),
  (5, 'Pickup'), (5, 'Delivery'), (5, 'International'),
  (6, 'Pickup'), (6, 'Delivery');

INSERT INTO shipping_guides VALUES
  ('documents', 'Documentation', '/support/regulatory#documents'),
  ('restricted', 'Banned and restricted commodities', '/support/regulatory#restricted'),
  ('dangerous', 'Dangerous goods', '/support/regulatory#dangerous'),
  ('packing', 'Packing', '/support/regulatory#packing'),
  ('conditions', 'Conditions of carriage', '/legal/terms'),
  ('overview', 'Shipping guide', '/support/regulatory');

INSERT INTO shipping_guide_points (topic, sequence, point) VALUES
  ('documents', 1, 'Non-document shipments need a complete commercial invoice.'), ('documents', 2, 'International shipments may also need customs declarations and permits.'), ('documents', 3, 'Retail bookings require valid government-issued photo ID.'), ('documents', 4, 'Describe every item, quantity, value, origin and GST details accurately.'),
  ('restricted', 1, 'Currency and negotiable instruments'), ('restricted', 2, 'Firearms and ammunition'), ('restricted', 3, 'Human remains'), ('restricted', 4, 'Illegal narcotics'), ('restricted', 5, 'Live animals'), ('restricted', 6, 'Pornographic material'),
  ('dangerous', 1, 'Explosives, gases, flammable liquids, toxic substances and corrosives generally cannot travel on standard express products.'), ('dangerous', 2, 'Specialist classification is required before any accepted dangerous-goods movement.'),
  ('packing', 1, 'Use a rigid outer box strong enough for the shipment weight.'), ('packing', 2, 'Cushion every side so contents cannot move.'), ('packing', 3, 'Seal every edge with packing tape in an H-pattern.'), ('packing', 4, 'Label one surface clearly and remove old barcodes.'),
  ('conditions', 1, 'Every real shipment is governed by current Northline or OrbitLink conditions of carriage.'), ('conditions', 2, 'This website is a demonstration — quotes, tracking and forms are simulated.'),
  ('overview', 1, 'Prepare documents, check restricted items, and pack securely before tendering a shipment.'), ('overview', 2, 'Use the location finder to confirm pickup and delivery coverage.');

INSERT INTO support_profile VALUES (1, '1800 555 0142', 'Mon–Sat · 8 AM–8 PM', '/support#contact', '/support#faq');
INSERT INTO support_faqs (sequence, question, answer) VALUES
  (1, 'How do I track a shipment?', 'Use your waybill number. Demo IDs include NL123456789, NL987654321, NL246813579 and NL111111111.'),
  (2, 'How is shipping weight calculated?', 'Charges use the higher of actual weight or volumetric weight (L×W×H / 5000).'),
  (3, 'Can Northline collect from my address?', 'Pickup is available from supported demo locations. Ask to check a city or PIN.'),
  (4, 'What identification is required?', 'Retail bookings may require valid photo identification.');

INSERT INTO news_items (published_date, category, title, summary) VALUES
  ('18 November 2025', 'Network', 'A flagship green integrated ground hub opens in Pataudi', 'A major step in strengthening nationwide express connectivity with smarter, more sustainable operations.'),
  ('29 October 2025', 'Digital', 'Northline launches instant digital account opening', 'A streamlined onboarding experience designed to help Indian businesses begin shipping faster.'),
  ('23 September 2025', 'Company', 'General price increase effective January 1, 2026', 'The annual price adjustment supports network resilience, service quality and continued innovation.');

INSERT INTO quote_rate_cards (shipping_mode, service_name, eta_text, base_price_inr, per_chargeable_kg_inr, badge, description) VALUES
  ('domestic', 'Domestic Priority', 'Next business day', 280, 118, 'Fastest', 'Air express with real-time tracking and proof of delivery.'),
  ('domestic', 'Northline Surface', '3–5 business days', 154, 64, 'Best value', 'Dependable day-definite delivery through our ground network.'),
  ('domestic', 'Smart Box', '2–4 business days', 520, 42, NULL, 'Simple all-inclusive shipping with secure packaging.'),
  ('international', 'OrbitLink Worldwide', '2–4 business days', 1750, 510, 'Fastest', 'Time-definite international door-to-door delivery.'),
  ('international', 'Express Easy', '4–6 business days', 1400, 390, NULL, 'Convenient global shipping for documents and parcels.');
