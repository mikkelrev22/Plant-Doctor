import { FormEvent, useState } from 'react';

import { diagnoseLinear } from '../api/backend-py';
import type { LinearDiagnosisResult } from '../types/backend-py';

export function LinearDiagnosisPage() {
  const [imageUrl, setImageUrl] = useState('');
  const [userText, setUserText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LinearDiagnosisResult | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await diagnoseLinear({
        image_url: imageUrl,
        user_text: userText,
      });
      setResult(response.result);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : 'Diagnosis failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Linear diagnosis</h1>
        <p>
          One-shot pipeline: triage, vision, retrieval, diagnosis, and formatted
          advice.
        </p>
      </header>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <label>
          Image URL
          <input
            type="url"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="https://example.com/plant.jpg"
          />
        </label>

        <label>
          Describe your plant
          <textarea
            value={userText}
            onChange={(event) => setUserText(event.target.value)}
            placeholder="Yellowing leaves near a south-facing window. Watered weekly."
            rows={5}
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Diagnosing...' : 'Run diagnosis'}
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      {result?.advice ? (
        <article className="card result-card">
          <h2>Advice</h2>
          <p>{result.advice.summary}</p>
          {result.advice.actions.length > 0 ? (
            <ul>
              {result.advice.actions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          ) : null}
        </article>
      ) : null}

      {result ? (
        <details className="card">
          <summary>Pipeline details</summary>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </details>
      ) : null}
    </section>
  );
}
