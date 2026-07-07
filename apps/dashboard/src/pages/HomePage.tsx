import { useState } from 'react';
import { Stack, Title } from '@mantine/core';
import { AnalysisForm } from '../components/AnalysisForm';
import { useAnalyzeReport } from '../queries';
import { useNavigate } from 'react-router-dom';
import { generatePlantName } from '../utils/plant-names';

export function HomePage() {
  const [image, setImage] = useState<File | null>(null);
  const [plantName, setPlantName] = useState(() => generatePlantName());
  const analyzeMutation = useAnalyzeReport();
  const navigate = useNavigate();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!image) return;

    analyzeMutation.mutate(
      { image, plantName },
      {
        onSuccess: (response) => {
          navigate(`/report/${response.report.id}`);
        },
      },
    );
  };

  return (
    <Stack gap="lg">
      <Title order={2}>New Plant Analysis</Title>
      <AnalysisForm
        image={image}
        loading={analyzeMutation.isPending}
        label={`Upload a photo`}
        onSubmit={handleSubmit}
        setImage={setImage}
      />
    </Stack>
  );
}
