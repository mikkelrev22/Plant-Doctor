import { FormEvent, useEffect, useState } from 'react';

import type { CareContext } from '../types/backend-py';

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

const UNKNOWN = { value: 'unknown', label: 'Not sure' } as const;

type CareField = keyof CareContext;

type CareOption = { value: string; label: string };

type CareSection = {
  title: string;
  description: string;
  fields: Array<{
    key: CareField;
    label: string;
    hint?: string;
    /** denser option lists use a select; short lists use buttons */
    control?: 'buttons' | 'select';
    options: CareOption[];
  }>;
};

const CARE_SECTIONS: CareSection[] = [
  {
    title: 'Light',
    description:
      'How bright the indoor spot is, which way the window faces, how far the plant sits from it, and roughly how long it gets light.',
    fields: [
      {
        key: 'light_intensity',
        label: 'How much light does it get?',
        options: [
          { value: 'low', label: 'Low / dim' },
          { value: 'medium', label: 'Medium' },
          { value: 'bright_indirect', label: 'Bright indirect' },
          { value: 'direct_sun', label: 'Direct sun' },
          UNKNOWN,
        ],
      },
      {
        key: 'window_direction',
        label: 'Nearest window faces…',
        control: 'select',
        options: [
          { value: 'north', label: 'North' },
          { value: 'northeast', label: 'Northeast' },
          { value: 'east', label: 'East' },
          { value: 'southeast', label: 'Southeast' },
          { value: 'south', label: 'South' },
          { value: 'southwest', label: 'Southwest' },
          { value: 'west', label: 'West' },
          { value: 'northwest', label: 'Northwest' },
          { value: 'no_window', label: 'No nearby window' },
          { value: 'grow_light', label: 'Grow light only' },
          UNKNOWN,
        ],
      },
      {
        key: 'distance_from_window',
        label: 'How far from that window?',
        options: [
          { value: 'on_sill', label: 'On the sill' },
          { value: 'within_3ft', label: 'Within ~3 ft / 1 m' },
          { value: '3_to_6ft', label: 'About 3–6 ft / 1–2 m' },
          { value: 'across_room', label: 'Across the room' },
          { value: 'no_window', label: 'No window' },
          UNKNOWN,
        ],
      },
      {
        key: 'daily_light_hours',
        label: 'Rough light per day',
        options: [
          { value: 'under_4h', label: 'Under 4 hours' },
          { value: '4_to_6h', label: '4–6 hours' },
          { value: '6_to_8h', label: '6–8 hours' },
          { value: 'over_8h', label: 'Over 8 hours' },
          UNKNOWN,
        ],
      },
    ],
  },
  {
    title: 'Water',
    description: 'How much, how often, what kind, and from top or bottom.',
    fields: [
      {
        key: 'water_amount',
        label: 'How much water each time?',
        options: [
          { value: 'light', label: 'Light (dampen soil)' },
          { value: 'moderate', label: 'Moderate' },
          { value: 'heavy', label: 'Heavy (soak thoroughly)' },
          UNKNOWN,
        ],
      },
      {
        key: 'watering_frequency',
        label: 'How often do you water?',
        control: 'select',
        options: [
          { value: 'daily', label: 'Daily' },
          { value: 'every_2_3_days', label: 'Every 2–3 days' },
          { value: 'weekly', label: 'Weekly' },
          { value: 'every_2_weeks', label: 'Every 2 weeks' },
          { value: 'monthly_or_less', label: 'Monthly or less' },
          { value: 'when_soil_dry', label: 'When soil feels dry' },
          UNKNOWN,
        ],
      },
      {
        key: 'water_type',
        label: 'What kind of water?',
        options: [
          { value: 'tap', label: 'Tap' },
          { value: 'filtered', label: 'Filtered' },
          { value: 'distilled', label: 'Distilled' },
          { value: 'rain', label: 'Rain / collected' },
          { value: 'bottled', label: 'Bottled' },
          UNKNOWN,
        ],
      },
      {
        key: 'watering_method',
        label: 'How do you water?',
        options: [
          { value: 'top', label: 'From the top' },
          { value: 'bottom', label: 'From the bottom' },
          { value: 'both', label: 'Both / varies' },
          UNKNOWN,
        ],
      },
    ],
  },
  {
    title: 'Soil',
    description: 'How wet it feels now, and how well the pot drains.',
    fields: [
      {
        key: 'soil_moisture',
        label: 'Is the soil wet right now?',
        options: [
          { value: 'dry', label: 'Dry' },
          { value: 'slightly_moist', label: 'Slightly moist' },
          { value: 'moist', label: 'Moist' },
          { value: 'wet', label: 'Wet / soggy' },
          UNKNOWN,
        ],
      },
      {
        key: 'soil_drainage',
        label: 'Does the soil drain well?',
        options: [
          { value: 'poor', label: 'Poor (stays wet)' },
          { value: 'average', label: 'Average' },
          { value: 'good', label: 'Good (drains quickly)' },
          UNKNOWN,
        ],
      },
    ],
  },
  {
    title: 'Climate',
    description: 'Typical temperature and humidity around the plant.',
    fields: [
      {
        key: 'temperature',
        label: 'Typical temperature',
        options: [
          { value: 'cool', label: 'Cool (< 60°F / 15°C)' },
          { value: 'room', label: 'Room (60–75°F / 15–24°C)' },
          { value: 'warm', label: 'Warm (> 75°F / 24°C)' },
          { value: 'variable', label: 'Variable / drafts' },
          UNKNOWN,
        ],
      },
      {
        key: 'humidity',
        label: 'Is it humid?',
        options: [
          { value: 'low', label: 'Low (dry air)' },
          { value: 'average', label: 'Average' },
          { value: 'high', label: 'High' },
          UNKNOWN,
        ],
      },
    ],
  },
];

const CARE_FIELDS = CARE_SECTIONS.flatMap((section) => section.fields);

const EMPTY_CARE: CareContext = {
  light_intensity: '',
  window_direction: '',
  distance_from_window: '',
  daily_light_hours: '',
  water_amount: '',
  watering_frequency: '',
  water_type: '',
  watering_method: '',
  soil_moisture: '',
  soil_drainage: '',
  temperature: '',
  humidity: '',
};

function careComplete(care: CareContext): boolean {
  return CARE_FIELDS.every((field) => Boolean(care[field.key]));
}

function optionLabel(fieldKey: CareField, value: string): string {
  const field = CARE_FIELDS.find((item) => item.key === fieldKey);
  return field?.options.find((option) => option.value === value)?.label ?? value;
}

export function LinearDiagnosisPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [care, setCare] = useState<CareContext>(EMPTY_CARE);
  const [comments, setComments] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    imageName: string | null;
    care: CareContext;
    comments: string;
  } | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  function setCareField(key: CareField, value: string) {
    setCare((prev) => ({ ...prev, [key]: value }));
    setDraft(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!imageFile) {
      setError('Please choose a plant photo to upload.');
      return;
    }
    if (!careComplete(care)) {
      setError('Please answer every care question (Not sure is fine).');
      return;
    }

    setError(null);
    setDraft({
      imageName: imageFile.name,
      care: { ...care },
      comments: comments.trim(),
    });
  }

  const answeredCount = CARE_FIELDS.filter((field) => Boolean(care[field.key])).length;
  const canSubmit = Boolean(imageFile) && careComplete(care);

  return (
    <section className="page">
      <header className="page-header">
        <h1>Linear diagnosis</h1>
        <p>
          Upload a plant photo and answer each care question with the buttons or
          menus below. Free-text answers are not used for care details — pick an
          option, or choose Not sure. Nothing is sent to the server yet; submit
          only previews what you selected.
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
              setDraft(null);
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

        <p className="field-hint care-progress">
          Care answers: {answeredCount} / {CARE_FIELDS.length}
        </p>

        {CARE_SECTIONS.map((section) => (
          <fieldset key={section.title} className="care-fieldset">
            <legend>{section.title}</legend>
            <p className="field-hint">{section.description}</p>

            {section.fields.map((field) => {
              const control = field.control ?? 'buttons';
              return (
                <div key={field.key} className="care-field">
                  <span className="care-field-label" id={`${field.key}-label`}>
                    {field.label}
                  </span>
                  {field.hint ? (
                    <span className="field-hint">{field.hint}</span>
                  ) : null}

                  {control === 'select' ? (
                    <select
                      aria-labelledby={`${field.key}-label`}
                      value={care[field.key]}
                      onChange={(event) =>
                        setCareField(field.key, event.target.value)
                      }
                      required
                    >
                      <option value="" disabled>
                        Choose one…
                      </option>
                      {field.options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div
                      className="choice-group"
                      role="group"
                      aria-labelledby={`${field.key}-label`}
                    >
                      {field.options.map((option) => {
                        const selected = care[field.key] === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            className={
                              selected
                                ? 'choice-option selected'
                                : 'choice-option'
                            }
                            aria-pressed={selected}
                            onClick={() => setCareField(field.key, option.value)}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </fieldset>
        ))}

        <label>
          Comments
          <span className="field-hint">
            Optional free text for symptoms or recent changes — not a substitute
            for the care questions above.
          </span>
          <textarea
            value={comments}
            onChange={(event) => {
              setComments(event.target.value);
              setDraft(null);
            }}
            placeholder="e.g. Leaves yellowing from the tips after I moved it."
            rows={4}
          />
        </label>

        <button type="submit" disabled={!canSubmit}>
          Preview answers (no upload yet)
        </button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      {draft ? (
        <article className="card result-card">
          <h2>Draft (local only)</h2>
          <p className="field-hint">
            These values would be sent with a diagnosis later. Nothing left this
            browser.
          </p>
          <dl className="care-draft-list">
            <div>
              <dt>Photo</dt>
              <dd>{draft.imageName ?? '—'}</dd>
            </div>
            {CARE_FIELDS.map((field) => (
              <div key={field.key}>
                <dt>{field.label}</dt>
                <dd>{optionLabel(field.key, draft.care[field.key])}</dd>
              </div>
            ))}
            {draft.comments ? (
              <div>
                <dt>Comments</dt>
                <dd>{draft.comments}</dd>
              </div>
            ) : null}
          </dl>
        </article>
      ) : null}
    </section>
  );
}
