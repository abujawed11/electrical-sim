import React from 'react';
import { Group, Line } from 'react-konva';
import { useEditorStore } from '../store';
import { getTerminalPos } from '../utils';

export const DraftWire = () => {
  const draftWire = useEditorStore((state) => state.draftWire);
  const components = useEditorStore((state) => state.components);

  if (!draftWire) return null;

  const fromComp = components.find(c => c.id === draftWire.from.compId);
  if (!fromComp) return null;

  const start = getTerminalPos(fromComp, draftWire.from.terminalId);
  const end = draftWire.toPos;

  return (
    <Group>
      <Line
        points={[start.x, start.y, end.x, end.y]}
        stroke="#60A5FA" // Light blue
        strokeWidth={2}
        dash={[10, 5]}
        opacity={0.8}
        listening={false}
      />
      {/* Small dot at mouse tip */}
      <Line
        points={[end.x - 5, end.y, end.x + 5, end.y]}
        stroke="#60A5FA"
        strokeWidth={2}
        listening={false}
      />
      <Line
        points={[end.x, end.y - 5, end.x, end.y + 5]}
        stroke="#60A5FA"
        strokeWidth={2}
        listening={false}
      />
    </Group>
  );
};
