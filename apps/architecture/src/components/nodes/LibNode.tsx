import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { LibNodeData } from '../../types';
import classes from './nodes.module.css';

function LibNodeComponent({ data, selected }: NodeProps) {
  const d = data as LibNodeData;
  return (
    <div
      className={`${classes.card} ${classes.lib}`}
      style={selected ? { outline: '2px solid var(--mantine-color-gray-6)' } : undefined}
    >
      <Handle type="target" position={Position.Left} />
      <div className={classes.label}>{d.label}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export const LibNode = memo(LibNodeComponent);