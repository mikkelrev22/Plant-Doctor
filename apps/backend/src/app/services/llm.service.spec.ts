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
  "recommendations": "Water deeply, then let soil dry.",
  "stressSigns": [
    {
      "stressSignId": "brown_crispy_tips_edges",
      "status": "present",
      "severity": "mild",
      "confidence": 90,
      "notes": "Brown dry leaf tips are visible."
    }
  ],
  "detectedRegions": 0
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
  });

  it('handles an empty JSON object by returning defaults', () => {
    const result = parsePlantAnalysis('{}');
    expect(result.identifiedPlantName).toBe('Unknown plant');
    expect(result.summary).toBe('No summary returned.');
    expect(result.stressSigns).toEqual([]);
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
});
