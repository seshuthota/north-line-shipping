import { Link } from 'wouter';
import { ArrowRight, Clock3, MapPin, Phone, Truck } from 'lucide-react';
import type { AssistantToolCall } from './tools';

function rupees(value: number) {
  return `₹${value.toLocaleString('en-IN')}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function quoteToolHref(data: Record<string, unknown>) {
  const params = new URLSearchParams();
  for (const key of ['mode', 'from', 'to', 'actualWeightKg']) {
    const value = data[key];
    if (value !== undefined && value !== null && String(value)) {
      params.set(key === 'actualWeightKg' ? 'weight' : key, String(value));
    }
  }
  return `/ship?${params.toString()}#quote`;
}

function QuoteCards({ data }: { data: Record<string, unknown> }) {
  const options = Array.isArray(data.options) ? data.options as { service: string; eta: string; price: number; badge?: string }[] : [];
  if (!options.length) return null;
  return (
    <div className="assist-card">
      <div className="assist-card-kicker">{String(data.from)} → {String(data.to)} · {String(data.chargeableWeightKg)} kg</div>
      <div className="assist-quote-list">
        {options.map((option) => (
          <div className="assist-quote-row" key={option.service}>
            <div>
              <strong>{option.service}</strong>
              <small>{option.eta}</small>
            </div>
            <div className="assist-quote-price">
              {option.badge && <span>{option.badge}</span>}
              <b>{rupees(option.price)}</b>
            </div>
          </div>
        ))}
      </div>
      <Link className="assist-card-link" to={quoteToolHref(data)}>See the quote tool <ArrowRight size={14} /></Link>
    </div>
  );
}

function cityName(place: unknown) {
  return String(place ?? '').split(',')[0];
}

function TrackCard({ hit }: { hit: Record<string, unknown> }) {
  const status = String(hit.status);
  const slug = status.toLowerCase().replace(' ', '-');
  const events = Array.isArray(hit.events) ? hit.events as { title: string; location: string; time: string; complete: boolean }[] : [];
  const last = [...events].reverse().find((event) => event.complete);
  const next = events.find((event) => !event.complete);
  return (
    <div className="assist-card assist-track">
      <div className="assist-track-top">
        <span className={`status ${slug}`}>{status}</span>
        <small>{String(hit.id)}</small>
      </div>
      <div className="assist-track-route">
        <span>{cityName(hit.origin)}</span>
        <span className="assist-track-line"><Truck size={13} /></span>
        <span>{cityName(hit.destination)}</span>
      </div>
      <div className="assist-track-eta">
        <Clock3 size={13} />
        <span>{status === 'Delivered' ? 'Delivered' : 'Arrives'} <strong>{String(hit.eta)}</strong></span>
      </div>
      {last && (
        <div className="assist-scan">
          <small>Last scan</small>
          <strong>{last.title}</strong>
          <span>{last.location} · {last.time}</span>
        </div>
      )}
      {next && status !== 'Delivered' && (
        <div className="assist-scan next">
          <small>Next</small>
          <strong>{next.title}</strong>
          <span>{next.location} · {next.time}</span>
        </div>
      )}
      {events.length > 0 && (
        <div className="assist-track-steps" aria-hidden="true">
          {events.map((event, index) => <i key={`${event.title}-${index}`} className={event.complete ? 'done' : ''} />)}
        </div>
      )}
      <div className="assist-card-actions">
        <Link className="assist-card-link" to={String(hit.href || `/track?q=${hit.id}`)}>See the journey <ArrowRight size={14} /></Link>
        {(status === 'Exception' || status === 'Delayed') && (
          <Link className="assist-card-link" to="/support#contact">Get help <ArrowRight size={14} /></Link>
        )}
      </div>
    </div>
  );
}

function TrackCards({ data }: { data: Record<string, unknown> }) {
  const results = Array.isArray(data.results) ? data.results as Record<string, unknown>[] : [];
  const hits = results.filter((item) => item.found);
  if (!hits.length) return null;
  return <>{hits.map((hit) => <TrackCard key={String(hit.id)} hit={hit} />)}</>;
}

function LocationCard({ data }: { data: Record<string, unknown> }) {
  const places = Array.isArray(data.locations) ? data.locations as Record<string, unknown>[] : [];
  const place = places[0];
  if (!place) return null;
  return (
    <div className="assist-card">
      <div className="assist-card-kicker">Pickup & delivery</div>
      <strong>{String(place.city)} · {String(place.pin)}</strong>
      <p>{String(place.address)}</p>
      <div className="assist-meta"><Clock3 size={13} /> {String(place.hours)}</div>
      <div className="assist-meta"><Phone size={13} /> {String(place.phone)}</div>
      <Link className="assist-card-link" to="/locations#location-finder">Open location finder <ArrowRight size={14} /></Link>
    </div>
  );
}

function GuideCard({ data }: { data: Record<string, unknown> }) {
  const points = Array.isArray(data.points) ? data.points as string[] : [];
  return (
    <div className="assist-card">
      <div className="assist-card-kicker">Shipping guide</div>
      <strong>{String(data.title)}</strong>
      <ul>{points.slice(0, 4).map((point) => <li key={point}>{point}</li>)}</ul>
      {typeof data.href === 'string' && <Link className="assist-card-link" to={data.href}>Read the guide <ArrowRight size={14} /></Link>}
    </div>
  );
}

function ServiceCards({ data }: { data: Record<string, unknown> }) {
  const list = Array.isArray(data.services) ? data.services as { name: string; eyebrow: string; href: string; summary: string }[] : [];
  if (!list.length) return null;
  return (
    <div className="assist-card">
      {list.slice(0, 3).map((service) => (
        <Link className="assist-service-row" key={service.href} to={service.href}>
          <span>{service.eyebrow}</span>
          <strong>{service.name}</strong>
        </Link>
      ))}
    </div>
  );
}

function SupportCard({ data }: { data: Record<string, unknown> }) {
  return (
    <div className="assist-card">
      <div className="assist-card-kicker">Customer service</div>
      <strong>{String(data.phone)}</strong>
      <div className="assist-meta"><Clock3 size={13} /> {String(data.hours)}</div>
      <Link className="assist-card-link" to={String(data.href || '/support#contact')}>Talk to support <ArrowRight size={14} /></Link>
    </div>
  );
}

export function SupportFallbackCard({ question = '' }: { question?: string }) {
  const params = new URLSearchParams();
  if (question.trim()) {
    params.set('message', `I need help confirming this shipment question:\n${question.trim()}`);
  }
  params.set('topic', 'Feedback');
  const href = `/support?${params.toString()}#contact`;
  return (
    <div className="assist-card">
      <div className="assist-card-kicker">Customer support</div>
      <strong>1800 555 0142</strong>
      <div className="assist-meta"><Clock3 size={13} /> Mon–Sat · 8 AM–8 PM</div>
      <Link className="assist-card-link" to={href}>Open pre-filled support form <ArrowRight size={14} /></Link>
    </div>
  );
}

export function ToolResultCards({ tools, suppressGuides = false }: { tools?: AssistantToolCall[]; suppressGuides?: boolean }) {
  if (!tools?.length) return null;
  return (
    <div className="assist-results">
      {tools.map((tool, index) => {
        const data = asRecord(tool.output);
        if (!data) return null;
        const key = `${tool.name}-${index}`;
        if (tool.name === 'get_quote') return <QuoteCards key={key} data={data} />;
        if (tool.name === 'track_shipment') return <TrackCards key={key} data={data} />;
        if (tool.name === 'find_locations') return <LocationCard key={key} data={data} />;
        if (tool.name === 'get_shipping_guide') return suppressGuides ? null : <GuideCard key={key} data={data} />;
        if (tool.name === 'lookup_services') return <ServiceCards key={key} data={data} />;
        if (tool.name === 'get_support_info') return <SupportCard key={key} data={data} />;
        return null;
      })}
    </div>
  );
}

export function EmptyLocationNote({ tools }: { tools?: AssistantToolCall[] }) {
  const miss = tools?.find((tool) => tool.name === 'find_locations' && asRecord(tool.output)?.count === 0);
  if (!miss) return null;
  return (
    <p className="assist-empty-note">
      <MapPin size={14} /> This demo only covers a few metros. Try Mumbai, Delhi, or Bengaluru.
    </p>
  );
}
