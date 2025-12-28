import React from 'react';
import { Group, Line } from 'react-konva';
import { useEditorStore } from '../store';
import { getTerminalPos } from '../utils';
import { PART_DEFINITIONS as PART_REGISTRY } from '../parts/partDefinitions';
import { TERMINAL_KINDS } from '../types';

export const WiresLayer = () => {
  const wires = useEditorStore((state) => state.wires);
  const components = useEditorStore((state) => state.components);
  const selectedWireId = useEditorStore((state) => state.selectedWireId);
  const selectWire = useEditorStore((state) => state.selectWire);
  const simulationState = useEditorStore((state) => state.simulationState);

  // Destructure sets for cleaner lookups
  const { livePhaseSet, neutralSet, earthSet, protectedPhaseSet, protectedNeutralSet } = simulationState;

  return (
    <Group>
      {wires.map((wire) => {
        const fromComp = components.find(c => c.id === wire.from.compId);
        const toComp = components.find(c => c.id === wire.to.compId);

        if (!fromComp || !toComp) return null;

        const start = getTerminalPos(fromComp, wire.from.terminalId);
        const end = getTerminalPos(toComp, wire.to.terminalId);
        const isSelected = selectedWireId === wire.id;
        
        const waypoints = wire.waypoints || [];
        const points = [
            start.x, start.y,
            ...waypoints.flatMap(p => [p.x, p.y]),
            end.x, end.y
        ];

        const fromRegistry = PART_REGISTRY[fromComp.type];
        const term = fromRegistry.terminals.find(t => t.id === wire.from.terminalId);
        
        let strokeColor = '#9CA3AF'; // Default Gray
        let dash = [];

        if (term) {
           const fromIdStr = `${wire.from.compId}:${wire.from.terminalId}`;
           const toIdStr = `${wire.to.compId}:${wire.to.terminalId}`;

           if (term.kind === TERMINAL_KINDS.PHASE) {
              const isEnergized = livePhaseSet.has(fromIdStr) && livePhaseSet.has(toIdStr);
              const isProtected = protectedPhaseSet && (protectedPhaseSet.has(fromIdStr) || protectedPhaseSet.has(toIdStr));
              
              if (isEnergized) {
                  strokeColor = isProtected ? '#EF4444' : '#B91C1C'; // Bright Red vs Dark Red
              } else {
                  strokeColor = '#4B5563'; // Dim gray
              }
           } else if (term.kind === TERMINAL_KINDS.NEUTRAL) {
              const isEnergized = neutralSet.has(fromIdStr) && neutralSet.has(toIdStr);
              const isProtected = protectedNeutralSet && (protectedNeutralSet.has(fromIdStr) || protectedNeutralSet.has(toIdStr));

              if (isEnergized) {
                  strokeColor = isProtected ? '#3B82F6' : '#1E3A8A'; // Bright Blue vs Dark Blue
              } else {
                  strokeColor = '#4B5563';
              }
           } else if (term.kind === TERMINAL_KINDS.EARTH) {
              const isEnergized = earthSet.has(fromIdStr) && earthSet.has(toIdStr);
              strokeColor = isEnergized ? '#10B981' : '#064E3B'; 
              if (!isEnergized) strokeColor = '#4B5563';
           }
        }

        if (isSelected) strokeColor = '#60A5FA'; 

        return (
          <Group key={wire.id}>
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
            <Line
              points={points}
              stroke={strokeColor} 
              strokeWidth={isSelected ? 4 : 2}
              dash={dash}
              lineCap="round"
              lineJoin="round"
              shadowColor={strokeColor !== '#4B5563' ? strokeColor : 'transparent'}
              shadowBlur={strokeColor !== '#4B5563' ? 5 : 0}
              shadowOpacity={0.5}
              listening={false}
            />
          </Group>
        );
      })}
    </Group>
  );
};