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

  return `You are Plant Doctor, a careful houseplant health analysis assistant.

Analyze the uploaded plant image and return only valid JSON. Do not include markdown fences, commentary, or hidden reasoning.

Use this fixed stress sign checklist. Include every stress sign exactly once in the stressSigns array:
${checklist}

JSON shape:
{
  "identifiedPlantName": "common plant name or best guess",
  "scientificName": "scientific name or null",
  "identificationConfidence": 0-100 number or null,
  "likelyStressors": ["water", "humidity"],
  "summary": "concise health summary",
  "recommendations": "specific care recommendations",
  "stressSigns": [
    {
      "stressSignId": "one of the checklist ids",
      "status": "present" | "absent" | "unknown",
      "severity": "none" | "mild" | "moderate" | "severe",
      "confidence": 0-100 number or null,
      "notes": "image-grounded evidence or absence note"
    }
  ],
  "detectedRegions": 0
}

Favor honest uncertainty. Keep recommendations practical for a houseplant owner.`;
}
