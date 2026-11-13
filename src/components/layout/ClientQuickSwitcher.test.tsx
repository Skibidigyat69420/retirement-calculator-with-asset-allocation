import { render } from '@testing-library/react';
import { createAgent } from '@ui-sdk/react/agent';
import { MemoryRouter } from 'react-router-dom';
import { expect, test, vi } from 'vitest';
import { ClientQuickSwitcher } from './ClientQuickSwitcher';

const updateClient = vi.fn();
const loadPersona = vi.fn();
const showToast = vi.fn();

vi.mock('../../context/CalculatorContext', () => ({
  useCalculator: () => ({
    inputs: { client: { name: 'Sample Household', email: 'sample@example.com' } },
    updateClient,
    loadPersona,
    showToast,
  }),
}));

vi.mock('../../lib/crm', () => ({
  getCRMClients: () => [
    {
      id: 'sample-household',
      name: 'Sample Household',
      email: 'sample@example.com',
      tier: 'Affluent',
      stage: 'Active Mandate',
      status: 'Active',
      assignedPractitioners: [],
      financialSummary: { netWorth: 6900000 },
    },
    {
      id: 'mehta-household',
      name: 'Aarav Mehta',
      email: 'aarav@example.com',
      tier: 'HNI',
      stage: 'Risk Profiling',
      status: 'Active',
      assignedPractitioners: [],
      financialSummary: { netWorth: 12500000 },
    },
  ],
  getActiveCRMClient: () => ({
    id: 'sample-household',
    name: 'Sample Household',
    tier: 'Affluent',
    stage: 'Active Mandate',
    financialSummary: { netWorth: 6900000 },
  }),
  setActiveCRMClient: vi.fn(),
}));

vi.mock('../../lib/personas', () => ({ PERSONAS: [] }));

test('exposes a named, agent-operable active household picker', async () => {
  const agent = createAgent();
  render(<MemoryRouter><ClientQuickSwitcher /></MemoryRouter>);

  const components = agent.snapshot().filter((entry) => !entry.offPage && entry.component !== 'more');
  for (const component of components) {
    expect(component.label, `${component.component} ${component.ref} has no name`).toBeTruthy();
  }

  expect(components.map((component) => component.label)).toContain('Active household');
  const result = await agent.act({
    steps: [{ ref: 'Active household', action: 'setValue', args: ['mehta-household'] }],
  });

  expect(result.ok, result.error?.message).toBe(true);
  expect(updateClient).toHaveBeenCalledWith({
    name: 'Aarav Mehta',
    email: 'aarav@example.com',
    phone: '',
  });
  expect(showToast).toHaveBeenCalledWith('Active household set to Aarav Mehta', 'info');
});
