import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import App from './app';

// --- Mock fixtures matching @plant-doctor/api-types DTOs -------------------

const plant = {
  id: 1,
  name: 'Sunny Aloe',
  species: 'Aloe vera',
  notes: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// GET /plants — plant list used by the eval-results page's plant switcher.
const plantListItem = {
  ...plant,
  thumbnailUrl: null,
  reportCount: 1,
  latestReportStressSigns: [],
};

// GET /plants/evals — eval plant list with the LLM models used per plant.
const plantEvalItem = { ...plantListItem, models: ['test-model'] };

// A single stress sign shared by the eval + detail reports below.
const stressSign = {
  stressSignId: 'brown_crispy_tips_edges',
  name: 'Brown / crispy tips & edges',
  status: 'present',
  severity: 'mild',
  confidence: 90,
  notes: 'Brown tips are visible.',
  variables: [{ id: 'water', name: 'water' }],
};

// GET /plants/:id/reports/eval — one row in an eval results table.
const evalReport = {
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
  stressSigns: [stressSign],
  llmRequest: {
    id: 5,
    provider: 'openai-compatible',
    model: 'test-model',
    latencyMs: 250,
    promptTokens: 100,
    completionTokens: 50,
    totalTokens: 150,
    cachedTokens: null,
    temperature: 0.05,
    reasoningEffort: 'none',
    error: null,
    createdAt: new Date().toISOString(),
  },
};

// GET /reports/:id — the report detail page payload (summary LLM request).
const reportDetail = {
  ...evalReport,
  llmRequest: {
    id: 5,
    action: 'plant_report_analysis',
    provider: 'openai-compatible',
    model: 'test-model',
    latencyMs: 250,
    error: null,
    createdAt: new Date().toISOString(),
  },
};

// GET /llm-requests/:id — raw LLM response parsed for detected regions. null
// response → no region overlay, so ReportView renders the empty-photo state.
const llmRequestDetail = {
  id: 5,
  action: 'plant_report_analysis',
  provider: 'openai-compatible',
  model: 'test-model',
  latencyMs: 250,
  error: null,
  createdAt: new Date().toISOString(),
  plantId: 1,
  plantReportId: 10,
  prompt: '',
  response: null,
  requestMetadata: null,
  responseMetadata: null,
};

// POST /reports/analyze — the analyze-mutation response (plant + new report).
const analyzeResponse = { plant, report: reportDetail };

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Route every backend call the dashboard makes. The api layer prefixes paths
// with config.backendUrl (defaults to `/api`), so strip that prefix to get the
// logical path, then dispatch by path. Unknown paths resolve to `{}` so any
// incidental query (e.g. /config/llm) succeeds without surfacing an error.
function routeFetch(input: RequestInfo | URL) {
  const path = new URL(String(input), window.location.origin).pathname.replace(
    /^\/api/,
    '',
  );

  switch (path) {
    case '/plants':
      return jsonResponse([plantListItem]);
    case '/plants/evals':
      return jsonResponse([plantEvalItem]);
    case '/plants/1':
      return jsonResponse(plant);
    case '/plants/1/reports/eval':
      return jsonResponse([evalReport]);
    case '/reports/10':
      return jsonResponse(reportDetail);
    case '/reports/analyze':
      return jsonResponse(analyzeResponse);
    case '/config/llm':
      return jsonResponse({ model: 'test-model' });
    case '/llm-requests/5':
      return jsonResponse(llmRequestDetail);
    default:
      return jsonResponse({});
  }
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
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => routeFetch(input)));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should render successfully', () => {
    const { baseElement } = renderApp();
    expect(baseElement).toBeTruthy();
  });

  it('should render the eval home page', async () => {
    renderApp('/');
    // EvalPage title + run button.
    expect(screen.getByText('Run new evaluation')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Run evaluation' })).toBeTruthy();
  });

  it('should list plants with reports in the eval history', async () => {
    renderApp('/');
    // PlantEvalHistory renders a row (with a link to /eval/:id) per plant that
    // has reports. The row fetches that plant's eval reports to score it.
    await waitFor(() => {
      expect(screen.getByText('Sunny Aloe')).toBeTruthy();
    });
    const link = screen.getByRole('link', { name: 'Sunny Aloe' });
    expect(link.getAttribute('href')).toBe('/eval/1');
  });

  it('should render the eval results page for a plant', async () => {
    renderApp('/eval/1');
    // PlantNameEditor heading + the "New evaluation" link back to home.
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sunny Aloe' })).toBeTruthy();
    });
    expect(screen.getByText('Upload new photo of Sunny Aloe')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'New evaluation' })).toBeTruthy();
    // The results table renders a link to the report detail page.
    expect(screen.getByRole('link', { name: '#10' })).toBeTruthy();
  });

  it('uploads a new photo and navigates to the report page', async () => {
    renderApp('/eval/1');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sunny Aloe' })).toBeTruthy();
    });

    const file = new File(['plant'], 'plant.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeTruthy();

    // AnalysisForm auto-submits on drop: setting the file fires the analyze
    // mutation, whose onSuccess navigates to /report/:id.
    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(window.location.pathname).toBe('/report/10');
    });
  });

  it('should render the report page with a back link to the plant', async () => {
    renderApp('/report/10');
    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: /Back to Sunny Aloe/ }),
      ).toBeTruthy();
    });
    expect(screen.getByText('Aloe Vera')).toBeTruthy();
  });
});