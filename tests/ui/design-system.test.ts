import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  Button,
  StatCard,
  EmptyState,
  StatusPill,
  ProgressBar,
  Kbd,
} from '../../src/components/ui';
import { fuzzyScore } from '../../src/components/ui/CommandPalette';
import {
  formatINR,
  formatCompactINR,
  formatPercent,
  formatDate,
  formatDelta,
  parseINRInput,
} from '../../src/lib/design-tokens';

describe('design system — server render smoke', () => {
  it('renders Button variants with typed props', () => {
    const html = renderToStaticMarkup(
      createElement(Button, { variant: 'primary', size: 'lg', loading: true, loadingText: 'Working' }),
    );
    assert.ok(html.includes('Working'));
    assert.ok(html.includes('disabled'));
    assert.ok(html.includes('aria-busy="true"'));

    const danger = renderToStaticMarkup(createElement(Button, { variant: 'danger' }, 'Delete'));
    assert.ok(danger.includes('Delete'));
  });

  it('renders StatCard with dominant value and secondary figures (§229)', () => {
    const html = renderToStaticMarkup(
      createElement(StatCard, {
        label: 'Projected retirement corpus',
        value: '₹5.32 Cr',
        secondary: [
          { label: 'Required', value: '₹4.86 Cr' },
          { label: 'Surplus', value: '+₹46L', tone: 'positive' },
        ],
        size: 'hero',
      }),
    );
    assert.ok(html.includes('Projected retirement corpus'));
    assert.ok(html.includes('₹5.32 Cr'));
    assert.ok(html.includes('Required'));
    assert.ok(html.includes('+₹46L'));
  });

  it('renders EmptyState with title, description and action (§117)', () => {
    const html = renderToStaticMarkup(
      createElement(EmptyState, {
        title: 'Your client workspace is ready.',
        description: 'Add your first client to start building a wealth plan.',
        action: createElement(Button, null, 'Add Client'),
      }),
    );
    assert.ok(html.includes('Your client workspace is ready.'));
    assert.ok(html.includes('Add Client'));
  });

  it('renders accessible StatusPill with status role (§232)', () => {
    const html = renderToStaticMarkup(createElement(StatusPill, { status: 'needs-review' }));
    assert.ok(html.includes('role="status"'));
    assert.ok(html.includes('Needs review'));
  });

  it('renders ProgressBar with progressbar role and aria values (§116)', () => {
    const html = renderToStaticMarkup(createElement(ProgressBar, { value: 82, label: 'Plan health' }));
    assert.ok(html.includes('role="progressbar"'));
    assert.ok(html.includes('aria-valuenow="82"'));
  });

  it('renders Kbd chips', () => {
    const html = renderToStaticMarkup(createElement(Kbd, null, 'K'));
    assert.ok(html.includes('<kbd'));
    assert.ok(html.includes('K'));
  });
});

describe('design tokens — financial number formatting (§114)', () => {
  it('formatINR uses Indian digit grouping', () => {
    assert.equal(formatINR(85000), '₹85,000');
    assert.equal(formatINR(100000), '₹1,00,000');
    assert.equal(formatINR(0), '₹0');
    assert.equal(formatINR(Number.NaN), '₹0');
    assert.equal(formatINR(-2500), '-₹2,500');
  });

  it('formatCompactINR does intelligent lakh/crore compaction', () => {
    assert.equal(formatCompactINR(150000), '₹1.5 L');
    assert.equal(formatCompactINR(4620000), '₹46.2 L');
    assert.equal(formatCompactINR(48600000), '₹4.86 Cr');
    assert.equal(formatCompactINR(53200000), '₹5.32 Cr');
    assert.equal(formatCompactINR(68400000), '₹6.84 Cr');
    assert.equal(formatCompactINR(460000), '₹4.6 L');
    assert.equal(formatCompactINR(5000), '₹5K');
    assert.equal(formatCompactINR(999), '₹999');
    assert.equal(formatCompactINR(-150000), '-₹1.5 L');
  });

  it('formatPercent and formatDelta render signed changes', () => {
    assert.equal(formatPercent(82.44), '82.4%');
    assert.equal(formatPercent(Number.NaN), '0%');
    assert.equal(formatDelta(4600000), '+₹46 L');
    assert.equal(formatDelta(-2.34, 'percent', 1), '-2.3%');
    assert.equal(formatDelta(12, 'number', 0), '+12');
  });

  it('formatDate renders en-IN short dates', () => {
    const result = formatDate(new Date(2026, 8, 3));
    assert.ok(result.includes('3'));
    assert.ok(result.includes('2026'));
  });

  it('parseINRInput strips currency formatting', () => {
    assert.equal(parseINRInput('₹1,25,000'), 125000);
    assert.equal(parseINRInput('abc'), 0);
  });
});

describe('command palette — fuzzy search (§122)', () => {
  it('matches subsequence and ranks word prefixes higher', () => {
    assert.ok(fuzzyScore('raj', 'Raj Sharma') > 0);
    assert.ok(fuzzyScore('rs', 'Raj Sharma') > 0);
    assert.equal(fuzzyScore('xyz', 'Raj Sharma'), -1);
    // Prefix start beats mid-string match.
    assert.ok(fuzzyScore('s', 'Sharma') > fuzzyScore('s', 'Rajs'));
  });

  it('returns 0 for empty query and -1 on no match', () => {
    assert.equal(fuzzyScore('', 'anything'), 0);
    assert.equal(fuzzyScore('abc', ''), -1);
  });
});
