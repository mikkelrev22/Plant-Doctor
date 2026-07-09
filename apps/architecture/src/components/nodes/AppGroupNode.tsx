import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AppGroupNodeData } from '../../types';
import classes from './nodes.module.css';

function AppGroupNodeComponent({ data }: NodeProps) {
  const d = data as AppGroupNodeData;
  return (
    <div className={classes.appGroup}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div className={classes.appGroupHeader}>{d.label}</div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

export const AppGroupNode = memo(AppGroupNodeComponent);