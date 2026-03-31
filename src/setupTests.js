// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

jest.mock('react-calendar', () => {
  const React = require('react');

  return function MockCalendar() {
    return React.createElement('div', { 'data-testid': 'mock-calendar' });
  };
});
