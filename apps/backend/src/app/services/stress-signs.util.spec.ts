import type { ReportStressSignDto } from '@plant-doctor/api-types';
import {
  buildReportStressSignDto,
  groupStressSigns,
  groupStressSignsByReport,
  pickFirstByReportId,
  pushVariable,
  toReasoningEffort,
  toStressSeverity,
  toStressSignStatus,
} from './stress-signs.util';

/** Returns the sign for `id`, throwing if absent (avoids `!` in assertions). */
function requireSign(
  map: Map<string, ReportStressSignDto>,
  id: string,
): ReportStressSignDto {
  const sign = map.get(id);
  if (!sign) throw new Error(`expected sign "${id}" in map`);
  return sign;
}

/** Returns the sign map for `reportId`, throwing if absent (avoids `!`). */
function requireReportSigns(
  map: Map<number, Map<string, ReportStressSignDto>>,
  reportId: number,
): Map<string, ReportStressSignDto> {
  const signs = map.get(reportId);
  if (!signs) throw new Error(`expected report ${reportId} in map`);
  return signs;
}

/** Returns the row for `id`, throwing if absent (avoids `!` in assertions). */
function requireRow<T>(map: Map<number, T>, id: number): T {
  const row = map.get(id);
  if (!row) throw new Error(`expected row ${id} in map`);
  return row;
}

describe('toStressSignStatus', () => {
  it.each(['present', 'absent', 'unknown'])(
    'returns a known status unchanged (%s)',
    (status) => {
      expect(toStressSignStatus(status)).toBe(status);
    },
  );

  it('defaults to "unknown" for null/undefined', () => {
    expect(toStressSignStatus(null)).toBe('unknown');
    expect(toStressSignStatus(undefined)).toBe('unknown');
  });

  it('defaults to "unknown" for an off-list string', () => {
    expect(toStressSignStatus('maybe')).toBe('unknown');
    expect(toStressSignStatus('')).toBe('unknown');
  });
});

describe('toStressSeverity', () => {
  it.each(['none', 'mild', 'moderate', 'severe'])(
    'returns a known severity unchanged (%s)',
    (severity) => {
      expect(toStressSeverity(severity)).toBe(severity);
    },
  );

  it('defaults to "none" for null/undefined', () => {
    expect(toStressSeverity(null)).toBe('none');
    expect(toStressSeverity(undefined)).toBe('none');
  });

  it('defaults to "none" for an off-list string', () => {
    expect(toStressSeverity('extreme')).toBe('none');
  });
});

describe('toReasoningEffort', () => {
  it.each(['none', 'low', 'medium', 'high'])(
    'returns a known level unchanged (%s)',
    (effort) => {
      expect(toReasoningEffort(effort)).toBe(effort);
    },
  );

  it('returns null for null/undefined', () => {
    expect(toReasoningEffort(null)).toBeNull();
    expect(toReasoningEffort(undefined)).toBeNull();
  });

  it('returns null for an off-list string', () => {
    expect(toReasoningEffort('turbo')).toBeNull();
    expect(toReasoningEffort('')).toBeNull();
  });
});

describe('buildReportStressSignDto', () => {
  it('builds a skeleton with coerced status/severity and empty variables', () => {
    const dto = buildReportStressSignDto({
      id: 'overwatering',
      name: 'Overwatering',
      status: 'present',
      severity: 'severe',
      confidence: 0.9,
      notes: 'mushy stem',
      variableId: null,
      variableName: null,
    });

    expect(dto).toEqual({
      stressSignId: 'overwatering',
      name: 'Overwatering',
      status: 'present',
      severity: 'severe',
      confidence: 0.9,
      notes: 'mushy stem',
      variables: [],
    });
  });

  it('coerces null status/severity to the defaults', () => {
    const dto = buildReportStressSignDto({
      id: 'x',
      name: 'X',
      status: null,
      severity: null,
      confidence: null,
      notes: null,
      variableId: null,
      variableName: null,
    });

    expect(dto.status).toBe('unknown');
    expect(dto.severity).toBe('none');
  });
});

describe('pushVariable', () => {
  const baseSign = (): ReportStressSignDto => ({
    stressSignId: 's',
    name: 'S',
    status: 'present',
    severity: 'mild',
    confidence: null,
    notes: null,
    variables: [],
  });

  it('appends a variable when both id and name are present', () => {
    const sign = baseSign();
    pushVariable(sign, {
      id: 's',
      name: 'S',
      status: 'present',
      severity: 'mild',
      confidence: null,
      notes: null,
      variableId: 'v1',
      variableName: 'leaf color',
    });

    expect(sign.variables).toEqual([{ id: 'v1', name: 'leaf color' }]);
  });

  it('does nothing when the variable fields are null', () => {
    const sign = baseSign();
    pushVariable(sign, {
      id: 's',
      name: 'S',
      status: 'present',
      severity: 'mild',
      confidence: null,
      notes: null,
      variableId: null,
      variableName: null,
    });

    expect(sign.variables).toEqual([]);
  });
});

describe('groupStressSigns', () => {
  it('groups rows by sign id and accumulates variables', () => {
    const rows = [
      {
        id: 'overwatering',
        name: 'Overwatering',
        status: 'present',
        severity: 'severe',
        confidence: 0.9,
        notes: 'n1',
        variableId: 'v1',
        variableName: 'leaf',
      },
      {
        id: 'overwatering',
        name: 'Overwatering',
        status: 'present',
        severity: 'severe',
        confidence: 0.9,
        notes: 'n1',
        variableId: 'v2',
        variableName: 'stem',
      },
      {
        id: 'underwatering',
        name: 'Underwatering',
        status: 'absent',
        severity: null,
        confidence: null,
        notes: null,
        variableId: null,
        variableName: null,
      },
    ];

    const signs = groupStressSigns(rows);

    expect(signs.size).toBe(2);
    expect([...requireSign(signs, 'overwatering').variables]).toEqual([
      { id: 'v1', name: 'leaf' },
      { id: 'v2', name: 'stem' },
    ]);
    // Coerced null severity → 'none'.
    expect(requireSign(signs, 'underwatering').severity).toBe('none');
    expect(requireSign(signs, 'underwatering').variables).toEqual([]);
  });
});

describe('groupStressSignsByReport', () => {
  it('groups by report then sign, accumulating variables', () => {
    const rows = [
      {
        reportId: 1,
        id: 'overwatering',
        name: 'Overwatering',
        status: 'present',
        severity: 'mild',
        confidence: 0.8,
        notes: 'n',
        variableId: 'v1',
        variableName: 'leaf',
      },
      {
        reportId: 2,
        id: 'overwatering',
        name: 'Overwatering',
        status: 'absent',
        severity: 'none',
        confidence: null,
        notes: null,
        variableId: null,
        variableName: null,
      },
      {
        reportId: 1,
        id: 'overwatering',
        name: 'Overwatering',
        status: 'present',
        severity: 'mild',
        confidence: 0.8,
        notes: 'n',
        variableId: 'v2',
        variableName: 'stem',
      },
    ];

    const byReport = groupStressSignsByReport(rows);

    expect(byReport.size).toBe(2);
    const report1 = requireReportSigns(byReport, 1);
    const report2 = requireReportSigns(byReport, 2);
    expect([...requireSign(report1, 'overwatering').variables]).toEqual([
      { id: 'v1', name: 'leaf' },
      { id: 'v2', name: 'stem' },
    ]);
    expect(requireSign(report2, 'overwatering').status).toBe('absent');
    expect(requireSign(report2, 'overwatering').variables).toEqual([]);
  });

  it('skips rows with a null reportId', () => {
    const rows = [
      {
        reportId: null,
        id: 'x',
        name: 'X',
        status: 'present',
        severity: 'mild',
        confidence: null,
        notes: null,
        variableId: null,
        variableName: null,
      },
    ];

    expect(groupStressSignsByReport(rows).size).toBe(0);
  });
});

describe('pickFirstByReportId', () => {
  it('keeps the first row per plantReportId in order', () => {
    const rows = [
      { plantReportId: 1, createdAt: 'a', tag: 'first-1' },
      { plantReportId: 1, createdAt: 'b', tag: 'second-1' },
      { plantReportId: 2, createdAt: 'c', tag: 'first-2' },
    ];

    const byReport = pickFirstByReportId(rows);

    expect(byReport.size).toBe(2);
    expect(requireRow(byReport, 1).tag).toBe('first-1');
    expect(requireRow(byReport, 2).tag).toBe('first-2');
  });

  it('skips rows with a null plantReportId', () => {
    const rows = [
      { plantReportId: null, tag: 'orphan' },
      { plantReportId: 3, tag: 'kept' },
    ];

    const byReport = pickFirstByReportId(rows);

    expect(byReport.size).toBe(1);
    expect(requireRow(byReport, 3).tag).toBe('kept');
  });

  it('works for any row shape with a plantReportId', () => {
    const rows = [
      { plantReportId: 5, model: 'qwen', createdAt: 'z' },
      { plantReportId: 5, model: 'older', createdAt: 'y' },
    ];

    const byReport = pickFirstByReportId(rows);

    expect(requireRow(byReport, 5).model).toBe('qwen');
  });
});