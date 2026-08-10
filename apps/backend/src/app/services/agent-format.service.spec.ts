import {
  formatLatestReportContext,
  formatPlantHistory,
  formatPlantReports,
  formatUserPlants,
} from './agent-format.service';
import type {
  PlantDto,
  PlantListItemDto,
  PlantReportExtendedDto,
  ReportStressSignDto,
} from '@plant-doctor/api-types';

const plant: PlantDto = {
  id: 1,
  name: 'Aloe',
  species: 'Aloe vera',
  notes: 'On the windowsill',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

function makeSign(overrides: Partial<ReportStressSignDto>): ReportStressSignDto {
  return {
    stressSignId: 'x',
    name: 'Sign',
    status: 'present',
    severity: 'mild',
    confidence: null,
    notes: null,
    variables: [],
    ...overrides,
  };
}

function makeReport(
  index: number,
  overrides: Partial<PlantReportExtendedDto> = {},
): PlantReportExtendedDto {
  return {
    id: 10 + index,
    plantId: 1,
    plantName: 'Aloe',
    reportedAt: `2026-0${8 - index}-09T10:00:00.000Z`,
    identifiedPlantName: 'Aloe vera',
    scientificName: 'Aloe barbadensis',
    identificationConfidence: 95,
    likelyStressors: ['water', 'light'],
    summary: `Summary ${index}`,
    recommendations: '',
    photo: null,
    stressSigns: [
      makeSign({
        stressSignId: 'leaf_yellowing',
        name: 'Leaf yellowing',
        status: 'present',
        severity: 'moderate',
        confidence: 80,
        notes: 'lower leaves',
      }),
      makeSign({
        stressSignId: 'brown_spots',
        name: 'Brown spots',
        status: 'absent',
        severity: 'none',
        confidence: 90,
        notes: null,
      }),
      makeSign({
        stressSignId: 'unevaluated',
        name: 'Unevaluated sign',
        status: 'unknown',
        severity: 'none',
        confidence: null,
        notes: null,
      }),
    ],
    ...overrides,
  };
}

describe('agent-format.service', () => {
  describe('formatLatestReportContext', () => {
    it('includes the plant header and the latest report with present/absent signs + notes', () => {
      const text = formatLatestReportContext(plant, makeReport(0));

      expect(text).toContain('Plant: Aloe');
      expect(text).toContain('Species: Aloe vera');
      expect(text).toContain('Notes: On the windowsill');
      expect(text).toContain('Latest report:');
      expect(text).toContain('2026-08-09');
      expect(text).toContain('Identified: Aloe vera (Aloe barbadensis), 95% confidence');
      expect(text).toContain('Likely stressors: water, light');
      expect(text).toContain('Summary: Summary 0');
      expect(text).toContain('Present (moderate): Leaf yellowing, 80% confidence — lower leaves');
      expect(text).toContain('Absent: Brown spots, 90% confidence');
    });

    it('drops unevaluated (unknown) signs', () => {
      const text = formatLatestReportContext(plant, makeReport(0));
      expect(text).not.toContain('Unevaluated sign');
      expect(text).not.toContain('unknown');
    });

    it('reports no reports yet when the plant has none', () => {
      const text = formatLatestReportContext(plant, null);
      expect(text).toContain('No reports have been created for this plant yet.');
    });
  });

  describe('formatPlantReports', () => {
    it('shows the last 3 reports and a "N more" note when there are more', () => {
      const reports = [0, 1, 2, 3, 4].map((i) => makeReport(i));
      const text = formatPlantReports(reports);

      expect(text).toContain('Last 3 report(s) for "Aloe"');
      expect(text).toContain('Summary 0');
      expect(text).toContain('Summary 2');
      // 4th and 5th reports are not rendered in full.
      expect(text).not.toContain('Summary 3');
      expect(text).not.toContain('Summary 4');
      expect(text).toContain("There are 2 more report(s) in this plant's history.");
    });

    it('does not add the "more" note when there are 3 or fewer', () => {
      const reports = [0, 1].map((i) => makeReport(i));
      const text = formatPlantReports(reports);
      expect(text).not.toContain('more report(s)');
    });

    it('handles a plant with no reports', () => {
      const text = formatPlantReports([]);
      expect(text).toContain('No reports found for this plant.');
    });
  });

  describe('formatPlantHistory', () => {
    it('lists every report briefly, with stress signs but without notes', () => {
      const reports = [0, 1, 2].map((i) => makeReport(i));
      const text = formatPlantHistory(reports);

      expect(text).toContain('Report history for "Aloe" (3 report(s))');
      expect(text).toContain('Summary 0');
      expect(text).toContain('Summary 2');
      expect(text).toContain('Present (moderate): Leaf yellowing');
      // Notes are omitted in the brief view.
      expect(text).not.toContain('lower leaves');
    });

    it('handles a plant with no reports', () => {
      const text = formatPlantHistory([]);
      expect(text).toContain('No reports found for "this plant".');
    });
  });

  describe('formatUserPlants', () => {
    const plants: PlantListItemDto[] = [
      {
        ...plant,
        thumbnailUrl: null,
        reportCount: 5,
        latestReportStressSigns: [
          makeSign({
            stressSignId: 'leaf_yellowing',
            name: 'Leaf yellowing',
            status: 'present',
            severity: 'moderate',
          }),
        ],
      },
      {
        ...plant,
        id: 2,
        name: 'Pothos',
        species: null,
        thumbnailUrl: null,
        reportCount: 0,
        latestReportStressSigns: [],
      },
    ];

    it('lists the plants with report counts and current stress signs', () => {
      const text = formatUserPlants(plants);
      expect(text).toContain('Your plants (2)');
      expect(text).toContain('1. Aloe');
      expect(text).toContain('Reports: 5');
      expect(text).toContain('Current stress signs: Leaf yellowing (moderate)');
      expect(text).toContain('2. Pothos');
    });

    it('omits the stress-signs line for plants with no present signs', () => {
      const text = formatUserPlants(plants);
      const pothosBlock = text.slice(text.indexOf('2. Pothos'));
      expect(pothosBlock).not.toContain('Current stress signs');
    });

    it('handles an empty account', () => {
      expect(formatUserPlants([])).toContain('No plants found on this account.');
    });
  });
});