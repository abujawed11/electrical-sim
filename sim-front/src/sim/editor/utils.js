import { PART_DEFINITIONS as PART_REGISTRY } from './parts/partDefinitions';

export const getTerminalPos = (component, terminalId) => {
  if (!component) return { x: 0, y: 0 };
  const registryItem = PART_REGISTRY[component.type];
  if (!registryItem) return { x: 0, y: 0 };
  
  const terminal = registryItem.terminals.find(t => t.id === terminalId);
  if (!terminal) return { x: 0, y: 0 };

  // Assume 0 rotation for now as per instructions
  return {
    x: component.x + terminal.relX,
    y: component.y + terminal.relY,
  };
};
