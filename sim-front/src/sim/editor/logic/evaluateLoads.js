import { COMPONENT_TYPES, TERMINAL_KINDS } from '../types';
import { PART_REGISTRY } from '../parts/partRegistry';

/**
 * Calculates current draw and load distribution.
 * 
 * @param {Array} components 
 * @param {Array} wires 
 * @param {Object} simulationState { livePhaseSet, neutralSet }
 * @param {Number} mainsVoltage
 * @returns {Object} { loadData: { compId: { currentA, powerW, isPowered } }, deviceLoads: { compId: totalA }, totalSystemPowerW: number }
 */
export const evaluateLoads = (components, wires, simulationState, mainsVoltage) => {
  const loadData = {}; // Per load component
  const deviceLoads = { 'TOTAL_MAINS': 0 }; // Per protection device + total
  let totalSystemPowerW = 0;

  const { livePhaseSet, neutralSet } = simulationState;

  // 1. Build Phase Graph for Upstream Tracing
  const phaseGraph = new Map();
  wires.forEach(w => {
      const u = `${w.from.compId}:${w.from.terminalId}`;
      const v = `${w.to.compId}:${w.to.terminalId}`;
      if (!phaseGraph.has(u)) phaseGraph.set(u, []);
      if (!phaseGraph.has(v)) phaseGraph.set(v, []);
      phaseGraph.get(u).push(v);
      phaseGraph.get(v).push(u);
  });

  // Add internal connections for CLOSED devices to allow tracing through them
  components.forEach(c => {
      const isClosed = (c.properties.isOn && !c.properties.isTripped);
      if (c.type === COMPONENT_TYPES.MCB && isClosed) addInternal(phaseGraph, c.id, 'LOUT', 'LIN');
      else if ((c.type === COMPONENT_TYPES.RCCB || c.type === COMPONENT_TYPES.RCBO) && isClosed) addInternal(phaseGraph, c.id, 'L_OUT', 'L_IN');
      else if (c.type === COMPONENT_TYPES.SWITCH && c.properties.isOn) addInternal(phaseGraph, c.id, 'OUT_L', 'IN_L'); // Switch direction? usually IN->OUT
      else if (c.type === COMPONENT_TYPES.METER) addInternal(phaseGraph, c.id, 'OUT_L', 'IN_L');
      else if (c.type === COMPONENT_TYPES.BUSBAR) {
          const terms = PART_REGISTRY[c.type].terminals;
          terms.forEach(t => { if(t.id !== 'IN') addInternal(phaseGraph, c.id, t.id, 'IN'); });
      }
  });

  function addInternal(graph, compId, t1, t2) {
      const u = `${compId}:${t1}`;
      const v = `${compId}:${t2}`;
      if (!graph.has(u)) graph.set(u, []);
      if (!graph.has(v)) graph.set(v, []);
      graph.get(u).push(v);
      graph.get(v).push(u);
  }

  // 2. Identify Loads and Calculate Current
  components.forEach(comp => {
      if (comp.type === COMPONENT_TYPES.LAMP || comp.type === COMPONENT_TYPES.GENERIC_LOAD) {
          const powerW = comp.properties.powerW || 0;
          const termL = `${comp.id}:L`;
          const termN = `${comp.id}:N`;
          
          const isPowered = livePhaseSet.has(termL) && neutralSet.has(termN);
          const currentA = isPowered ? (powerW / mainsVoltage) : 0;

          loadData[comp.id] = {
              currentA,
              powerW,
              isPowered,
              resistance: powerW > 0 ? (mainsVoltage * mainsVoltage / powerW) : Infinity
          };

          if (isPowered) {
              totalSystemPowerW += powerW; // Accumulate Wattage
              if (currentA > 0) {
                  deviceLoads['TOTAL_MAINS'] = (deviceLoads['TOTAL_MAINS'] || 0) + currentA;
                  
                  // 3. Attribute load to upstream breakers
                  const breakers = findUpstreamBreakers(termL, phaseGraph, components);
                  breakers.forEach(bId => {
                      deviceLoads[bId] = (deviceLoads[bId] || 0) + currentA;
                  });
              }
          }
      }
  });

  return { loadData, deviceLoads, totalSystemPowerW };
};

// BFS to find ALL upstream protection devices
function findUpstreamBreakers(startNode, graph, components) {
    const breakers = new Set();
    const queue = [startNode];
    const visited = new Set();
    visited.add(startNode);

    while (queue.length > 0) {
        const current = queue.shift();
        const [compId, termId] = current.split(':');
        const comp = components.find(c => c.id === compId);

        // Check if we just traversed OUT of a breaker (meaning we entered its OUTPUT side)
        // This logic is tricky with undirected graph. 
        // We need to know if we are "passing through" or just "touching".
        // Actually, if we are at the OUTPUT terminal of a breaker, then that breaker feeds this point.
        if (comp) {
            if (comp.type === COMPONENT_TYPES.MCB && termId === 'LOUT') breakers.add(comp.id);
            if (comp.type === COMPONENT_TYPES.RCBO && termId === 'L_OUT') breakers.add(comp.id);
            if (comp.type === COMPONENT_TYPES.RCCB && termId === 'L_OUT') breakers.add(comp.id);
        }

        const neighbors = graph.get(current) || [];
        for (const next of neighbors) {
            if (!visited.has(next)) {
                visited.add(next);
                queue.push(next);
            }
        }
    }
    return Array.from(breakers);
}
