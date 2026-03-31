import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the login screen for unauthenticated users', () => {
  render(<App />);

  expect(screen.getByAltText(/vehicle management system/i)).toBeInTheDocument();
  expect(screen.getByText(/secure branch access/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument();
});
