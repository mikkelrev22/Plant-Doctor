import { parsePlantAnalysis } from './llm.service';

describe('parsePlantAnalysis', () => {
  it('normalizes a fenced JSON response', () => {
    const result = parsePlantAnalysis(`\`\`\`json
{
  "identifiedPlantName": "Aloe Vera",
  "scientificName": "Aloe vera",
  "identificationConfidence": 95,
  "likelyStressors": ["water", "humidity"],
  "summary": "Generally healthy.",
  "stressSigns": [
    {
      "stressSignId": "brown_crispy_tips_edges",
      "status": "present",
      "severity": "mild",
      "confidence": 90,
      "notes": "Brown dry leaf tips are visible."
    }
  ],
  "detectedRegions": [
    {
      "stressSignId": "brown_crispy_tips_edges",
      "bbox": { "x": 0.2, "y": 0.4, "width": 0.15, "height": 0.1 }
    }
  ]
}
\`\`\``);

    expect(result.identifiedPlantName).toBe('Aloe Vera');
    expect(result.likelyStressors).toEqual(['water', 'humidity']);
    expect(result.stressSigns[0]).toEqual({
      stressSignId: 'brown_crispy_tips_edges',
      status: 'present',
      severity: 'mild',
      confidence: 90,
      notes: 'Brown dry leaf tips are visible.',
    });
    expect(result.detectedRegions).toEqual([
      {
        stressSignId: 'brown_crispy_tips_edges',
        bbox: { x: 0.2, y: 0.4, width: 0.15, height: 0.1 },
      },
    ]);
  });

  it('handles an empty JSON object by returning defaults', () => {
    const result = parsePlantAnalysis('{}');
    expect(result.identifiedPlantName).toBe('Unknown plant');
    expect(result.summary).toBe('No summary returned.');
    expect(result.stressSigns).toEqual([]);
    expect(result.detectedRegions).toEqual([]);
  });

  it('handles JSON with extra text around it', () => {
    const result = parsePlantAnalysis('Some reasoning here... { "identifiedPlantName": "Pothos" } more text here.');
    expect(result.identifiedPlantName).toBe('Pothos');
  });

  it('fails if there are multiple objects that confuse the parser', () => {
    // This is what I suspected might happen with "corrupted" responses
    const content = '{ "first": 1 } some text { "identifiedPlantName": "Pothos" }';
    // extractJsonObject will take from the FIRST { to the LAST }
    // which results in '{ "first": 1 } some text { "identifiedPlantName": "Pothos" }'
    // which is NOT valid JSON.
    expect(() => parsePlantAnalysis(content)).toThrow();
  });

  it('drops likelyStressors outside the allowed vocabulary and dedupes', () => {
    const result = parsePlantAnalysis(
      JSON.stringify({
        identifiedPlantName: 'Pothos',
        likelyStressors: ['water', 'Sunburn', 'water', 'drought', 'humidity'],
        summary: 's',
        stressSigns: [],
        detectedRegions: [],
      }),
      {
        allowedStressorIds: new Set([
          'water',
          'light',
          'nutrients',
          'pests',
          'disease',
          'humidity',
          'temperature',
          'other',
        ]),
      },
    );
    // 'Sunburn' lowercased isn't in the taxonomy; 'drought' isn't either.
    // 'water' appears twice but is deduped.
    expect(result.likelyStressors).toEqual(['water', 'humidity']);
  });

  it('drops detectedRegions with an unknown stressSignId or an invalid bbox', () => {
    const result = parsePlantAnalysis(
      JSON.stringify({
        identifiedPlantName: 'Pothos',
        likelyStressors: [],
        summary: 's',
        stressSigns: [],
        detectedRegions: [
          // valid
          {
            stressSignId: 'brown_spots_lesions',
            bbox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
          },
          // hallucinated stressSignId — dropped via allowedStressSignIds
          {
            stressSignId: 'made_up_sign',
            bbox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
          },
          // bbox out of [0,1] range — dropped
          {
            stressSignId: 'brown_spots_lesions',
            bbox: { x: -0.1, y: 0.2, width: 0.3, height: 0.4 },
          },
          // missing bbox — dropped
          { stressSignId: 'brown_spots_lesions' },
        ],
      }),
      {
        allowedStressSignIds: new Set([
          'brown_spots_lesions',
          'leaf_yellowing_chlorosis',
        ]),
      },
    );
    expect(result.detectedRegions).toEqual([
      {
        stressSignId: 'brown_spots_lesions',
        bbox: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
      },
    ]);
  });
});