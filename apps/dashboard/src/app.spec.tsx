import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import App from './app';

const plantResponse = {
  id: 1,
  name: 'Sunny Aloe',
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const reportResponse = {
  plant: plantResponse,
  report: {
    id: 10,
    plantId: 1,
    plantName: 'Sunny Aloe',
    reportedAt: new Date().toISOString(),
    identifiedPlantName: 'Aloe Vera',
    scientificName: 'Aloe vera',
    identificationConfidence: 95,
    likelyStressors: ['water'],
    summary: 'The plant is generally healthy.',
    recommendations: 'Let soil dry between waterings.',
    photo: null,
    stressSigns: [
      {
        stressSignId: 'brown_crispy_tips_edges',
        name: 'Brown / crispy tips & edges',
        status: 'present',
        severity: 'mild',
        confidence: 90,
        notes: 'Brown tips are visible.',
        variables: [{ id: 'water', name: 'water' }],
      },
    ],
    llmRequest: {
      id: 5,
      action: 'plant_report_analysis',
      provider: 'openai-compatible',
      model: 'test-model',
      latencyMs: 250,
      error: null,
      createdAt: new Date().toISOString(),
    },
  },
};

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function renderApp(initialPath = '/') {
  window.history.pushState({}, '', initialPath);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe('App', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);

        if (url.endsWith('/plants')) {
          return Promise.resolve(jsonResponse([plantResponse]));
        }

        if (url.endsWith('/plants/1')) {
          return Promise.resolve(jsonResponse(plantResponse));
        }

        if (url.endsWith('/plants/1/reports')) {
          return Promise.resolve(jsonResponse([reportResponse.report]));
        }

        if (url.endsWith('/reports/10')) {
          return Promise.resolve(jsonResponse(reportResponse.report));
        }

        if (url.endsWith('/reports/analyze')) {
          return Promise.resolve(jsonResponse(reportResponse));
        }

        return Promise.resolve(jsonResponse({}));
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should render successfully', () => {
    const { baseElement } = renderApp();
    expect(baseElement).toBeTruthy();
  });

  it('should render home page', () => {
    renderApp('/');
    expect(screen.getByText('New Plant Analysis')).toBeTruthy();
  });

  it('should render plant page with plant name', async () => {
    renderApp('/plant/1');
    await waitFor(() => {
      expect(screen.getByText('Sunny Aloe')).toBeTruthy();
    });
  });

  it('submits an image and navigates to report page', async () => {
    renderApp('/plant/1');

    await waitFor(() => {
      expect(screen.getByText('Sunny Aloe')).toBeTruthy();
    });

    const file = new File(['plant'], 'plant.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]');

    expect(fileInput).toBeTruthy();

    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze plant' }));

    await waitFor(() => {
      expect(window.location.pathname).toBe('/report/10');
    });
  });

  it('should highlight the active plant in the sidebar', async () => {
    renderApp('/plant/1');
    await waitFor(() => {
      const activeLink = screen.getByRole('link', { name: 'Sunny Aloe' });
      expect(activeLink.getAttribute('data-active')).toBe('true');
    });
  });
});
