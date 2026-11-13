import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { Repeater } from './Repeater';

test('opens a repeated row with the keyboard', async () => {
  const user = userEvent.setup();
  render(
    <Repeater
      items={[{ id: 'reserve', name: 'Liquidity reserve' }]}
      getKey={(item) => item.id}
      renderSummary={(item) => <span>{item.name}</span>}
      renderEditor={() => <label>Reserve note<input /></label>}
      onAdd={vi.fn()}
      addLabel="Add reserve"
    />,
  );

  const row = screen.getByRole('button', { name: 'Liquidity reserve' });
  await user.tab();
  expect(document.activeElement).toBe(row);

  await user.keyboard('{Enter}');
  expect(screen.getByLabelText('Reserve note')).toBeTruthy();
});
