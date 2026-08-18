import { describe, expect, it } from 'vitest';
import { looksLikeABriefing, polishReply } from './replies';

describe('assistant replies', () => {
  it('rejects markdown briefings', () => {
    expect(looksLikeABriefing('| Service | Price |\n|---|---|\n| Air | 516 |')).toBe(true);
    expect(looksLikeABriefing('It’s on the way to Delhi — due tomorrow by noon.')).toBe(false);
  });

  it('keeps tracking captions short and human', () => {
    const reply = polishReply('long', [{
      name: 'track_shipment',
      label: 'Tracked NL123456789',
      output: {
        results: [{ found: true, status: 'In transit', destination: 'New Delhi, DL', eta: 'Tomorrow, by 12:00 PM' }],
      },
    }]);
    expect(reply).toMatch(/on its way to New Delhi/i);
    expect(reply).not.toContain('NL123456789');
  });

  it('replaces a briefing with a short caption from the quote tool', () => {
    const reply = polishReply('Here is a table\n| Service | Price |\n|---|---|\n', [{
      name: 'get_quote',
      label: 'Quoted Mumbai → Delhi',
      output: {
        from: 'Mumbai',
        to: 'Delhi',
        options: [
          { service: 'Domestic Priority', price: 516, badge: 'Fastest' },
          { service: 'Northline Surface', price: 282, badge: 'Best value' },
        ],
      },
    }]);
    expect(reply).toContain('Mumbai to Delhi');
    expect(reply).not.toContain('|');
    expect(reply.length).toBeLessThan(180);
  });

  it('defers item eligibility when only a general guide was used', () => {
    const reply = polishReply('These can’t travel with us.', [{
      name: 'get_shipping_guide',
      label: 'Opened restricted guide',
      output: { title: 'Banned and restricted commodities', points: ['Firearms'] },
    }], 'Can I ship a motorcycle?');
    expect(reply).toContain('contact customer support by email');
  });
});
