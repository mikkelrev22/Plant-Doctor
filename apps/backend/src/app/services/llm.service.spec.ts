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
});
