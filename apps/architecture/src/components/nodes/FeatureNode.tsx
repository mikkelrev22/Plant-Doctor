import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { FeatureNodeData } from '../../types';
import classes from './nodes.module.css';

function FeatureNodeComponent({ data, selected }: NodeProps) {
  const d = data as FeatureNodeData;
  return (
    <div
      className={`${classes.card} ${classes.feature}`}
      style={selected ? { outline: '2px solid var(--mantine-color-teal-6)' } : undefined}
    >
      <Handle type="target" position={Position.Left} />
      <div className={classes.label}>{d.label}</div>
      <div className={classes.route}>{d.route}</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export const FeatureNode = memo(FeatureNodeComponent);