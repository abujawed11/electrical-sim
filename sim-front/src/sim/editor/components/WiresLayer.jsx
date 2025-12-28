import React from 'react';
import { Group, Line } from 'react-konva';
import { useEditorStore } from '../store';
import { getTerminalPos } from '../utils';
import { PART_REGISTRY } from '../parts/partRegistry';
import { TERMINAL_KINDS } from '../types';

export const WiresLayer = () => {
  const wires = useEditorStore((state) => state.wires);
  const components = useEditorStore((state) => state.components);
  const selectedWireId = useEditorStore((state) => state.selectedWireId);
  const selectWire = useEditorStore((state) => state.selectWire);
  const simulationState = useEditorStore((state) => state.simulationState);

  return (
    <Group>
      {wires.map((wire) => {
        const fromComp = components.find(c => c.id === wire.from.compId);
        const toComp = components.find(c => c.id === wire.to.compId);

        if (!fromComp || !toComp) return null;

        const start = getTerminalPos(fromComp, wire.from.terminalId);
        const end = getTerminalPos(toComp, wire.to.terminalId);
        const isSelected = selectedWireId === wire.id;
        
        // Construct points: Start -> Waypoints -> End
        const waypoints = wire.waypoints || [];
        const points = [
            start.x, start.y,
            ...waypoints.flatMap(p => [p.x, p.y]),
            end.x, end.y
        ];

        // Determine Wire Kind (Phase/Neutral/Earth) to pick color
        // And check if energized
        const fromRegistry = PART_REGISTRY[fromComp.type];
        const term = fromRegistry.terminals.find(t => t.id === wire.from.terminalId);
        
        let strokeColor = '#9CA3AF'; // Default Gray
        let isEnergized = false;

        if (term) {
           const fromIdStr = `${wire.from.compId}:${wire.from.terminalId}`;
           const toIdStr = `${wire.to.compId}:${wire.to.terminalId}`;

           if (term.kind === TERMINAL_KINDS.PHASE) {
              isEnergized = simulationState.livePhaseSet.has(fromIdStr) && simulationState.livePhaseSet.has(toIdStr);
              strokeColor = isEnergized ? '#B91C1C' : '#7F1D1D'; // Bright Red vs Dark Red
              if (!isEnergized) strokeColor = '#4B5563'; // Dim gray if dead
           } else if (term.kind === TERMINAL_KINDS.NEUTRAL) {
              isEnergized = simulationState.neutralSet.has(fromIdStr) && simulationState.neutralSet.has(toIdStr);
              strokeColor = isEnergized ? '#3B82F6' : '#1E3A8A'; // Blue vs Dark Blue
              if (!isEnergized) strokeColor = '#4B5563';
           } else if (term.kind === TERMINAL_KINDS.EARTH) {
              isEnergized = simulationState.earthSet.has(fromIdStr) && simulationState.earthSet.has(toIdStr);
              strokeColor = isEnergized ? '#10B981' : '#064E3B'; // Green vs Dark Green
              if (!isEnergized) strokeColor = '#4B5563';
           }
        }

        // Selected override
        if (isSelected) strokeColor = '#60A5FA'; 

        return (
          <Group key={wire.id}>
            {/* Hit area (thick invisible line) */}
            <Line
              points={points}
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
              points={points}
              stroke={strokeColor} 
              strokeWidth={isSelected ? 4 : 2}
              lineCap="round"
              lineJoin="round"
              shadowColor={isEnergized ? strokeColor : 'black'}
              shadowBlur={isEnergized ? 5 : 0}
              shadowOpacity={0.5}
              listening={false} // pass events to hit area
            />
          </Group>
        );
      })}
    </Group>
  );
};
