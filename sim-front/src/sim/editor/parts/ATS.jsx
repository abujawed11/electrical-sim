import React from 'react';
import { Group, Rect, Text, Line, Circle } from 'react-konva';
import { PART_DEFINITIONS as PART_REGISTRY } from './partDefinitions';
import { useEditorStore } from '../store';
import { Terminal } from '../components/Terminal';

const COLORS = {
  bodyFill: '#1F2937',
  bodyStroke: '#111827',
  label: '#E5E7EB',
  grid: '#10B981',
  inv: '#F59E0B',
  neutral: '#9CA3AF',
  off: '#6B7280',
  selection: '#00A3FF',
};

const stateToUi = (state) => {
  switch (state) {
    case 'GRID_ACTIVE':
      return { text: 'GRID MODE', color: COLORS.grid, source: 'GRID' };
    case 'INVERTER_ACTIVE':
      return { text: 'INVERTER MODE', color: COLORS.inv, source: 'INVERTER' };
    case 'TRANSFER_TO_INVERTER':
      return { text: 'XFER → INV', color: COLORS.inv, source: 'NONE' };
    case 'TRANSFER_TO_GRID':
      return { text: 'XFER → GRID', color: COLORS.grid, source: 'NONE' };
    default:
      return { text: 'NO SUPPLY', color: COLORS.off, source: 'NONE' };
  }
};

export const ATS = ({ id, type, x, y, isSelected, properties, onSelect, onDragEnd }) => {
  const registryItem = PART_REGISTRY[type];
  const hoveredTerminal = useEditorStore((state) => state.hoveredTerminal);
  const setHoveredTerminal = useEditorStore((state) => state.setHoveredTerminal);
  const simulationState = useEditorStore((state) => state.simulationState);

  const { label, state } = properties;
  const ui = stateToUi(state);

  const showGridPath = state === 'GRID_ACTIVE';
  const showInvPath = state === 'INVERTER_ACTIVE';
  const showXferToInv = state === 'TRANSFER_TO_INVERTER';
  const showXferToGrid = state === 'TRANSFER_TO_GRID';

  return (
    <Group id={id} x={x} y={y} draggable onClick={onSelect} onTap={onSelect} onDragEnd={onDragEnd}>
      {isSelected && (
        <Rect width={120} height={110} stroke={COLORS.selection} strokeWidth={2} offset={{ x: 60, y: 55 }} />
      )}

      <Rect
        width={110}
        height={100}
        fill={COLORS.bodyFill}
        stroke={COLORS.bodyStroke}
        strokeWidth={2}
        cornerRadius={6}
        offset={{ x: 55, y: 50 }}
        shadowColor="black"
        shadowBlur={4}
        shadowOpacity={0.25}
        shadowOffset={{ x: 2, y: 2 }}
      />

      <Text
        text={label}
        fontSize={12}
        fontStyle="bold"
        fill={COLORS.label}
        y={-28}
        width={110}
        offsetX={55}
        align="center"
        listening={false}
      />

      {/* Zone labels */}
      <Text text="GRID IN" fontSize={9} fill={COLORS.neutral} x={-50} y={-55} width={50} align="center" listening={false} />
      <Text text="INV IN" fontSize={9} fill={COLORS.neutral} x={0} y={-55} width={50} align="center" listening={false} />
      <Text text="HOME OUT" fontSize={9} fill={COLORS.neutral} x={-25} y={55} width={50} align="center" listening={false} />

      {/* Contact points */}
      <Circle x={-20} y={-8} radius={2} fill={COLORS.neutral} listening={false} />
      <Circle x={20} y={-8} radius={2} fill={COLORS.neutral} listening={false} />
      <Circle x={0} y={25} radius={2} fill={COLORS.neutral} listening={false} />

      {/* Paths (break-before-make: only one solid at a time) */}
      {showGridPath && <Line points={[-20, -8, 0, 25]} stroke={COLORS.grid} strokeWidth={3} listening={false} />}
      {showInvPath && <Line points={[20, -8, 0, 25]} stroke={COLORS.inv} strokeWidth={3} listening={false} />}

      {/* Transfer preview (dashed) */}
      {showXferToInv && (
        <Line points={[20, -8, 0, 25]} stroke={COLORS.inv} strokeWidth={2} dash={[5, 3]} opacity={0.9} listening={false} />
      )}
      {showXferToGrid && (
        <Line points={[-20, -8, 0, 25]} stroke={COLORS.grid} strokeWidth={2} dash={[5, 3]} opacity={0.9} listening={false} />
      )}

      <Text
        text={ui.text}
        fontSize={10}
        fontStyle="bold"
        fill={ui.color}
        y={-5}
        width={110}
        offsetX={55}
        align="center"
        listening={false}
      />

      {registryItem.terminals.map((t) => {
        const terminalIdStr = `${id}:${t.id}`;
        let isEnergized = false;
        if (t.kind === 'PHASE') isEnergized = simulationState.livePhaseSet.has(terminalIdStr);
        if (t.kind === 'NEUTRAL') isEnergized = simulationState.neutralSet.has(terminalIdStr);
        if (t.kind === 'EARTH') isEnergized = simulationState.earthSet.has(terminalIdStr);

        return (
          <Terminal
            key={t.id}
            componentId={id}
            terminal={t}
            isHovered={hoveredTerminal?.compId === id && hoveredTerminal?.terminalId === t.id}
            isEnergized={isEnergized}
            onMouseEnter={() => setHoveredTerminal({ compId: id, terminalId: t.id })}
            onMouseLeave={() => setHoveredTerminal(null)}
          />
        );
      })}
    </Group>
  );
};

