import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';
import type { ArchitectureGraph } from './types';

describe('docs/architecture.json seed', () => {
  const graph: ArchitectureGraph = JSON.parse(
    readFileSync(resolve(__dirname, '../../../docs/architecture.json'), 'utf8')
  );

  it('has nodes and edges arrays', () => {
    expect(Array.isArray(graph.nodes)).toBe(true);
    expect(Array.isArray(graph.edges)).toBe(true);
    expect(graph.nodes.length).toBeGreaterThan(0);
  });

  it('every node has a kind and unique id', () => {
    const ids = new Set<string>();
    for (const node of graph.nodes) {
      expect(node.id).toBeTruthy();
      expect(ids.has(node.id)).toBe(false);
      ids.add(node.id);
      expect(['app', 'feature', 'endpoint', 'lib']).toContain(node.data?.kind);
    }
  });

  it('every edge references existing nodes', () => {
    const ids = new Set(graph.nodes.map((n) => n.id));
    for (const edge of graph.edges) {
      expect(ids.has(edge.source)).toBe(true);
      expect(ids.has(edge.target)).toBe(true);
    }
  });

  it('children reference a known parent', () => {
    const ids = new Set(graph.nodes.map((n) => n.id));
    for (const node of graph.nodes) {
      if (node.parentId) {
        expect(ids.has(node.parentId)).toBe(true);
      }
    }
  });
});