import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { EndpointNodeData } from '../../types';
import classes from './nodes.module.css';

function methodClass(method: string): string {
  const m = method.toUpperCase();
  if (m === 'GET') return classes.methodGET;
  if (m === 'POST') return classes.methodPOST;
  if (m === 'PATCH') return classes.methodPATCH;
  if (m === 'PUT') return classes.methodPUT;
  if (m === 'DELETE') return classes.methodDELETE;
  return classes.methodGET;
}

function EndpointNodeComponent({ data, selected }: NodeProps) {
  const d = data as EndpointNodeData;
  return (
    <div
      className={`${classes.card} ${classes.endpoint}`}
      style={selected ? { outline: '2px solid var(--mantine-color-grape-6)' } : undefined}
    >
      <Handle type="target" position={Position.Left} />
      <div className={classes.methodRow}>
        <span className={`${classes.method} ${methodClass(d.method)}`}>
          {d.method}
        </span>
        <span className={classes.path}>{d.path}</span>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export const EndpointNode = memo(EndpointNodeComponent);