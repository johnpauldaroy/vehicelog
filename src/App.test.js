import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

test('renders vehicle management system command center', () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1, name: /vehicle management system/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 2, name: /overview/i })).toBeInTheDocument();
});

test('submits a new vehicle request into the table', async () => {
  render(<App />);

  await userEvent.click(screen.getByRole('button', { name: /new request/i }));
  await userEvent.type(screen.getByLabelText(/purpose/i), 'Treasury document run');
  await userEvent.type(screen.getByLabelText(/destination/i), 'Calamba');
  await userEvent.click(screen.getByRole('button', { name: /submit request/i }));

  expect(screen.getByText(/vr-2026-0311-006 added to the request queue/i)).toBeInTheDocument();
  expect(screen.getByText('VR-2026-0311-006')).toBeInTheDocument();
});
