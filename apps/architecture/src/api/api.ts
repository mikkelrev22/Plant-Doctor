import { config } from '../config';
import { EMPTY_GRAPH, type ArchitectureGraph } from '../types';

const GRAPH_URL = `${config.backendUrl}/architecture/graph`;

export async function getGraph(): Promise<ArchitectureGraph> {
  const res = await fetch(GRAPH_URL);
  if (!res.ok) {
    throw new Error(`Failed to load architecture graph (${res.status})`);
  }
  const body = (await res.json()) as Partial<ArchitectureGraph>;
  return {
    nodes: Array.isArray(body.nodes) ? body.nodes : [],
    edges: Array.isArray(body.edges) ? body.edges : [],
  };
}

export async function saveGraph(graph: ArchitectureGraph): Promise<void> {
  const res = await fetch(GRAPH_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(graph),
  });
  if (!res.ok) {
    throw new Error(`Failed to save architecture graph (${res.status})`);
  }
}

export { EMPTY_GRAPH };