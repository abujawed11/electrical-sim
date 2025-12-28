import React from 'react';
import { Group, Line } from 'react-konva';
import { useEditorStore } from '../store';
import { getTerminalPos } from '../utils';

export const WiresLayer = () => {
  const wires = useEditorStore((state) => state.wires);
  const components = useEditorStore((state) => state.components);
  const selectedWireId = useEditorStore((state) => state.selectedWireId);
  const selectWire = useEditorStore((state) => state.selectWire);

  return (
    <Group>
      {wires.map((wire) => {
        const fromComp = components.find(c => c.id === wire.from.compId);
        const toComp = components.find(c => c.id === wire.to.compId);

        if (!fromComp || !toComp) return null;

        const start = getTerminalPos(fromComp, wire.from.terminalId);
        const end = getTerminalPos(toComp, wire.to.terminalId);
        const isSelected = selectedWireId === wire.id;

        return (
          <Group key={wire.id}>
            {/* Hit area (thick invisible line) */}
            <Line
              points={[start.x, start.y, end.x, end.y]}
              stroke="transparent"
              strokeWidth={15}
              onMouseEnter={(e) => {
                const container = e.target.getStage().container();
                container.style.cursor = 'pointer';
              }}
              onMouseLeave={(e) => {
                const container = e.target.getStage().container();
                container.style.cursor = 'default';
              }}
              onClick={(e) => {
                e.cancelBubble = true;
                selectWire(wire.id);
              }}
              onTap={(e) => {
                e.cancelBubble = true;
                selectWire(wire.id);
              }}
            />
            {/* Visible Wire */}
            <Line
              points={[start.x, start.y, end.x, end.y]}
              stroke={isSelected ? '#3B82F6' : '#9CA3AF'} // Blue if selected, Gray otherwise
              strokeWidth={isSelected ? 4 : 2}
              lineCap="round"
              lineJoin="round"
              shadowColor={isSelected ? '#3B82F6' : 'black'}
              shadowBlur={isSelected ? 10 : 0}
              shadowOpacity={0.5}
              listening={false} // pass events to hit area
            />
          </Group>
        );
      })}
    </Group>
  );
};
