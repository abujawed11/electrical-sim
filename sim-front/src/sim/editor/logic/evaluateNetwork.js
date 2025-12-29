import { COMPONENT_TYPES, TERMINAL_KINDS } from '../types';
import { PART_DEFINITIONS as PART_REGISTRY } from '../parts/partDefinitions';

/**
 * Recomputes the electrical network state.
 * 
 * @param {Array} components - List of all components in the scene
 * @param {Array} wires - List of all wires
 * @returns {Object} { livePhaseSet, neutralSet, earthSet, socketStates, protectedPhaseSet, protectedNeutralSet }
 */
export const evaluateNetwork = (components, wires) => {
  const livePhaseSet = new Set();
  const neutralSet = new Set();
  const earthSet = new Set();
  const socketStates = {};

  // Sets for protection analysis
  const protectedPhaseSet = new Set();
  const protectedNeutralSet = new Set();

  // 1. Build Adjacency Graphs (Full Connectivity)
  const phaseGraph = new Map();
  const neutralGraph = new Map();
  const earthGraph = new Map();

  // Helper to add undirected edge
  const addEdge = (graph, nodeA, nodeB) => {
    if (!graph.has(nodeA)) graph.set(nodeA, []);
    if (!graph.has(nodeB)) graph.set(nodeB, []);
    graph.get(nodeA).push(nodeB);
    graph.get(nodeB).push(nodeA);
  };

  // Add Wire Connections
  wires.forEach(wire => {
    const fromId = `${wire.from.compId}:${wire.from.terminalId}`;
    const toId = `${wire.to.compId}:${wire.to.terminalId}`;
    const comp = components.find(c => c.id === wire.from.compId);
    if (!comp) return;
    const registry = PART_REGISTRY[comp.type];
    const term = registry.terminals.find(t => t.id === wire.from.terminalId);
    if (term) {
      if (term.kind === TERMINAL_KINDS.PHASE || term.kind === TERMINAL_KINDS.GENERIC) addEdge(phaseGraph, fromId, toId);
      if (term.kind === TERMINAL_KINDS.NEUTRAL || term.kind === TERMINAL_KINDS.GENERIC) addEdge(neutralGraph, fromId, toId);
      if (term.kind === TERMINAL_KINDS.EARTH || term.kind === TERMINAL_KINDS.GENERIC) addEdge(earthGraph, fromId, toId);
    }
  });

  // Add Internal Connections (Device Logic)
  // We track RCCBs to handle protection logic later
  const rccbList = [];

  components.forEach(comp => {
    const registryItem = PART_REGISTRY[comp.type];
    if (!registryItem) return;

    if (comp.type === COMPONENT_TYPES.MCB) {
      if (comp.properties.isOn) addEdge(phaseGraph, `${comp.id}:LIN`, `${comp.id}:LOUT`);
    } 
    else if (comp.type === COMPONENT_TYPES.SWITCH) {
      if (comp.properties.isOn) addEdge(phaseGraph, `${comp.id}:IN_L`, `${comp.id}:OUT_L`);
    } 
    else if (comp.type === COMPONENT_TYPES.METER) {
      addEdge(phaseGraph, `${comp.id}:IN_L`, `${comp.id}:OUT_L`);
      addEdge(neutralGraph, `${comp.id}:IN_N`, `${comp.id}:OUT_N`);
    } 
    else if (comp.type === COMPONENT_TYPES.RCCB || comp.type === COMPONENT_TYPES.RCBO) {
      rccbList.push(comp);
      if (comp.properties.isOn && !comp.properties.isTripped) {
         addEdge(phaseGraph, `${comp.id}:L_IN`, `${comp.id}:L_OUT`);
         addEdge(neutralGraph, `${comp.id}:N_IN`, `${comp.id}:N_OUT`);
      }
    }
    else if (comp.type === COMPONENT_TYPES.NEUTRAL_BAR) {
      const terms = registryItem.terminals;
      for (let i = 0; i < terms.length - 1; i++) addEdge(neutralGraph, `${comp.id}:${terms[i].id}`, `${comp.id}:${terms[i+1].id}`);
    } 
    else if (comp.type === COMPONENT_TYPES.EARTH_BAR) {
      const terms = registryItem.terminals;
      for (let i = 0; i < terms.length - 1; i++) addEdge(earthGraph, `${comp.id}:${terms[i].id}`, `${comp.id}:${terms[i+1].id}`);
    } 
    else if (comp.type === COMPONENT_TYPES.BUSBAR) {
      const terms = registryItem.terminals;
      const inT = terms.find(t => t.id === 'IN');
      if (inT) {
         terms.forEach(t => {
            if (t.id !== 'IN') addEdge(phaseGraph, `${comp.id}:IN`, `${comp.id}:${t.id}`);
         });
      }
    }
    else if (comp.type === COMPONENT_TYPES.JUNCTION_BOX) {
      // Connect all terminals to each other in ALL graphs
      const terms = registryItem.terminals;
      // Simple chain
      for (let i = 0; i < terms.length - 1; i++) {
          const u = `${comp.id}:${terms[i].id}`;
          const v = `${comp.id}:${terms[i+1].id}`;
          addEdge(phaseGraph, u, v);
          addEdge(neutralGraph, u, v);
          addEdge(earthGraph, u, v);
      }
    }
    else if (comp.type === COMPONENT_TYPES.CHANGEOVER) {
      if (comp.properties.position === 'MAINS') {
          addEdge(phaseGraph, `${comp.id}:A_L`, `${comp.id}:OUT_L`);
          addEdge(neutralGraph, `${comp.id}:A_N`, `${comp.id}:OUT_N`);
      } else if (comp.properties.position === 'INVERTER') {
          addEdge(phaseGraph, `${comp.id}:B_L`, `${comp.id}:OUT_L`);
          addEdge(neutralGraph, `${comp.id}:B_N`, `${comp.id}:OUT_N`);
      }
    }
    else if (comp.type === COMPONENT_TYPES.INVERTER) {
        if (comp.properties.isBypassMode) {
            addEdge(phaseGraph, `${comp.id}:AC_IN_L`, `${comp.id}:AC_OUT_L`);
            addEdge(neutralGraph, `${comp.id}:AC_IN_N`, `${comp.id}:AC_OUT_N`);
        }
    }
  });

  // 2. Identify Sources
  const supplies = components.filter(c => c.type === COMPONENT_TYPES.SUPPLY && c.properties.enabled);
  
  const phaseSources = [];
  const neutralSources = [];
  const earthSources = [];

  supplies.forEach(supply => {
    phaseSources.push(`${supply.id}:L`);
    neutralSources.push(`${supply.id}:N`);
    earthSources.push(`${supply.id}:E`);
  });

  // Inverter is a source ONLY if NOT in bypass mode (and enabled/charged)
  const inverters = components.filter(c => 
      c.type === COMPONENT_TYPES.INVERTER && 
      c.properties.enabled && 
      c.properties.socWh > 0 && 
      !c.properties.isOverloaded &&
      !c.properties.isBypassMode
  );

  inverters.forEach(inv => {
    phaseSources.push(`${inv.id}:AC_OUT_L`);
    neutralSources.push(`${inv.id}:AC_OUT_N`);
  });

  // 3. BFS Propagation (Energization)
  const propagate = (sources, graph, resultSets) => {
    const queue = [...sources];
    sources.forEach(s => resultSets.add(s));
    while (queue.length > 0) {
      const current = queue.shift();
      const neighbors = graph.get(current) || [];
      neighbors.forEach(next => {
        if (!resultSets.has(next)) {
          resultSets.add(next);
          queue.push(next);
        }
      });
    }
  };

  propagate(phaseSources, phaseGraph, livePhaseSet);
  propagate(neutralSources, neutralGraph, neutralSet);
  propagate(earthSources, earthGraph, earthSet);

  // 4. Protection Analysis (Isolated Graph)
  // We perform BFS starting from RCCB Outputs, but using a graph where RCCB internal edges are REMOVED.
  // This tells us "What is downstream of RCCB".
  // Note: We reuse the wire connections, but we must NOT use the RCCB internal edges we added above.
  // Easiest way: Rebuild graph without RCCB internals, or just clone and remove? 
  // Map clone is shallow. We need to copy array values. 
  // Better: Just build a "protectionGraph" from wires + non-RCCB devices.
  
  const protPhaseGraph = new Map();
  const protNeutralGraph = new Map();

  // Add wires again
  wires.forEach(wire => {
    const fromId = `${wire.from.compId}:${wire.from.terminalId}`;
    const toId = `${wire.to.compId}:${wire.to.terminalId}`;
    const comp = components.find(c => c.id === wire.from.compId);
    if (!comp) return;
    const registry = PART_REGISTRY[comp.type];
    const term = registry.terminals.find(t => t.id === wire.from.terminalId);
    if (term) {
      if (term.kind === TERMINAL_KINDS.PHASE || term.kind === TERMINAL_KINDS.GENERIC) addEdge(protPhaseGraph, fromId, toId);
      if (term.kind === TERMINAL_KINDS.NEUTRAL || term.kind === TERMINAL_KINDS.GENERIC) addEdge(protNeutralGraph, fromId, toId);
    }
  });

  // Add internal connections EXCEPT RCCB/RCBO
  components.forEach(comp => {
    const registryItem = PART_REGISTRY[comp.type];
    if (!registryItem) return;

    if (comp.type === COMPONENT_TYPES.MCB && comp.properties.isOn) addEdge(protPhaseGraph, `${comp.id}:LIN`, `${comp.id}:LOUT`);
    else if (comp.type === COMPONENT_TYPES.SWITCH && comp.properties.isOn) addEdge(protPhaseGraph, `${comp.id}:IN_L`, `${comp.id}:OUT_L`);
    else if (comp.type === COMPONENT_TYPES.METER) {
      addEdge(protPhaseGraph, `${comp.id}:IN_L`, `${comp.id}:OUT_L`);
      addEdge(protNeutralGraph, `${comp.id}:IN_N`, `${comp.id}:OUT_N`);
    }
    else if (comp.type === COMPONENT_TYPES.NEUTRAL_BAR) {
      const terms = registryItem.terminals;
      for (let i = 0; i < terms.length - 1; i++) addEdge(protNeutralGraph, `${comp.id}:${terms[i].id}`, `${comp.id}:${terms[i+1].id}`);
    } 
    else if (comp.type === COMPONENT_TYPES.BUSBAR) {
       const terms = registryItem.terminals;
       const inT = terms.find(t => t.id === 'IN');
       if (inT) {
          terms.forEach(t => {
             if (t.id !== 'IN') addEdge(protPhaseGraph, `${comp.id}:IN`, `${comp.id}:${t.id}`);
          });
       }
    }
    else if (comp.type === COMPONENT_TYPES.JUNCTION_BOX) {
      const terms = registryItem.terminals;
      for (let i = 0; i < terms.length - 1; i++) {
          const u = `${comp.id}:${terms[i].id}`;
          const v = `${comp.id}:${terms[i+1].id}`;
          addEdge(protPhaseGraph, u, v);
          addEdge(protNeutralGraph, u, v);
      }
    }
  });

  // Sources for Protection Sets: All RCCB/RCBO Outputs
  const rccbPhaseOuts = [];
  const rccbNeutralOuts = [];
  
  rccbList.forEach(rccb => {
      // Regardless of ON/OFF, the output side is the "Protected Zone" conceptually.
      // But physically, it's only energized if ON. 
      // We want to visualize "Protected Wiring" even if OFF? 
      // Prompt says "Neutral wires after RCCB highlighted as protected neutral".
      // Usually static property of topology.
      rccbPhaseOuts.push(`${rccb.id}:L_OUT`);
      rccbNeutralOuts.push(`${rccb.id}:N_OUT`);
  });

  propagate(rccbPhaseOuts, protPhaseGraph, protectedPhaseSet);
  propagate(rccbNeutralOuts, protNeutralGraph, protectedNeutralSet);

  // 5. Compute Socket States
  components.forEach(comp => {
    if (comp.type === COMPONENT_TYPES.SOCKET) {
      const hasL = livePhaseSet.has(`${comp.id}:L`);
      const hasN = neutralSet.has(`${comp.id}:N`);
      const hasE = earthSet.has(`${comp.id}:E`);
      
      const isProtL = protectedPhaseSet.has(`${comp.id}:L`);
      const isProtN = protectedNeutralSet.has(`${comp.id}:N`);

      let status = 'DEAD'; 
      let warning = null;

      if (hasL && hasN && hasE) {
        status = 'LIVE_OK';
      } else if (hasL && hasN && !hasE) {
        status = 'NO_EARTH';
      } else if (hasL && !hasN) {
        status = 'NO_NEUTRAL';
      } else if (!hasL) {
        status = 'NO_PHASE';
      }

      // Bypass Check
      if (isProtL && !isProtN && hasN) {
          // It has Phase from RCCB, but Neutral NOT from RCCB (but has Neutral from somewhere, likely raw)
          warning = 'NEUTRAL_BYPASS'; 
          // Override status to indicate fault/warning visual?
          // The socket works, but is unsafe.
          status = 'UNSAFE_BYPASS';
      }

      socketStates[comp.id] = {
        hasPhase: hasL,
        hasNeutral: hasN,
        hasEarth: hasE,
        status,
        warning
      };
    }
  });

  return { livePhaseSet, neutralSet, earthSet, socketStates, protectedPhaseSet, protectedNeutralSet };
};
