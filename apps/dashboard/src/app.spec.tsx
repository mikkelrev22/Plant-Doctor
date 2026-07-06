import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import App from './app';

const reportResponse = {
  plant: {
    id: 1,
    name: 'Sunny Aloe',
    notes: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
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

function renderApp() {
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
          return Promise.resolve(jsonResponse([]));
        }

        if (url.endsWith('/stress-signs')) {
          return Promise.resolve(jsonResponse([]));
        }

        if (url.endsWith('/reports/analyze')) {
          return Promise.resolve(jsonResponse(reportResponse));
        }

        if (url.endsWith('/plants/1/reports')) {
          return Promise.resolve(jsonResponse([reportResponse.report]));
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

  it('submits an image and renders the returned report', async () => {
    renderApp();

    const file = new File(['plant'], 'plant.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]');

    expect(fileInput).toBeTruthy();

    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Analyze plant' }));

    await waitFor(() => {
      expect(screen.getAllByText('Aloe Vera').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Brown / crispy tips & edges')).toBeTruthy();
  });
});
