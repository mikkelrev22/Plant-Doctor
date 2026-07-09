import { useEffect, useMemo, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type EdgeTypes,
  type NodeTypes,
} from '@xyflow/react';
import { Alert, Loader, Center } from '@mantine/core';
import { AppGroupNode } from '../components/nodes/AppGroupNode';
import { FeatureNode } from '../components/nodes/FeatureNode';
import { EndpointNode } from '../components/nodes/EndpointNode';
import { LibNode } from '../components/nodes/LibNode';
import { Sidebar } from '../components/Sidebar';
import { useGraph, useSaveGraph } from '../queries';
import {
  NODE_COLORS,
  type ArchEdge,
  type ArchNode,
  type NodeKind,
} from '../types';

const nodeTypes: NodeTypes = {
  appGroup: AppGroupNode,
  feature: FeatureNode,
  endpoint: EndpointNode,
  lib: LibNode,
};

const edgeTypes: EdgeTypes = {};

interface AddNodeInput {
  type: NodeKind;
  label: string;
  parentId?: string;
}

function nodeTypeFor(kind: NodeKind): string {
  switch (kind) {
    case 'app':
      return 'appGroup';
    case 'feature':
      return 'feature';
    case 'endpoint':
      return 'endpoint';
    case 'lib':
      return 'lib';
  }
}

function defaultDataFor(input: AddNodeInput) {
  switch (input.type) {
    case 'app':
      return { kind: 'app' as const, label: input.label, appKind: 'frontend' as const };
    case 'feature':
      return { kind: 'feature' as const, label: input.label, route: '/' };
    case 'endpoint': {
      const [method, ...pathParts] = input.label.split(' ');
      return {
        kind: 'endpoint' as const,
        label: input.label,
        method: method ?? 'GET',
        path: pathParts.join(' ') || '/',
        backend: 'node' as const,
      };
    }
    case 'lib':
      return { kind: 'lib' as const, label: input.label };
  }
}

let nodeSeq = Date.now();
function uniqueId(prefix: string): string {
  nodeSeq += 1;
  return `${prefix}:${nodeSeq}`;
}

export function ArchitecturePage() {
  const { data, isLoading, isError, error, refetch } = useGraph();
  const saveMutation = useSaveGraph();

  const [nodes, setNodes, onNodesChange] = useNodesState<ArchNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<ArchEdge>([]);
  const [dirty, setDirty] = useState(false);

  // Hydrate local state from the server graph whenever it (re)loads.
  useEffect(() => {
    if (data) {
      setNodes(data.nodes);
      setEdges(data.edges);
      setDirty(false);
    }
  }, [data, setNodes, setEdges]);

  const onConnect = (connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection, id: uniqueId('edge') }, eds));
    setDirty(true);
  };

  const onNodesChangeWrapped: typeof onNodesChange = (changes) => {
    onNodesChange(changes);
    setDirty(true);
  };

  const onEdgesChangeWrapped: typeof onEdgesChange = (changes) => {
    onEdgesChange(changes);
    setDirty(true);
  };

  const handleSave = () => {
    saveMutation.mutate({ nodes, edges });
  };

  // Ctrl/Cmd+S saves the graph (and stops the browser's "save page" dialog).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (dirty && !saveMutation.isPending) {
          saveMutation.mutate({ nodes, edges });
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dirty, nodes, edges, saveMutation]);

  const handleReset = () => {
    void refetch();
  };

  const handleAddNode = (input: AddNodeInput) => {
    const id = uniqueId(input.type);
    const parentId = input.parentId;
    const newNode: ArchNode = {
      id,
      type: nodeTypeFor(input.type),
      position: parentId ? { x: 40, y: 60 + (nodes.length % 6) * 70 } : { x: 80, y: 120 },
      data: defaultDataFor(input),
      ...(parentId ? { parentId, extent: 'parent' as const } : {}),
    };
    setNodes((nds) => nds.concat(newNode));
    setDirty(true);
  };

  const minimapNodeColor = (n: ArchNode) =>
    `var(--mantine-color-${NODE_COLORS[n.data?.kind ?? 'lib']}-6)`;

  const hasData = useMemo(() => data !== undefined, [data]);

  if (isLoading && !hasData) {
    return (
      <Center h="100%">
        <Loader />
      </Center>
    );
  }

  if (isError) {
    return (
      <Center h="100%" p="lg">
        <Alert color="red" title="Could not load the architecture graph">
          {(error as Error)?.message ??
            'Is the Node backend running? It serves /architecture/graph.'}
        </Alert>
      </Center>
    );
  }

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <Sidebar
        nodes={nodes}
        edges={edges}
        dirty={dirty}
        saving={saveMutation.isPending}
        onSave={handleSave}
        onReset={handleReset}
        onAddNode={handleAddNode}
      />
      <div style={{ height: '100%', width: '100%', minHeight: 0, flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChangeWrapped}
          onEdgesChange={onEdgesChangeWrapped}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={1.5}
        >
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          <Controls />
          <MiniMap
            nodeColor={minimapNodeColor}
            maskColor="rgba(0,0,0,0.1)"
            zoomable
            pannable
          />
        </ReactFlow>
      </div>
    </div>
  );
}