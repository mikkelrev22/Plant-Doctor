import type { Edge, Node } from '@xyflow/react';

/** High-level kind of a node — drives color and grouping. */
export type NodeKind = 'app' | 'feature' | 'endpoint' | 'lib';

/** Whether an app node is a frontend or a backend. */
export type AppKind = 'frontend' | 'backend';

/** Which backend an endpoint node belongs to. */
export type BackendTag = 'node' | 'py';

export type AppGroupNodeData = {
  kind: NodeKind;
  label: string;
  appKind: AppKind;
};

export type FeatureNodeData = {
  kind: NodeKind;
  label: string;
  route: string;
};

export type EndpointNodeData = {
  kind: NodeKind;
  label: string;
  method: string;
  path: string;
  backend: BackendTag;
};

export type LibNodeData = {
  kind: NodeKind;
  label: string;
};

export type ArchNodeData =
  | AppGroupNodeData
  | FeatureNodeData
  | EndpointNodeData
  | LibNodeData;

export type ArchNode = Node<ArchNodeData>;
export type ArchEdge = Edge;

export type ArchitectureGraph = {
  nodes: ArchNode[];
  edges: ArchEdge[];
};

export const EMPTY_GRAPH: ArchitectureGraph = { nodes: [], edges: [] };

export const NODE_COLORS: Record<NodeKind, string> = {
  app: 'violet',
  feature: 'teal',
  endpoint: 'grape',
  lib: 'gray',
};