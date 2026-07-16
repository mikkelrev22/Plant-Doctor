import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

import App from './app';

vi.mock('../api/backend-py', () => ({
  checkBackendPyHealth: vi.fn().mockResolvedValue('Python backend is running'),
  diagnoseLinear: vi.fn(),
  diagnoseLinearUploadStream: vi.fn(),
  chatAgent: vi.fn(),
}));

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    );
    expect(baseElement).toBeTruthy();
  });

  it('should show workflow navigation', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    );

    expect(screen.getByRole('link', { name: 'Linear diagnosis' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Agent chat' })).toBeTruthy();
  });
});
