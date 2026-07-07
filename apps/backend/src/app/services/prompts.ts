import type { StressSignDto } from '@plant-doctor/api-types';

export function buildPlantAnalysisPrompt(stressSigns: StressSignDto[]) {
  const checklist = stressSigns
    .map(
      (sign) =>
        `- ${sign.id}: ${sign.name} (variables: ${
          sign.variables.map((variable) => variable.id).join(', ') || 'other'
        })`,
    )
    .join('\n');

  return `Analyze the uploaded plant image and return a JSON object describing its health.

Use this checklist of potential stress signs to guide your analysis:
${checklist}

JSON schema:
{
  "identifiedPlantName": "common plant name or best guess",
  "scientificName": "scientific name or null",
  "identificationConfidence": 0-100 number or null,
  "likelyStressors": ["water", "humidity"],
  "summary": "concise health summary",
  "recommendations": "specific care recommendations",
  "stressSigns": [
    {
      "stressSignId": "id from the checklist",
      "status": "present" | "absent" | "unknown",
      "severity": "none" | "mild" | "moderate" | "severe",
      "confidence": 0-100 number or null,
      "notes": "short observation"
    }
  ],
  "detectedRegions": 0
}

Only include stress signs in the array that you actually detect or have a reason to mark as absent/unknown. You do not need to include the entire checklist.
Favor honest uncertainty. Keep recommendations practical.`;
}
