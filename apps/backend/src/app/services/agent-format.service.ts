import type {
  PlantDto,
  PlantListItemDto,
  PlantReportExtendedDto,
  ReportStressSignDto,
} from '@plant-doctor/api-types';

/**
 * Plain-text formatters for the /agent endpoints. The agent works in natural
 * language, so these turn the existing report/plant DTOs into readable text
 * server-side — the agent never receives structured JSON for tool results.
 *
 * These are pure functions over DTOs (no DB access); the orchestrating service
 * in `agent-tools.service.ts` fetches the data and feeds it in.
 */

/** `YYYY-MM-DD` from an ISO timestamp — deterministic, no timezone surprises. */
function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function titleCase(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function isPresent(sign: ReportStressSignDto): boolean {
  return sign.status === 'present';
}

// Only signs the LLM evaluated with a concrete verdict. The extended report DTO
// carries every checklist sign (left-joined), so unevaluated/`unknown` signs
// must be filtered out — the agent only cares about present vs absent.
function evaluatedSigns(signs: ReportStressSignDto[]): ReportStressSignDto[] {
  return signs
    .filter((s) => s.status === 'present' || s.status === 'absent')
    .sort(
      (a, b) =>
        Number(isPresent(b)) - Number(isPresent(a)) ||
        a.name.localeCompare(b.name),
    );
}

function indent(block: string, prefix: string): string {
  return block
    .split('\n')
    .map((line) => prefix + line)
    .join('\n');
}

function formatSignWithNotes(sign: ReportStressSignDto): string {
  const severity = sign.status === 'absent' ? '' : ` (${sign.severity})`;
  const confidence =
    sign.confidence != null ? `, ${sign.confidence}% confidence` : '';
  const notes = sign.notes?.trim() ? ` — ${sign.notes.trim()}` : '';
  return `- ${titleCase(sign.status)}${severity}: ${sign.name}${confidence}${notes}`;
}

function formatSignBrief(sign: ReportStressSignDto): string {
  const severity = sign.status === 'absent' ? '' : ` (${sign.severity})`;
  return `- ${titleCase(sign.status)}${severity}: ${sign.name}`;
}

function formatStressSigns(signs: ReportStressSignDto[], withNotes: boolean): string {
  const evaluated = evaluatedSigns(signs);
  if (evaluated.length === 0) {
    return '(no stress signs evaluated)';
  }
  return evaluated.map(withNotes ? formatSignWithNotes : formatSignBrief).join('\n');
}

function formatIdentification(report: PlantReportExtendedDto): string {
  const parts: string[] = [];
  if (report.identifiedPlantName) {
    let line = report.identifiedPlantName;
    if (report.scientificName) line += ` (${report.scientificName})`;
    if (report.identificationConfidence != null) {
      line += `, ${report.identificationConfidence}% confidence`;
    }
    parts.push(`Identified: ${line}`);
  }
  return parts.join('\n');
}

/** Full report block with all useful info incl. stress-sign severity + notes. */
function formatReportFull(report: PlantReportExtendedDto): string {
  const lines: string[] = [];
  lines.push(`Report — ${dateOnly(report.reportedAt)} (id ${report.id})`);
  const idLine = formatIdentification(report);
  if (idLine) lines.push(idLine);
  if (report.likelyStressors.length > 0) {
    lines.push(`Likely stressors: ${report.likelyStressors.join(', ')}`);
  }
  lines.push(`Summary: ${report.summary}`);
  if (report.recommendations.trim()) {
    lines.push(`Recommendations: ${report.recommendations}`);
  }
  lines.push('Stress signs:');
  lines.push(indent(formatStressSigns(report.stressSigns, true), '  '));
  return lines.join('\n');
}

/** Brief report block: dates, summary, stress signs without notes. */
function formatReportBrief(report: PlantReportExtendedDto): string {
  const lines: string[] = [];
  lines.push(`${dateOnly(report.reportedAt)} (id ${report.id})`);
  if (report.identifiedPlantName) {
    lines.push(`Identified: ${report.identifiedPlantName}`);
  }
  lines.push(`Summary: ${report.summary}`);
  lines.push('Stress signs:');
  lines.push(indent(formatStressSigns(report.stressSigns, false), '  '));
  return lines.join('\n');
}

function formatPlantHeader(plant: PlantDto): string {
  const lines = [`Plant: ${plant.name}`];
  if (plant.species) lines.push(`Species: ${plant.species}`);
  if (plant.notes?.trim()) lines.push(`Notes: ${plant.notes.trim()}`);
  return lines.join('\n');
}

/**
 * The plain-text context returned by `POST /agent/chats`. Summarizes the plant
 * and its latest report so the agent can start the session without an extra
 * tool call. `report` is null when the plant has no reports yet.
 */
export function formatLatestReportContext(
  plant: PlantDto,
  report: PlantReportExtendedDto | null,
): string {
  const sections = [formatPlantHeader(plant), ''];

  if (!report) {
    sections.push('No reports have been created for this plant yet.');
    return sections.join('\n');
  }

  sections.push('Latest report:');
  sections.push(indent(formatReportFull(report), '  '));
  return sections.join('\n');
}

/**
 * `GET /agent/plantReports` — the last three reports with full detail, plus a
 * note when there are more in the plant's history. `reports` is the full
 * history ordered newest first; only the first `limit` are rendered in full.
 */
export function formatPlantReports(
  reports: PlantReportExtendedDto[],
  limit = 3,
): string {
  const plantName = reports[0]?.plantName ?? 'this plant';
  const shown = reports.slice(0, limit);
  const lines = [`Last ${shown.length} report(s) for "${plantName}":`, ''];

  if (shown.length === 0) {
    lines.push('No reports found for this plant.');
    return lines.join('\n');
  }

  lines.push(shown.map(formatReportFull).join('\n\n'));

  const remaining = reports.length - shown.length;
  if (remaining > 0) {
    lines.push('');
    lines.push(`There are ${remaining} more report(s) in this plant's history.`);
  }
  return lines.join('\n');
}

/** `GET /agent/plantHistory` — every report, brief (dates, summary, signs w/o notes). */
export function formatPlantHistory(reports: PlantReportExtendedDto[]): string {
  const plantName = reports[0]?.plantName ?? 'this plant';
  if (reports.length === 0) {
    return `No reports found for "${plantName}".`;
  }

  const lines = [
    `Report history for "${plantName}" (${reports.length} report(s)):`,
    '',
    reports.map(formatReportBrief).join('\n\n'),
  ];
  return lines.join('\n');
}

/** `GET /agent/userPlants` — the user's plants (capped by the caller). */
export function formatUserPlants(plants: PlantListItemDto[]): string {
  if (plants.length === 0) {
    return 'No plants found on this account.';
  }

  const lines = [`Your plants (${plants.length}):`, ''];
  plants.forEach((plant, index) => {
    const header = `${index + 1}. ${plant.name}`;
    const details: string[] = [`Reports: ${plant.reportCount}`];
    if (plant.species) details.unshift(`Species: ${plant.species}`);
    const present = plant.latestReportStressSigns.filter(isPresent);
    if (present.length > 0) {
      details.push(
        `Current stress signs: ${present
          .map((s) => `${s.name} (${s.severity})`)
          .join(', ')}`,
      );
    }
    lines.push(header);
    lines.push(indent(details.join('\n'), '   '));
  });
  return lines.join('\n');
}