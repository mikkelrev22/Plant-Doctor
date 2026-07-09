import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getGraph, saveGraph } from './api/api';
import type { ArchitectureGraph } from './types';

const GRAPH_KEY = ['architecture', 'graph'] as const;

export function useGraph() {
  return useQuery({
    queryKey: GRAPH_KEY,
    queryFn: getGraph,
  });
}

export function useSaveGraph() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (graph: ArchitectureGraph) => saveGraph(graph),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: GRAPH_KEY });
    },
  });
}