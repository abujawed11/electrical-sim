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
  
  // Tool State
  const activeTool = useEditorStore((state) => state.activeTool);
  const measureCurrent = useEditorStore((state) => state.measureCurrent);
  const addProbePoint = useEditorStore((state) => state.addProbePoint);

  // Destructure sets for cleaner lookups
  const { livePhaseSet, neutralSet, earthSet, protectedPhaseSet, protectedNeutralSet, phaseRSet, phaseYSet, phaseBSet } = simulationState;

  const handleWireClick = (e, wire) => {
      e.cancelBubble = true;
      
      if (activeTool === 'AMMETER') {
          // Attempt to find relevant current
          // Strategy: Check endpoints. If one is a tracked device (Load/Breaker), use its current.
          // Priority: Load > Breaker > Source
          const loads = simulationState.deviceLoads || {};
          const fromHasLoad = !!loads[wire.from.compId];
          const toHasLoad = !!loads[wire.to.compId];
          
          let targetId = null;

          // Check if endpoints are Loads
          const fromType = components.find(c => c.id === wire.from.compId)?.type;
          const toType = components.find(c => c.id === wire.to.compId)?.type;
          
          const isLoad = (t) => [
              'LAMP', 'FAN', 'AC', 'HEATER', 'GEYSER', 'GENERIC_LOAD', 'LOAD_3P_BALANCED'
          ].includes(t);

          if (isLoad(toType)) targetId = wire.to.compId;
          else if (isLoad(fromType)) targetId = wire.from.compId;
          else if (toHasLoad && toType !== 'SUPPLY' && toType !== 'SUPPLY_3P') targetId = wire.to.compId; // Breaker?
          else if (fromHasLoad && fromType !== 'SUPPLY' && fromType !== 'SUPPLY_3P') targetId = wire.from.compId;
          else if (toType === 'SUPPLY' || toType === 'SUPPLY_3P') targetId = 'TOTAL_MAINS'; // Fallback to source total if connected to source
          else if (fromType === 'SUPPLY' || fromType === 'SUPPLY_3P') targetId = 'TOTAL_MAINS';
          
          if (targetId) {
              measureCurrent(targetId);
          } else {
              // No tracked device found (e.g. JB to JB without load context directly)
              // For MVP, show 0 or user must click closer to device
              measureCurrent(null); 
          }
          return;
      }

      if (activeTool === 'VOLTMETER') {
          // Wire is a node. Use 'from' terminal as reference.
          addProbePoint({ 
              type: 'wire', 
              compId: wire.from.compId, 
              terminalId: wire.from.terminalId,
              x: e.evt.layerX, // approximate for visual feedback if needed
              y: e.evt.layerY
          });
          return;
      }

      selectWire(wire.id);
  };

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

           if (term.kind === TERMINAL_KINDS.PHASE_R) {
              // Red Phase (R)
              const isEnergized = phaseRSet.has(fromIdStr) && phaseRSet.has(toIdStr);

              if (isEnergized) {
                  strokeColor = '#EF4444'; // Bright Red
              } else {
                  strokeColor = '#7F1D1D'; // Dark Red (not energized)
              }
           } else if (term.kind === TERMINAL_KINDS.PHASE_Y) {
              // Yellow Phase (Y)
              const isEnergized = phaseYSet.has(fromIdStr) && phaseYSet.has(toIdStr);

              if (isEnergized) {
                  strokeColor = '#FBBF24'; // Bright Yellow
              } else {
                  strokeColor = '#78350F'; // Dark Yellow/Amber (not energized)
              }
           } else if (term.kind === TERMINAL_KINDS.PHASE_B) {
              // Blue Phase (B)
              const isEnergized = phaseBSet.has(fromIdStr) && phaseBSet.has(toIdStr);

              if (isEnergized) {
                  strokeColor = '#3B82F6'; // Bright Blue
              } else {
                  strokeColor = '#1E3A8A'; // Dark Blue (not energized)
              }
           } else if (term.kind === TERMINAL_KINDS.PHASE) {
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
              onClick={(e) => handleWireClick(e, wire)}
              onTap={(e) => handleWireClick(e, wire)}
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