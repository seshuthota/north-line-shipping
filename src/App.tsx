import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode, type RefObject } from 'react';
import { Link, Route, Switch as Routes, useLocation as useWouterLocation, useParams } from 'wouter';
import {
  ArrowRight, Box, Building2, Calculator, CalendarDays, Check, CheckCircle2, ChevronDown,
  ChevronRight, CircleAlert, Clock3, Eye, FileCheck2, Globe2, Headphones,
  HeartHandshake, HelpCircle, History, Info, Leaf, LocateFixed, LockKeyhole, LogIn, Mail,
  MapPin, Menu, PackageCheck, PackageSearch, Plane, Printer, RotateCcw, Search, Send,
  ShieldCheck, Ship, ShoppingBag, Sparkles, Timer, TrainFront, Truck, UserRound, Warehouse,
  Weight, X, Zap,
} from 'lucide-react';
import { locations, news, quickSearch, services, shipments } from './data';
import type { QuoteResult, ShipmentRecord } from './types';
import { calculateVolumetricWeight, createQuotes } from './shipping';
import { Assistant, AssistantLaunch } from './assistant/Assistant';

const navItems = [
  { label: 'Track', to: '/track' }, { label: 'Ship', to: '/ship' },
  { label: 'Services', to: '/services' }, { label: 'Business', to: '/business' },
  { label: 'Support', to: '/support' }, { label: 'About', to: '/about' },
];

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function scrollMotion(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

/** Bring an element into the middle of the viewport after a selection or result reveal. */
export function scrollToCenter(el: HTMLElement | null) {
  if (!el) return;
  el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: scrollMotion() });
}

function scrollToHash(hash: string) {
  if (!hash || hash === '#') return false;
  const id = decodeURIComponent(hash.slice(1));
  if (!id) return false;
  const el = document.getElementById(id);
  if (!el) return false;
  scrollToCenter(el);
  return true;
}

/** Scroll when `active` becomes true and the ref is mounted (after paint). */
function useScrollOn(active: boolean, ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => scrollToCenter(ref.current), 60);
    return () => window.clearTimeout(timer);
  }, [active, ref]);
}

function useLocation() {
  const [pathname] = useWouterLocation();
  return { pathname, search: typeof window === 'undefined' ? '' : window.location.search };
}

function useNavigate() {
  const [, navigate] = useWouterLocation();
  return navigate;
}

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  const [pathname] = useWouterLocation();
  const active = pathname === to || (to !== '/' && pathname.startsWith(`${to}/`));
  return <Link to={to} className={active ? 'active' : undefined}>{children}</Link>;
}

function Logo() {
  return <Link to="/" className="brand" aria-label="Northline home"><img src="/northline-logo.svg" alt="Northline" /><span>Northline</span></Link>;
}

/** Scroll to top on route change, or center a hash target (forms, FAQ, careers, etc.). */
function ScrollManager() {
  const { pathname } = useLocation();
  const [hash, setHash] = useState(() => (typeof window === 'undefined' ? '' : window.location.hash));

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  useEffect(() => {
    setHash(window.location.hash);
  }, [pathname]);

  useEffect(() => {
    if (hash) {
      const attempt = () => scrollToHash(hash);
      const first = window.setTimeout(() => {
        if (!attempt()) window.setTimeout(attempt, 120);
      }, 40);
      return () => window.clearTimeout(first);
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);

  return null;
}

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const results = useMemo(() => query.trim().length < 2 ? [] : quickSearch.filter((item) => `${item.title} ${item.description} ${item.type}`.toLowerCase().includes(query.toLowerCase())).slice(0, 6), [query]);
  const location = useLocation();
  useEffect(() => { setMenuOpen(false); setSearchOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.body.classList.toggle('scroll-locked', menuOpen || searchOpen);
    return () => document.body.classList.remove('scroll-locked');
  }, [menuOpen, searchOpen]);

  return <>
    <div className="utility-bar"><div className="container utility-inner"><span><Sparkles size={14} /> Reimagining express delivery</span><div><a href="tel:18005550142">1800 555 0142</a><Link to="/about#careers">Careers</Link><Link to="/about">About us</Link></div></div></div>
    <header className="site-header">
      <div className="container header-inner">
        <Logo />
        <nav className="desktop-nav" aria-label="Primary navigation">{navItems.map((item) => <NavLink key={item.to} to={item.to}>{item.label}</NavLink>)}</nav>
        <div className="header-actions">
          <button className="icon-button" aria-label="Search" onClick={() => setSearchOpen(true)}><Search size={20} /></button>
          <Link to="/account" className="account-link"><UserRound size={18} /><span>My Northline</span></Link>
          <Link to="/track#track-form" className="button button-small">Track shipment</Link>
          <button className="menu-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
      </div>
      {menuOpen && <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">{navItems.map((item) => <NavLink key={item.to} to={item.to}>{item.label}<ChevronRight size={18} /></NavLink>)}<NavLink to="/account">My Northline<ChevronRight size={18} /></NavLink></nav>}
    </header>
    {searchOpen && <div className="search-overlay" role="dialog" aria-modal="true" aria-label="Search Northline">
      <button className="search-backdrop" aria-label="Close search" onClick={() => setSearchOpen(false)} />
      <div className="search-panel">
        <div className="search-input"><Search size={22} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search services, tools and support" aria-label="Search" /><button onClick={() => setSearchOpen(false)} aria-label="Close"><X /></button></div>
        {!query && <div className="search-empty"><span>Popular</span><Link to="/track#track-form">Track shipment</Link><Link to="/ship#quote">Get a quote</Link><Link to="/support/regulatory">Restricted items</Link></div>}
        {query && results.length === 0 && <div className="empty-state compact"><Search /><h3>No results yet</h3><p>Try “international”, “tracking” or “location”.</p></div>}
        <div className="search-results">{results.map((item) => <Link key={item.title} to={item.href}><span>{item.type}</span><strong>{item.title}</strong><p>{item.description}</p><ArrowRight size={18} /></Link>)}</div>
      </div>
    </div>}
  </>;
}

function Footer() {
  return <footer className="footer">
    <div className="container footer-cta"><div><span className="eyebrow light">READY WHEN YOU ARE</span><h2>Wherever business moves,<br />we move with it.</h2></div><div className="button-row"><Link to="/ship#quote" className="button button-white">Get a quote <ArrowRight size={17} /></Link><Link to="/business" className="button button-ghost-light">Open a business account</Link></div></div>
    <div className="container footer-grid">
      <div className="footer-brand"><Logo /><p>South Asia’s premier express air and integrated transportation and distribution company.</p><div className="network-pill"><span className="live-dot" /> Network operating normally</div></div>
      <div><h3>Ship</h3><Link to="/track#track-form">Track shipment</Link><Link to="/ship#quote">Rates & transit time</Link><Link to="/locations#location-finder">Find a location</Link><Link to="/services">Service guide</Link></div>
      <div><h3>Explore</h3><Link to="/business">Business solutions</Link><Link to="/about">About Northline</Link><Link to="/news">Newsroom</Link><Link to="/about#careers">Careers</Link></div>
      <div><h3>Help</h3><Link to="/support">Customer support</Link><Link to="/support/regulatory">Regulatory guide</Link><Link to="/support#faq">FAQs</Link><Link to="/legal/privacy">Privacy</Link></div>
    </div>
    <div className="container footer-bottom"><span>© 2026 Northline Express Limited. Demo concept site.</span><div><Link to="/legal/cookies">Cookies</Link><Link to="/legal/terms">Terms</Link><Link to="/legal/disclaimer">Disclaimer</Link></div></div>
  </footer>;
}

function Layout({ children }: { children: ReactNode }) { return <><ScrollManager /><Header /><main>{children}</main><Footer /></>; }

function SectionIntro({ eyebrow, title, copy, align = 'left' }: { eyebrow: string; title: string; copy?: string; align?: 'left' | 'center' }) {
  return <div className={`section-intro ${align}`}><span className="eyebrow">{eyebrow}</span><h2>{title}</h2>{copy && <p>{copy}</p>}</div>;
}

function PageHero({ eyebrow, title, copy, children, theme = 'blue' }: { eyebrow: string; title: string; copy: string; children?: ReactNode; theme?: 'blue' | 'cream' }) {
  return <section className={`page-hero ${theme}`}><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="container page-hero-inner"><div><span className="eyebrow light">{eyebrow}</span><h1>{title}</h1><p>{copy}</p>{children}</div></div></section>;
}

function TrackingInput({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const [value, setValue] = useState(''); const [mode, setMode] = useState<'waybill' | 'reference'>('waybill'); const navigate = useNavigate();
  function submit(event: FormEvent) { event.preventDefault(); if (value.trim()) navigate(`/track?q=${encodeURIComponent(value.trim())}&mode=${mode}`); }
  return <form className={`tracking-widget ${variant}`} onSubmit={submit}>
    <div className="segmented"><button type="button" className={mode === 'waybill' ? 'active' : ''} onClick={() => setMode('waybill')}>Waybill</button><button type="button" className={mode === 'reference' ? 'active' : ''} onClick={() => setMode('reference')}>Reference</button></div>
    <div className="tracking-entry"><PackageSearch size={23} /><input value={value} onChange={(event) => setValue(event.target.value)} placeholder={mode === 'waybill' ? 'Enter waybill number' : 'Enter reference number'} aria-label={mode === 'waybill' ? 'Waybill number' : 'Reference number'} /><button className="button" type="submit">Track now <ArrowRight size={17} /></button></div>
    <small>Try <button type="button" onClick={() => setValue('NL123456789')}>NL123456789</button> for a demo shipment.</small>
  </form>;
}

function RouteMapGraphic() {
  return <div className="route-visual" aria-hidden="true">
    <div className="map-grid" /><div className="route-line route-a" /><div className="route-line route-b" />
    <span className="map-node node-a"><i /> Mumbai</span><span className="map-node node-b"><i /> New Delhi</span><span className="map-node node-c"><i /> Bengaluru</span>
    <div className="plane-chip"><Plane size={24} /><span><small>NL 302</small> In flight</span></div>
    <div className="metric-card"><small>ON-TIME PERFORMANCE</small><strong>99.96%</strong><span><span className="up">↗ 0.08%</span> this month</span></div>
  </div>;
}

function HomePage() {
  return <>
    <section className="home-hero"><div className="container hero-grid"><div className="hero-copy"><span className="eyebrow light">INDIA’S EXPRESS NETWORK</span><h1>Every delivery<br />moves a <em>promise.</em></h1><p>From one important document to an entire supply chain—move it with speed, visibility and confidence.</p><TrackingInput /><AssistantLaunch label="Or ask the assistant" /><div className="hero-proof"><div className="avatar-stack"><span>JD</span><span>AS</span><span>RM</span></div><p><strong>56,400+</strong> locations served across India</p></div></div><RouteMapGraphic /></div></section>
    <section className="quick-actions"><div className="container quick-grid">
      <Link to="/ship#quote"><span className="quick-icon coral"><Calculator /></span><div><strong>Get price & transit time</strong><small>Compare the best way to send</small></div><ArrowRight /></Link>
      <Link to="/locations#location-finder"><span className="quick-icon teal"><LocateFixed /></span><div><strong>Find a Northline location</strong><small>Pickup, delivery and retail centres</small></div><ArrowRight /></Link>
      <Link to="/business"><span className="quick-icon violet"><Building2 /></span><div><strong>Ship for your business</strong><small>Tools built to help you scale</small></div><ArrowRight /></Link>
    </div></section>
    <section className="section service-section"><div className="container"><SectionIntro eyebrow="BUILT AROUND YOUR BUSINESS" title="The right network for every shipment." copy="Urgent or economical. One parcel or thousands. Choose a service designed around what you’re moving." /><ServiceCards limit={4} /><div className="section-link"><Link to="/services">Explore all services <ArrowRight size={18} /></Link></div></div></section>
    <section className="section control-section"><div className="container two-col"><div className="control-visual"><div className="dashboard-card"><div className="dashboard-top"><span>Today’s shipments</span><strong>24</strong></div><div className="mini-bars"><i style={{height:'60%'}} /><i style={{height:'80%'}} /><i style={{height:'52%'}} /><i style={{height:'95%'}} /><i style={{height:'72%'}} /><i style={{height:'88%'}} /><i style={{height:'66%'}} /></div><div className="dashboard-row"><PackageCheck /><div><strong>18 delivered</strong><small>Across 12 destinations</small></div><span className="status delivered">On track</span></div><div className="dashboard-row"><Plane /><div><strong>4 in transit</strong><small>Next scan in 42 min</small></div><ChevronRight /></div></div><span className="float-badge"><CheckCircle2 /> Pickup confirmed</span></div><div><SectionIntro eyebrow="ONE CLEAR VIEW" title="Control every delivery from one place." copy="My Northline brings shipment visibility, saved addresses, invoices and reports into one calm workspace." /><ul className="feature-list"><li><Check /> Proactive shipment alerts</li><li><Check /> Batch shipping and label tools</li><li><Check /> Performance insights and reports</li></ul><Link to="/account" className="button button-dark">Explore My Northline <ArrowRight size={17} /></Link></div></div></section>
    <section className="network-section"><div className="container"><div className="network-copy"><SectionIntro eyebrow="A NETWORK BUILT FOR INDIA" title="Wherever India grows, we’re already moving." copy="Dedicated air capacity, a powerful ground network and deep local expertise connect businesses to every opportunity." /><Link to="/about" className="text-link light">See how our network works <ArrowRight /></Link></div><div className="stat-grid"><div><Plane /><strong>8</strong><span>Dedicated freighters</span></div><div><MapPin /><strong>56,400+</strong><span>Locations in India</span></div><div><Warehouse /><strong>85</strong><span>Warehousing locations</span></div><div><Globe2 /><strong>220+</strong><span>Countries & territories</span></div></div></div></section>
    <section className="section"><div className="container"><div className="section-heading-row"><SectionIntro eyebrow="WHAT’S MOVING" title="From across the network." /><Link className="text-link" to="/news">View newsroom <ArrowRight /></Link></div><NewsCards limit={3} /></div></section>
  </>;
}

function ServiceCards({ limit }: { limit?: number }) {
  return <div className="service-grid">{services.slice(0, limit).map((service, index) => <Link to={`/services/${service.slug}`} className="service-card" key={service.slug} style={{ '--accent': service.accent } as CSSProperties}><div className="service-card-top"><span>{String(index + 1).padStart(2, '0')}</span>{service.slug === 'international' ? <Globe2 /> : service.slug.includes('surface') || service.slug === 'ecom-lite' ? <Truck /> : service.slug.includes('pallet') ? <Box /> : <Plane />}</div><small>{service.eyebrow}</small><h3>{service.name}</h3><p>{service.summary}</p><span className="card-link">Learn more <ArrowRight size={18} /></span></Link>)}</div>;
}

function StatusBadge({ status }: { status: ShipmentRecord['status'] }) { return <span className={`status ${status.toLowerCase().replace(' ', '-')}`}>{status === 'Delivered' ? <CheckCircle2 /> : status === 'In transit' ? <Truck /> : <CircleAlert />}{status}</span>; }

function TrackingResult({ record }: { record: ShipmentRecord }) {
  return <div className="tracking-result">
    <div className="result-head"><div><small>WAYBILL</small><h2>{record.id}</h2></div><StatusBadge status={record.status} /><div className="result-actions"><button onClick={() => window.print()}><Printer /> Print</button></div></div>
    <div className="shipment-overview"><div><small>FROM</small><strong>{record.origin}</strong></div><div className="journey-line"><span /><Truck /><span /></div><div><small>TO</small><strong>{record.destination}</strong></div><div><small>ESTIMATED DELIVERY</small><strong>{record.eta}</strong></div></div>
    {record.status === 'Exception' && <div className="alert-banner"><CircleAlert /><div><strong>We need a little more information</strong><p>Please contact customer service to clarify the delivery address.</p></div><Link to="/support#contact">Get help</Link></div>}
    <div className="result-body"><div><h3>Shipment journey</h3><div className="timeline">{record.events.map((event, index) => <div className={`timeline-item ${event.complete ? 'complete' : ''}`} key={`${event.title}-${index}`}><span className="timeline-dot">{event.complete && <Check />}</span><div><strong>{event.title}</strong><p>{event.location}</p><small>{event.time}</small></div></div>)}</div></div><aside><div><small>SERVICE</small><strong>{record.service}</strong></div><div><small>REFERENCE</small><strong>{record.reference}</strong></div><div><small>RECIPIENT</small><strong>Protected</strong></div><button className="button button-outline"><Mail /> Get status updates</button></aside></div>
  </div>;
}

function TrackPage() {
  const location = useLocation(); const initial = new URLSearchParams(location.search).get('q') || '';
  const [mode, setMode] = useState<'waybill' | 'reference'>((new URLSearchParams(location.search).get('mode') as 'waybill' | 'reference') || 'waybill');
  const [input, setInput] = useState(initial); const [searched, setSearched] = useState(Boolean(initial)); const [loading, setLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => !searched ? [] : input.split(',').map((value) => value.trim()).filter(Boolean).map((value) => shipments.find((shipment) => mode === 'waybill' ? shipment.id.toLowerCase() === value.toLowerCase() : shipment.reference.toLowerCase() === value.toLowerCase())).filter(Boolean) as ShipmentRecord[], [input, mode, searched]);
  useScrollOn(searched && !loading, resultsRef);
  function submit(event: FormEvent) { event.preventDefault(); setLoading(true); setSearched(false); window.setTimeout(() => { setSearched(true); setLoading(false); }, 450); }
  return <><PageHero eyebrow="TRACK & TRACE" title="Know exactly where it is." copy="Follow up to 25 shipments at once with milestone-by-milestone visibility." />
    <section className="section track-section"><div className="container narrow"><form id="track-form" className="tool-card" onSubmit={submit}><div className="tool-card-header"><div><span className="tool-number">01</span><div><h2>Track your shipment</h2><p>Enter numbers separated by commas for multiple shipments.</p></div></div><div className="segmented pale"><button type="button" className={mode === 'waybill' ? 'active' : ''} onClick={() => setMode('waybill')}>Waybill</button><button type="button" className={mode === 'reference' ? 'active' : ''} onClick={() => setMode('reference')}>Reference</button></div></div><div className="large-input"><PackageSearch /><input value={input} onChange={(event) => { setInput(event.target.value); setSearched(false); }} placeholder={mode === 'waybill' ? 'e.g. NL123456789' : 'e.g. NL-DEL-2408'} aria-label="Shipment number" /><button className="button" disabled={!input.trim() || loading}>{loading ? 'Finding shipment…' : <>Track <ArrowRight /></>}</button></div><div className="sample-list"><span>Demo waybills:</span>{shipments.map((shipment) => <button type="button" key={shipment.id} onClick={() => { setMode('waybill'); setInput(shipment.id); setSearched(false); }}>{shipment.id}</button>)}</div></form>
    {searched && results.length > 0 && <div ref={resultsRef} id="track-results" className="results-stack" tabIndex={-1}>{results.map((record) => <TrackingResult key={record.id} record={record} />)}</div>}
    {searched && results.length === 0 && <div ref={resultsRef} id="track-results" className="empty-state" tabIndex={-1}><PackageSearch /><h2>We couldn’t find that shipment</h2><p>Check the number and try again, or use one of the demo waybills above.</p><button className="button button-outline" onClick={() => { setInput('NL123456789'); setSearched(false); }}>Use a sample shipment</button></div>}
    </div></section></>;
}

function quoteFormDefaults() {
  const params = new URLSearchParams(typeof window === 'undefined' ? '' : window.location.search);
  const mode: 'domestic' | 'international' = params.get('mode') === 'international' ? 'international' : 'domestic';
  const weight = Number(params.get('weight'));
  return {
    mode,
    from: params.get('from') || 'Mumbai',
    to: params.get('to') || 'New Delhi',
    weight: Number.isFinite(weight) && weight > 0 ? String(weight) : '2',
  };
}

function ShipPage() {
  const defaults = useMemo(quoteFormDefaults, []);
  const [mode, setMode] = useState<'domestic' | 'international'>(defaults.mode); const [from, setFrom] = useState(defaults.from); const [to, setTo] = useState(defaults.to); const [weight, setWeight] = useState(defaults.weight); const [showDimensions, setShowDimensions] = useState(false); const [dimensions, setDimensions] = useState({ length: '30', width: '20', height: '15' }); const [quotes, setQuotes] = useState<QuoteResult[]>([]); const [loading, setLoading] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const dimensionsRef = useRef<HTMLDivElement>(null);
  const volumetric = calculateVolumetricWeight(Number(dimensions.length), Number(dimensions.width), Number(dimensions.height)); const chargeable = Math.max(Number(weight) || 0, showDimensions ? volumetric : 0);
  useScrollOn(!loading && quotes.length > 0, resultsRef);
  useScrollOn(showDimensions, dimensionsRef);
  function submit(event: FormEvent) { event.preventDefault(); setLoading(true); setQuotes([]); window.setTimeout(() => { setQuotes(createQuotes({ mode, from, to, weight: Number(weight), length: showDimensions ? Number(dimensions.length) : 0, width: showDimensions ? Number(dimensions.width) : 0, height: showDimensions ? Number(dimensions.height) : 0 })); setLoading(false); }, 550); }
  return <><PageHero eyebrow="PRICE & TRANSIT TIME" title="Plan the journey before it begins." copy="Compare delivery options with clear transit estimates and transparent demo pricing." />
    <section className="section"><div className="container quote-layout"><form id="quote" className="quote-form" onSubmit={submit}><div className="form-heading"><span className="tool-number">01</span><div><h2>Tell us about your shipment</h2><p>All fields marked with an asterisk are required.</p></div></div><div className="segmented full"><button type="button" className={mode === 'domestic' ? 'active' : ''} onClick={() => { setMode('domestic'); setFrom('Mumbai'); setTo('New Delhi'); }}>Within India</button><button type="button" className={mode === 'international' ? 'active' : ''} onClick={() => { setMode('international'); setFrom('Mumbai'); setTo('Singapore'); }}>International</button></div>
      <div className="form-grid"><label>From *<div className="input-wrap"><MapPin /><input required value={from} onChange={(event) => setFrom(event.target.value)} /></div></label><label>To *<div className="input-wrap"><LocateFixed /><input required value={to} onChange={(event) => setTo(event.target.value)} /></div></label><label>Actual weight (kg) *<div className="input-wrap"><Weight /><input required min="0.1" step="0.1" type="number" value={weight} onChange={(event) => setWeight(event.target.value)} /></div></label><label>Pickup date *<div className="input-wrap"><CalendarDays /><input required type="date" defaultValue="2026-08-06" /></div></label></div>
      <button type="button" className="dimension-toggle" onClick={() => setShowDimensions(!showDimensions)}><Box /> Add package dimensions <ChevronDown className={showDimensions ? 'rotated' : ''} /></button>
      {showDimensions && <div ref={dimensionsRef} className="dimension-box"><div className="dimension-fields">{(['length', 'width', 'height'] as const).map((key) => <label key={key}>{key[0].toUpperCase() + key.slice(1)} (cm)<input type="number" min="1" value={dimensions[key]} onChange={(event) => setDimensions({ ...dimensions, [key]: event.target.value })} /></label>)}</div><div className="weight-result"><Calculator /><div><small>VOLUMETRIC WEIGHT</small><strong>{volumetric.toFixed(2)} kg</strong></div><div><small>CHARGEABLE WEIGHT</small><strong>{chargeable.toFixed(2)} kg</strong></div></div></div>}
      <button className="button button-wide" disabled={loading}>{loading ? 'Finding the best options…' : <>Find services <ArrowRight /></>}</button><p className="form-note"><Info /> Estimates are for demonstration and are not live tariffs.</p></form>
      <aside className="quote-aside"><span className="eyebrow">GOOD TO KNOW</span><h3>Pack smart. Pay for what you move.</h3><p>Shipping charges use the higher of actual or volumetric weight. Measure the package at its widest points after packing.</p><div className="package-graphic"><Box /><span className="measure m-width">Width</span><span className="measure m-height">Height</span><span className="measure m-length">Length</span></div><Link to="/support/regulatory#packing" className="text-link">Read our packing guide <ArrowRight /></Link></aside></div>
    {quotes.length > 0 && <div ref={resultsRef} id="quote-results" className="container quote-results" tabIndex={-1}><div className="results-title"><span className="tool-number">02</span><div><h2>Your delivery options</h2><p>{from} to {to} · {chargeable.toFixed(2)} kg chargeable weight</p></div></div><div className="quote-cards">{quotes.map((quote) => <div className="quote-card" key={quote.service}>{quote.badge && <span className="quote-badge">{quote.badge}</span>}<div><small>SERVICE</small><h3>{quote.service}</h3><p>{quote.description}</p></div><div className="quote-eta"><Clock3 /><span><small>ESTIMATED DELIVERY</small><strong>{quote.eta}</strong></span></div><div className="quote-price"><small>ESTIMATED TOTAL</small><strong>₹{quote.price.toLocaleString('en-IN')}</strong><span>incl. demo surcharges</span></div><button className="button button-outline">Choose service</button></div>)}</div></div>}
    </section></>;
}

function LocationsPage() {
  const [query, setQuery] = useState(''); const [filter, setFilter] = useState('All services'); const [active, setActive] = useState(locations[0]);
  const mapRef = useRef<HTMLDivElement>(null);
  const filtered = locations.filter((item) => `${item.city} ${item.pin} ${item.address}`.toLowerCase().includes(query.toLowerCase()) && (filter === 'All services' || item.services.includes(filter)));
  function selectLocation(item: typeof locations[number]) {
    setActive(item);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 800px)').matches) {
      window.setTimeout(() => scrollToCenter(mapRef.current), 60);
    }
  }
  return <><PageHero eyebrow="LOCATION FINDER" title="The network, right around the corner." copy="Find service centres, pickup points and delivery coverage near you." />
    <section id="location-finder" className="locations-shell"><div className="location-sidebar"><div className="location-search"><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="City or PIN code" aria-label="City or PIN code" /></div><div className="filter-chips">{['All services', 'Pickup', 'Delivery', 'International'].map((item) => <button className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div><p className="result-count">{filtered.length} locations found</p><div className="location-list">{filtered.map((item) => <button className={active.pin === item.pin ? 'active' : ''} key={item.pin} onClick={() => selectLocation(item)}><div><MapPin /><span><strong>{item.city}</strong><small>{item.pin}</small></span></div><p>{item.address}</p><span>{item.hours}</span></button>)}</div></div><div ref={mapRef} className="map-panel"><div className="map-pattern" />{locations.map((item) => <button className={`map-pin ${active.pin === item.pin ? 'active' : ''}`} key={item.pin} style={{ left: `${item.coordinates[0]}%`, top: `${item.coordinates[1]}%` }} onClick={() => selectLocation(item)} aria-label={`View ${item.city}`}><MapPin /></button>)}<div className="location-popover"><div className="popover-head"><span className="quick-icon coral"><Building2 /></span><div><small>NORTHLINE CENTRE</small><h3>{active.city}</h3></div></div><p>{active.address}</p><dl><div><Clock3 /><span><dt>Hours</dt><dd>{active.hours}</dd></span></div><div><Headphones /><span><dt>Phone</dt><dd>{active.phone}</dd></span></div></dl><div className="tag-row">{active.services.map((item) => <span key={item}>{item}</span>)}</div><button className="button button-wide">Get directions <ArrowRight /></button></div></div></section>
  </>;
}

function ServicesPage() { return <><PageHero eyebrow="SERVICE GUIDE" title="Move anything. Move forward." copy="From an urgent document to a charter-load of freight, there’s a Northline service built for it."><div className="button-row"><Link to="/ship#quote" className="button button-white">Compare services <ArrowRight /></Link><Link to="/support/regulatory" className="button button-ghost-light">Shipping guide</Link></div></PageHero><section className="section"><div className="container"><SectionIntro eyebrow="OUR SERVICES" title="Speed when it matters. Value when it counts." copy="Explore air, ground, e-commerce, freight and international delivery through one integrated network." /><ServiceCards /></div></section><section className="section compare-section"><div className="container two-col"><div><SectionIntro eyebrow="HELP ME CHOOSE" title="Not sure which service fits?" copy="Tell us where it’s going, how quickly it needs to arrive and what it weighs. We’ll narrow down the options." /><Link to="/ship#quote" className="button button-dark">Find my service <ArrowRight /></Link></div><div className="choice-card"><div><Timer /><span><small>FASTEST</small><strong>Domestic Priority</strong></span></div><div><Leaf /><span><small>BEST VALUE</small><strong>Northline Surface</strong></span></div><div><Globe2 /><span><small>WORLDWIDE</small><strong>OrbitLink Worldwide</strong></span></div></div></div></section></>; }

function ServiceDetailPage() {
  const { slug } = useParams(); const service = services.find((item) => item.slug === slug);
  if (!service) return <NotFound />;
  return <><PageHero eyebrow={service.eyebrow.toUpperCase()} title={service.name} copy={service.summary}><div className="button-row"><Link to="/ship#quote" className="button button-white">Get price & transit time <ArrowRight /></Link><Link to="/locations#location-finder" className="button button-ghost-light">Check availability</Link></div></PageHero><section className="section"><div className="container service-detail-grid"><div><span className="eyebrow">THE SERVICE</span><h2>Built to keep your promises moving.</h2><p className="lead">{service.description}</p><h3>What you get</h3><div className="feature-card-grid">{service.features.map((item) => <div key={item}><CheckCircle2 /><span>{item}</span></div>)}</div></div><aside className="info-card"><small>IDEAL FOR</small><h3>{service.idealFor}</h3><hr /><div><ShieldCheck /><span><strong>Secure handling</strong><small>Backed by specialist operations</small></span></div><div><Eye /><span><strong>End-to-end visibility</strong><small>Milestone tracking throughout</small></span></div><Link to="/ship#quote" className="button button-wide">Plan a shipment <ArrowRight /></Link></aside></div></section><section className="section subtle"><div className="container"><SectionIntro eyebrow="YOU MAY ALSO NEED" title="Related services" /><div className="service-grid compact-grid">{services.filter((item) => item.slug !== slug).slice(0, 3).map((item) => <Link to={`/services/${item.slug}`} className="mini-service" key={item.slug}><small>{item.eyebrow}</small><h3>{item.name}</h3><ArrowRight /></Link>)}</div></div></section></>;
}

function BusinessPage() {
  return <><PageHero eyebrow="BUSINESS SOLUTIONS" title="Logistics that grows at your speed." copy="Connect shipping, technology and insight across every stage of your customer experience."><div className="button-row"><Link to="/account" className="button button-white">Open an account <ArrowRight /></Link><Link to="/support#contact" className="button button-ghost-light">Talk to sales</Link></div></PageHero><section className="section"><div className="container"><SectionIntro eyebrow="SOLUTIONS FOR SCALE" title="One network. Built around your business." /><div className="solution-grid"><div className="solution-card featured"><ShoppingBag /><span>E-COMMERCE</span><h3>Turn every order into a better delivery experience.</h3><p>Shipping APIs, cash on delivery, reverse logistics and proactive notifications—ready for every growth stage.</p><Link to="/account">Explore e-commerce <ArrowRight /></Link></div><div className="solution-card"><Warehouse /><span>SUPPLY CHAIN</span><h3>Warehousing & distribution</h3><p>Integrated inventory movement from 85 warehouse locations.</p><Link to="/support">Talk to an expert <ArrowRight /></Link></div><div className="solution-card"><Plane /><span>AVIATION</span><h3>Charters & airport cargo</h3><p>Dedicated capacity for mission-critical movements.</p><Link to="/services/airport-to-airport">View aviation services <ArrowRight /></Link></div></div></div></section>
    <section className="section api-section"><div className="container two-col"><div><SectionIntro eyebrow="PLUG IN. SHIP OUT." title="Shipping tools that work where you do." copy="Connect checkout, order management, labels, tracking and reports through flexible integration options." /><div className="integration-pills"><span>ShopLink™</span><span>PackLink™</span><span>ShipLink™</span><span>MailLink™</span></div><Link to="/account" className="button button-dark">Explore integrations <ArrowRight /></Link></div><div className="code-window"><div><i /><i /><i /><span>shipment.json</span></div><pre>{`{
  "waybill": "NL123456789",
  "service": "DOMESTIC_PRIORITY",
  "status": "IN_TRANSIT",
  "eta": "2026-08-06T12:00:00+05:30"
}`}</pre><span className="api-success"><Check /> 200 Shipment created</span></div></div></section>
    <section className="section"><div className="container"><SectionIntro eyebrow="BUILT FOR YOUR INDUSTRY" title="Expertise that understands the stakes." /><div className="industry-row">{['E-commerce', 'Pharmaceuticals', 'Automotive', 'Banking', 'Electronics'].map((item) => <div key={item}><span>{item.slice(0, 2).toUpperCase()}</span><strong>{item}</strong></div>)}</div></div></section></>;
}

const faqs = [
  ['How do I track a shipment?', 'Use your waybill number in Track & Trace. For more than one shipment, separate the numbers with commas.'],
  ['How is shipping weight calculated?', 'Charges use whichever is higher: actual weight or volumetric weight. The quote tool calculates both for you.'],
  ['Can Northline collect from my address?', 'Pickup is available from supported locations. Use the Location Finder or contact customer service to confirm availability.'],
  ['What identification is required?', 'Retail bookings may require valid photo identification. Non-document shipments also require a complete commercial invoice.'],
  ['How do I report a delivery issue?', 'Call centralized customer service or submit the support form with your waybill and contact details.'],
];

function SupportPage() {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [openFaq, setOpenFaq] = useState<number | null>(0); const [sent, setSent] = useState(false);
  const [topic, setTopic] = useState(() => params.get('topic') || '');
  const [message, setMessage] = useState(() => params.get('message') || '');
  const successRef = useRef<HTMLDivElement>(null);
  const faqItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  useScrollOn(sent, successRef);
  function submit(event: FormEvent) { event.preventDefault(); setSent(true); }
  function toggleFaq(index: number) {
    const next = openFaq === index ? null : index;
    setOpenFaq(next);
    if (next !== null) window.setTimeout(() => scrollToCenter(faqItemRefs.current[next]), 60);
  }
  return <><PageHero eyebrow="HELP CENTRE" title="Answers that move things forward." copy="Quick guidance, expert support and practical tools for every part of your shipment journey." /><section className="support-shortcuts"><div className="container"><Link to="/track#track-form"><PackageSearch /><strong>Track a shipment</strong><ArrowRight /></Link><Link to="/locations#location-finder"><MapPin /><strong>Find a location</strong><ArrowRight /></Link><Link to="/support/regulatory"><ShieldCheck /><strong>Check restrictions</strong><ArrowRight /></Link><a href="tel:18005550142"><Headphones /><strong>Call customer service</strong><ArrowRight /></a></div></section>
    <section className="section" id="faq"><div className="container faq-layout"><div><SectionIntro eyebrow="FREQUENTLY ASKED" title="A quick answer may be all you need." copy="The most useful answers to common shipping questions." /><Link to="/support/regulatory" className="text-link">View complete shipping guide <ArrowRight /></Link></div><div className="accordion">{faqs.map(([question, answer], index) => <div ref={(el) => { faqItemRefs.current[index] = el; }} className={`accordion-item ${openFaq === index ? 'open' : ''}`} key={question}><button onClick={() => toggleFaq(index)} aria-expanded={openFaq === index}><span>{question}</span><ChevronDown /></button>{openFaq === index && <p>{answer}</p>}</div>)}</div></div></section>
    <section className="section subtle" id="contact"><div className="container contact-layout"><div><SectionIntro eyebrow="STILL NEED A HAND?" title="Tell us what happened." copy="Share the details below and our demo support flow will show you what happens next." /><div className="contact-details"><div><Headphones /><span><small>CENTRALIZED CUSTOMER SERVICE</small><strong>1800 555 0142</strong></span></div><div><Clock3 /><span><small>AVAILABLE</small><strong>Mon–Sat · 8 AM–8 PM</strong></span></div></div></div>{sent ? <div ref={successRef} className="success-card" tabIndex={-1}><CheckCircle2 /><h3>Thanks—we’ve received your message.</h3><p>This is a local demonstration, so no information was transmitted. In production, you would receive a case number here.</p><button className="button button-outline" onClick={() => setSent(false)}>Send another message</button></div> : <form id="contact-form" className="contact-form" onSubmit={submit}><div className="form-grid"><label>Name *<input required placeholder="Your full name" /></label><label>Email *<input required type="email" placeholder="you@company.com" /></label></div><label>Waybill number<input placeholder="Optional" /></label><label>How can we help? *<select required value={topic} onChange={(event) => setTopic(event.target.value)}><option value="" disabled>Choose a topic</option><option>Delivery status</option><option>Pickup or booking</option><option>Billing and account</option><option>Feedback</option></select></label><label>Message *<textarea required rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Include any details that may help us understand the issue." /></label><button className="button button-wide">Submit request <Send /></button><small className="privacy-note"><LockKeyhole /> Your details stay in this browser. Nothing is transmitted.</small></form>}</div></section></>;
}

function RegulatoryPage() {
  return <><PageHero eyebrow="SHIPPING GUIDE" title="Prepared right. Cleared faster." copy="Practical guidance for documentation, restricted commodities and safe packing." /><section className="section"><div className="container regulatory-grid"><aside className="sticky-nav"><span>ON THIS PAGE</span><a href="#documents">Documents</a><a href="#restricted">Restricted items</a><a href="#dangerous">Dangerous goods</a><a href="#packing">Packing</a><a href="#conditions">Conditions of carriage</a></aside><div className="article-content"><section id="documents"><span className="article-icon"><FileCheck2 /></span><h2>Documentation</h2><p>All non-document shipments require a complete invoice. International shipments may also require country-specific customs documentation, declarations and permits.</p><div className="notice"><Info /><p><strong>Retail bookings require identification.</strong> Keep a valid government-issued photo ID available when tendering a shipment.</p></div><ul><li>Clearly describe every item and its purpose.</li><li>Use accurate quantity, value and country-of-origin information.</li><li>Include GST and regulatory details where applicable.</li></ul></section><section id="restricted"><span className="article-icon red"><CircleAlert /></span><h2>Banned and restricted commodities</h2><p>Northline does not accept commodities prohibited by law or items that may endanger people, aircraft, vehicles or other shipments.</p><div className="restriction-grid">{['Currency & negotiable instruments', 'Firearms and ammunition', 'Human remains', 'Illegal narcotics', 'Live animals', 'Pornographic material'].map((item) => <div key={item}><X />{item}</div>)}</div></section><section id="dangerous"><span className="article-icon amber"><ShieldCheck /></span><h2>Dangerous goods</h2><p>Explosives, gases, flammable liquids, toxic substances and corrosives require specialist classification and generally cannot travel through standard express products.</p><Link to="/support" className="button button-outline">Ask a specialist</Link></section><section id="packing"><span className="article-icon teal"><Box /></span><h2>Pack for the journey</h2><div className="step-list"><div><span>01</span><p><strong>Choose a rigid outer box</strong> with enough strength for the shipment weight.</p></div><div><span>02</span><p><strong>Cushion every side</strong> and prevent contents from moving inside the box.</p></div><div><span>03</span><p><strong>Seal every edge</strong> using pressure-sensitive packing tape in an H-pattern.</p></div><div><span>04</span><p><strong>Label one surface clearly</strong> and remove old barcodes and addresses.</p></div></div></section><section id="conditions"><span className="article-icon"><FileCheck2 /></span><h2>Conditions of carriage</h2><p>Every shipment is governed by the applicable Northline or OrbitLink conditions of carriage, including limits of liability, claims requirements and shipper responsibilities.</p><Link to="/legal/terms" className="text-link">Read conditions of carriage <ArrowRight /></Link></section></div></div></section></>;
}

function AboutPage() {
  return <><PageHero eyebrow="ABOUT NORTHLINE" title="An Indian network with the world in reach." copy="For more than two decades, Northline has connected people, markets and possibilities through express logistics." /><section className="section"><div className="container about-lead"><div><span className="eyebrow">OUR STORY</span><h2>Built in India.<br />Connected to the world.</h2></div><div><p className="lead">Northline Express Ltd. is South Asia’s premier express air and integrated transportation and distribution company, serving more than 56,400 locations across India.</p><p>As part of the OrbitLink global logistics alliance, Northline connects customers to a comprehensive international network spanning more than 220 countries and territories.</p></div></div></section><section className="legacy-section"><div className="container"><div className="legacy-visual"><div className="year-mark">2001</div><Plane /><span>India takes flight</span></div><div><SectionIntro eyebrow="TWO DECADES OF FIRSTS" title="A history of moving ahead." copy="From a regional air express start-up to a technology-led national network, Northline continues to build infrastructure around customer promises." /><div className="milestones"><div><strong>2001</strong><span>Northline begins operations</span></div><div><strong>2010</strong><span>Northline Aviation takes flight</span></div><div><strong>2018</strong><span>Joins the OrbitLink global network</span></div><div><strong>Today</strong><span>56,400+ locations across India</span></div></div></div></div></section>
    <section className="section"><div className="container"><SectionIntro eyebrow="WHAT SETS US APART" title="Infrastructure with purpose." /><div className="advantage-grid"><div><Plane /><h3>Dedicated air network</h3><p>Freighter capacity designed around packages, with bonded warehouses, ground handling and maintenance.</p></div><div><Truck /><h3>Nationwide surface reach</h3><p>A ground network complementing time-critical air services across urban and emerging India.</p></div><div><Zap /><h3>Technology at every scan</h3><p>Indigenously developed systems for track and trace, customer service, MIS, ERP and space control.</p></div><div><HeartHandshake /><h3>11,000+ people</h3><p>A committed team delivering a consistent service experience throughout the network.</p></div></div></div></section>
    <section className="section sustainability"><div className="container two-col"><div><span className="eyebrow light">LIVING RESPONSIBILITY</span><h2>Cleaner routes.<br />Stronger communities.</h2><p>Our environmental and social programs focus on climate protection, disaster response, health, livelihoods and education.</p><Link to="/support" className="button button-white">Explore our commitments <ArrowRight /></Link></div><div className="green-rings"><Leaf /><span>Cleaner<br />deliveries</span></div></div></section>
    <section className="section" id="careers"><div className="container career-banner"><div><span className="eyebrow">CAREERS</span><h2>Bring your ambition.<br />We’ll give it somewhere to go.</h2><p>Join a learning organization where most managers are homegrown and every role helps move India forward.</p></div><Link className="button button-dark" to="/about#careers">Explore careers</Link></div></section></>;
}

function NewsCards({ limit = 3 }: { limit?: number }) { return <div className="news-grid">{news.slice(0, limit).map((item, index) => <article key={item.title} className={`news-card news-${index + 1}`}><div className="news-image"><span>{item.tag}</span>{index === 0 ? <Warehouse /> : index === 1 ? <Zap /> : <Building2 />}</div><small>{item.date}</small><h3>{item.title}</h3><p>{item.summary}</p><button>Read story <ArrowRight /></button></article>)}</div>; }
function NewsPage() { return <><PageHero eyebrow="NEWSROOM" title="The latest from across Northline." copy="Company announcements, network milestones and stories shaping the future of express logistics." /><section className="section"><div className="container"><NewsCards /><div className="archive-list"><h2>More from the archive</h2>{['Northline expands electric vehicle fleet for a greener future', 'Northline expands rural pickup partnerships nationwide', 'Drone operations begin to support last-mile connectivity', 'Northline marks 25 years of excellence'].map((title, index) => <button key={title}><span>0{index + 1}</span><strong>{title}</strong><small>{2025 - index}</small><ArrowRight /></button>)}</div></div></section></>; }

function AccountPage() {
  const stored = localStorage.getItem('nl-demo-account'); const [loggedIn, setLoggedIn] = useState(Boolean(stored)); const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [justAuthed, setJustAuthed] = useState(false);
  const dashboardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!justAuthed || !loggedIn) return;
    const timer = window.setTimeout(() => {
      scrollToCenter(dashboardRef.current);
      setJustAuthed(false);
    }, 80);
    return () => window.clearTimeout(timer);
  }, [justAuthed, loggedIn]);
  function submit(event: FormEvent) { event.preventDefault(); localStorage.setItem('nl-demo-account', JSON.stringify({ name: 'Demo Customer', email: 'demo@northline.local' })); setJustAuthed(true); setLoggedIn(true); }
  function reset() { localStorage.removeItem('nl-demo-account'); setLoggedIn(false); setMode('login'); }
  if (loggedIn) return <><PageHero eyebrow="MY NORTHLINE" title="Good morning, Demo Customer." copy="Your shipping activity, saved details and account tools in one place." /><section ref={dashboardRef} id="dashboard" className="section dashboard-section" tabIndex={-1}><div className="container"><div className="dashboard-summary"><div><small>SHIPMENTS THIS MONTH</small><strong>48</strong><span>↗ 12% from July</span></div><div><small>DELIVERED ON TIME</small><strong>98.4%</strong><span>Excellent performance</span></div><div><small>IN TRANSIT</small><strong>4</strong><span>All moving normally</span></div><button className="button"><PackageCheck /> Create shipment</button></div><div className="dashboard-layout"><div className="activity-card"><div className="card-heading"><h2>Recent shipments</h2><Link to="/track#track-form">Track another <ArrowRight /></Link></div>{shipments.slice(0, 3).map((shipment) => <div className="shipment-row" key={shipment.id}><span className="quick-icon pale-blue"><Box /></span><div><strong>{shipment.destination}</strong><small>{shipment.id} · {shipment.service}</small></div><StatusBadge status={shipment.status} /><span>{shipment.eta}</span></div>)}</div><aside className="account-menu"><h3>Quick actions</h3><Link to="/ship#quote"><Calculator /> Get a quote<ChevronRight /></Link><Link to="/locations#location-finder"><MapPin /> Find a location<ChevronRight /></Link><button onClick={reset}><RotateCcw /> Reset demo account</button></aside></div></div></section></>;
  return <section className="auth-page"><div className="auth-brand-panel"><Logo /><div><span className="eyebrow light">MY NORTHLINE</span><h1>Shipping,<br />under control.</h1><p>One workspace for shipments, addresses, invoices, reports and integrations.</p></div><div className="auth-quote"><p>“Visibility is not a feature. It’s the foundation of trust.”</p><span>Northline customer experience</span></div></div><div className="auth-form-panel"><Link to="/" className="close-auth"><X /> Back to website</Link><div className="auth-box"><span className="eyebrow">SECURE CUSTOMER AREA</span><h2>{mode === 'login' ? 'Welcome back.' : mode === 'register' ? 'Create your account.' : 'Reset your password.'}</h2><p>{mode === 'login' ? 'Enter any valid email and password to explore the demo.' : mode === 'register' ? 'Start shipping with a digital Northline account.' : 'We’ll simulate sending you a secure reset link.'}</p><form onSubmit={submit}>{mode === 'register' && <label>Full name<input required placeholder="Your name" /></label>}<label>Business email<input type="email" required placeholder="you@company.com" /></label>{mode !== 'forgot' && <label>Password<div className="password-field"><input type="password" required minLength={6} placeholder="At least 6 characters" /><Eye /></div></label>}{mode === 'login' && <button type="button" className="forgot-link" onClick={() => setMode('forgot')}>Forgot password?</button>}<button className="button button-wide">{mode === 'login' ? <>Sign in <LogIn /></> : mode === 'register' ? <>Create account <ArrowRight /></> : <>Send reset link <Mail /></>}</button></form>{mode !== 'forgot' && <p className="auth-switch">{mode === 'login' ? 'New to Northline?' : 'Already have an account?'} <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>}{mode === 'forgot' && <button className="back-link" onClick={() => setMode('login')}>Back to sign in</button>}<div className="demo-notice"><Info /><span><strong>Demo environment</strong>No credentials are transmitted or stored outside this browser.</span></div></div></div></section>;
}

const legalCopy: Record<string, { title: string; intro: string; sections: [string, string][] }> = {
  privacy: { title: 'Privacy policy', intro: 'How information is handled in this fictional demonstration.', sections: [['Information we use', 'Demo tracking and shipping data is stored in Turso. Chat prompts are processed by OpenRouter; voice requests also use its transcription and speech providers. Do not enter real personal, payment or shipment information.'], ['Local storage', 'This build stores demo account preferences and chat state in your browser. You can clear saved demo information at any time from the account dashboard or through your browser settings.'], ['Demonstration only', 'The data is fictional, and the experience is not connected to Northline, Blue Dart, OrbitLink, or a live courier network.']] },
  cookies: { title: 'Cookie notice', intro: 'A clear view of the local technologies used by this demonstration.', sections: [['Essential storage', 'This build uses browser localStorage for demo account state. It does not use advertising, analytics or cross-site tracking cookies.'], ['Your choices', 'Use the reset control in My Northline to remove stored demo preferences.']] },
  terms: { title: 'Terms and conditions', intro: 'Important information about this fictional logistics demo concept.', sections: [['Demonstration only', 'Tracking events, quotes, serviceability results, account activity and form responses are simulated. They must not be used to make real shipping decisions.'], ['Conditions of carriage', 'Real shipments are governed by the applicable current Northline or OrbitLink conditions of carriage available on their official websites.'], ['Intellectual property', 'All names used here are fictional for demonstration only.']] },
  disclaimer: { title: 'Disclaimer', intro: 'This local experience is a fictional demonstration only.', sections: [['No live services', 'No booking, tracking, payment, customer service or account request is sent to Northline.'], ['Information accuracy', 'Service details are fictional and simplified for demonstration only.']] },
};
function LegalPage() { const { page = 'terms' } = useParams(); const content = legalCopy[page] || legalCopy.terms; return <><PageHero eyebrow="LEGAL" title={content.title} copy={content.intro} theme="cream" /><section className="section"><article className="container legal-article"><div className="legal-meta"><span>LAST REVIEWED</span><strong>5 August 2026</strong></div>{content.sections.map(([title, text], index) => <section key={title}><span>0{index + 1}</span><div><h2>{title}</h2><p>{text}</p></div></section>)}</article></section></>; }

function NotFound() { return <section className="not-found"><div className="container"><span>404</span><h1>This route missed its connection.</h1><p>Let’s get you back to something useful.</p><div className="button-row"><Link className="button" to="/">Return home</Link><Link className="button button-outline" to="/track#track-form">Track a shipment</Link></div></div></section>; }

export default function App() {
  return <>
    <Routes>
    <Route path="/account"><AccountPage /></Route>
    <Route path="/"><Layout><HomePage /></Layout></Route>
    <Route path="/track"><Layout><TrackPage /></Layout></Route>
    <Route path="/ship"><Layout><ShipPage /></Layout></Route>
    <Route path="/locations"><Layout><LocationsPage /></Layout></Route>
    <Route path="/services"><Layout><ServicesPage /></Layout></Route>
    <Route path="/services/:slug"><Layout><ServiceDetailPage /></Layout></Route>
    <Route path="/business"><Layout><BusinessPage /></Layout></Route>
    <Route path="/support"><Layout><SupportPage /></Layout></Route>
    <Route path="/support/regulatory"><Layout><RegulatoryPage /></Layout></Route>
    <Route path="/about"><Layout><AboutPage /></Layout></Route>
    <Route path="/news"><Layout><NewsPage /></Layout></Route>
    <Route path="/legal/:page"><Layout><LegalPage /></Layout></Route>
    <Route><Layout><NotFound /></Layout></Route>
  </Routes>
    <Assistant />
  </>;
}
