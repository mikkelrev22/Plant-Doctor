import { FormEvent, useEffect, useState } from 'react';

import { diagnoseLinearUploadStream } from '../api/backend-py';
import type { LinearDiagnosisResult } from '../types/backend-py';

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

const STEP_ORDER = [
  'triage',
  'vision',
  'retrieval',
  'diagnosis',
  'format',
] as const;

export function LinearDiagnosisPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [userText, setUserText] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LinearDiagnosisResult | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!imageFile) {
      setError('Please choose a plant photo to upload.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setCompletedSteps([]);
    setStatusMessage('Uploading and starting…');

    try {
      const finalResult = await diagnoseLinearUploadStream(
        {
          image: imageFile,
          user_text: userText,
        },
        {
          onStatus: (event) => setStatusMessage(event.message),
          onStep: (event) => {
            setStatusMessage(event.message);
            setCompletedSteps((prev) =>
              prev.includes(event.step) ? prev : [...prev, event.step],
            );
            setResult(event.partial);
          },
        },
      );
      setResult(finalResult);
      setStatusMessage('Done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Diagnosis failed');
    } finally {
      setLoading(false);
    }
  }

  const advice = result?.advice;
  const symptomReport = result?.symptom_report as
    | { species?: string; symptoms?: string[]; confidence?: number }
    | undefined;
  const diagnosis = result?.diagnosis as
    | {
        candidate_causes?: Array<{
          name: string;
          likelihood: number;
          rationale: string;
        }>;
      }
    | undefined;

  return (
    <section className="page">
      <header className="page-header">
        <h1>Linear diagnosis</h1>
        <p>
          Upload a plant photo and describe what you see. Each pipeline step
          streams in as it finishes.
        </p>
      </header>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <label className="file-field">
          Plant photo
          <input
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setImageFile(file);
            }}
            required
          />
        </label>

        {previewUrl ? (
          <div className="upload-preview">
            <img src={previewUrl} alt="Selected plant" />
            <p>{imageFile?.name}</p>
          </div>
        ) : null}

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

        <button type="submit" disabled={loading || !imageFile}>
          {loading ? 'Diagnosing…' : 'Run diagnosis'}
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      {(loading || completedSteps.length > 0) && (
        <article className="card result-card">
          <h2>Progress</h2>
          {statusMessage ? <p className="stream-status">{statusMessage}</p> : null}
          <ol className="step-list">
            {STEP_ORDER.map((step) => {
              const done = completedSteps.includes(step);
              const current =
                loading &&
                !done &&
                (completedSteps.length === 0
                  ? step === 'triage'
                  : STEP_ORDER[completedSteps.length] === step);
              return (
                <li
                  key={step}
                  className={
                    done ? 'step-done' : current ? 'step-current' : 'step-pending'
                  }
                >
                  {step}
                </li>
              );
            })}
          </ol>
        </article>
      )}

      {symptomReport?.species ? (
        <article className="card result-card">
          <h2>Vision</h2>
          <p>
            <strong>{symptomReport.species}</strong>
            {typeof symptomReport.confidence === 'number'
              ? ` (${Math.round(symptomReport.confidence * 100)}% confidence)`
              : null}
          </p>
          {symptomReport.symptoms && symptomReport.symptoms.length > 0 ? (
            <ul>
              {symptomReport.symptoms.map((symptom) => (
                <li key={symptom}>{symptom}</li>
              ))}
            </ul>
          ) : null}
        </article>
      ) : null}

      {diagnosis?.candidate_causes && diagnosis.candidate_causes.length > 0 ? (
        <article className="card result-card">
          <h2>Likely causes</h2>
          <ul>
            {diagnosis.candidate_causes.map((cause) => (
              <li key={cause.name}>
                <strong>{cause.name}</strong> (
                {Math.round(cause.likelihood * 100)}%) — {cause.rationale}
              </li>
            ))}
          </ul>
        </article>
      ) : null}

      {advice ? (
        <article className="card result-card">
          <h2>Advice</h2>
          <p>{advice.summary}</p>
          {advice.actions.length > 0 ? (
            <ul>
              {advice.actions.map((action) => (
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
