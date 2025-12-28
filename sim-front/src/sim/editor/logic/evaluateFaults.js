import { COMPONENT_TYPES, TERMINAL_KINDS } from '../types';
import { PART_DEFINITIONS as PART_REGISTRY } from '../parts/partDefinitions';

/**
 * Evaluates active faults and returns components to trip.
 * 
 * @param {Array} components 
 * @param {Array} wires 
 * @param {Object} simulationState { livePhaseSet, neutralSet, earthSet }
 * @returns {Array} List of { id, propertyUpdates, reason }
 */
export const evaluateFaults = (components, wires, simulationState) => {
  const tripActions = [];
  const { livePhaseSet, neutralSet, earthSet } = simulationState;

  // Helper: Build an upstream graph for Phase to trace back to source
  // We need to know "Who feeds whom?". 
  // We can just use the wire list and traverse.
  const phaseGraph = new Map(); // node -> [neighbors]
  wires.forEach(w => {
      const u = `${w.from.compId}:${w.from.terminalId}`;
      const v = `${w.to.compId}:${w.to.terminalId}`;
      if (!phaseGraph.has(u)) phaseGraph.set(u, []);
      if (!phaseGraph.has(v)) phaseGraph.set(v, []);
      phaseGraph.get(u).push(v);
      phaseGraph.get(v).push(u);
  });
  
  // Also add internal connections for closed switches/breakers to allow tracing through them
  components.forEach(c => {
      if ((c.type === COMPONENT_TYPES.MCB || c.type === COMPONENT_TYPES.RCCB || c.type === COMPONENT_TYPES.RCBO) && c.properties.isOn && !c.properties.isTripped) {
           // L_OUT -> L_IN (upstream direction usually, but graph is undirected)
           // For tracing "upstream", we just need connectivity.
           if (c.type === COMPONENT_TYPES.MCB) {
               addInternal(phaseGraph, c.id, 'LOUT', 'LIN');
           } else {
               addInternal(phaseGraph, c.id, 'L_OUT', 'L_IN');
           }
      }
      else if (c.type === COMPONENT_TYPES.METER) {
          addInternal(phaseGraph, c.id, 'OUT_L', 'IN_L');
      }
      // Busbars are already effectively nodes via wires or we can treat as one.
      // Wires connected to Busbar are connected.
      // If we treat Busbar terminals as separate nodes, we need internal edges for Busbar too.
      else if (c.type === COMPONENT_TYPES.BUSBAR) {
          // Connect all to IN
          const registry = PART_REGISTRY[c.type];
          const terms = registry.terminals;
          terms.forEach(t => {
              if (t.id !== 'IN') addInternal(phaseGraph, c.id, t.id, 'IN');
          });
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

  // --- Fault Detection ---

  // 1. Short Circuit (L-N)
  const shortFaults = components.filter(c => c.type === COMPONENT_TYPES.FAULT_SHORT_LN);
  shortFaults.forEach(fault => {
      const termA = `${fault.id}:A`;
      const termB = `${fault.id}:B`;
      
      // Check if active: A has Phase AND B has Neutral
      if (livePhaseSet.has(termA) && neutralSet.has(termB)) {
          // Find upstream breaker
          const breaker = findUpstreamBreaker(termA, phaseGraph, components, 'SHORT');
          if (breaker) {
              tripActions.push({ 
                  id: breaker.id, 
                  updates: { isTripped: true, isOn: false }, 
                  reason: 'SHORT_CIRCUIT',
                  msg: `Short Circuit detected! Tripped ${breaker.properties.label}`
              });
          }
      }
  });

  // 2. Leakage (L-E) and Human Shock
  const leakageFaults = components.filter(c => c.type === COMPONENT_TYPES.FAULT_LEAK_LE || c.type === COMPONENT_TYPES.HUMAN_BODY);
  leakageFaults.forEach(fault => {
      // Different terminals for human vs fault part
      const tA = fault.type === COMPONENT_TYPES.HUMAN_BODY ? 'HAND' : 'A';
      const tB = fault.type === COMPONENT_TYPES.HUMAN_BODY ? 'FEET' : 'B';
      
      const termA = `${fault.id}:${tA}`;
      const termB = `${fault.id}:${tB}`;

      if (livePhaseSet.has(termA) && earthSet.has(termB)) {
          // Find upstream RCCB/RCBO
          const breaker = findUpstreamBreaker(termA, phaseGraph, components, 'LEAKAGE');
          if (breaker) {
              const reason = fault.type === COMPONENT_TYPES.HUMAN_BODY ? 'SHOCK_DETECTED' : 'EARTH_LEAKAGE';
              tripActions.push({ 
                  id: breaker.id, 
                  updates: { isTripped: true, isOn: false }, 
                  reason: reason,
                  msg: `${reason === 'SHOCK_DETECTED' ? 'Shock Risk' : 'Leakage'} detected! Tripped ${breaker.properties.label}`
              });
          }
      }
  });

  return tripActions;
};

// BFS to find nearest upstream protection device
function findUpstreamBreaker(startNode, graph, components, faultType) {
    // We want the *first* breaker we hit when walking back towards source?
    // Actually, "upstream" means closer to source.
    // If we walk from Fault -> Device A -> Device B -> Source
    // Device A is closer to Fault. Device A should trip first (selectivity).
    // So BFS from Fault node is correct.
    
    const queue = [startNode];
    const visited = new Set();
    visited.add(startNode);
    
    // We might hit multiple paths. We want the one that leads to Source?
    // In a tree structure, any path up goes to source.
    // In a ring, it's complex. Assume tree/radial for house wiring.
    
    while (queue.length > 0) {
        const current = queue.shift();
        
        // Parse current node
        const [compId, termId] = current.split(':');
        const comp = components.find(c => c.id === compId);
        
        if (comp) {
            // Check if this component is a protection device capable of clearing this fault
            // And we must have entered from its OUTPUT side to consider it "Upstream".
            // MCB: Enter from LOUT, Exit LIN.
            // RCCB: Enter from L_OUT, Exit L_IN.
            
            // How do we know which terminal we entered?
            // BFS just gives current node. `termId` is the terminal we are at.
            
            // If we are at an OUTPUT terminal of a breaker, then the breaker is upstream of us.
            // (Assuming current flows Source -> Input -> Output -> Load)
            
            if (faultType === 'SHORT') {
                if (comp.type === COMPONENT_TYPES.MCB && termId === 'LOUT') return comp;
                if (comp.type === COMPONENT_TYPES.RCBO && termId === 'L_OUT') return comp;
            }
            if (faultType === 'LEAKAGE') {
                if (comp.type === COMPONENT_TYPES.RCCB && termId === 'L_OUT') return comp;
                if (comp.type === COMPONENT_TYPES.RCBO && termId === 'L_OUT') return comp;
            }
        }
        
        const neighbors = graph.get(current) || [];
        for (const next of neighbors) {
            if (!visited.has(next)) {
                visited.add(next);
                queue.push(next);
            }
        }
    }
    
    return null;
}
