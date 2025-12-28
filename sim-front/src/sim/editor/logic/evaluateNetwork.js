import { COMPONENT_TYPES, TERMINAL_KINDS } from '../types';
import { PART_REGISTRY } from '../parts/partRegistry';

/**
 * Recomputes the electrical network state.
 * 
 * @param {Array} components - List of all components in the scene
 * @param {Array} wires - List of all wires
 * @returns {Object} { livePhaseSet, neutralSet, earthSet, socketStates }
 * 
 * Sets contain strings in the format: "${compId}:${terminalId}"
 */
export const evaluateNetwork = (components, wires) => {
  const livePhaseSet = new Set();
  const neutralSet = new Set();
  const earthSet = new Set();
  const socketStates = {};

  // 1. Build Adjacency Graphs
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

  // Add Wire Connections (Topology)
  wires.forEach(wire => {
    const fromId = `${wire.from.compId}:${wire.from.terminalId}`;
    const toId = `${wire.to.compId}:${wire.to.terminalId}`;
    
    // Determine kind based on terminal definitions
    const comp = components.find(c => c.id === wire.from.compId);
    if (!comp) return;
    const registry = PART_REGISTRY[comp.type];
    const term = registry.terminals.find(t => t.id === wire.from.terminalId);
    
    if (term) {
      if (term.kind === TERMINAL_KINDS.PHASE) addEdge(phaseGraph, fromId, toId);
      if (term.kind === TERMINAL_KINDS.NEUTRAL) addEdge(neutralGraph, fromId, toId);
      if (term.kind === TERMINAL_KINDS.EARTH) addEdge(earthGraph, fromId, toId);
    }
  });

  // Add Internal Connections (Device Logic)
  components.forEach(comp => {
    const registryItem = PART_REGISTRY[comp.type];
    if (!registryItem) return;

    if (comp.type === COMPONENT_TYPES.MCB) {
      if (comp.properties.isOn) {
        addEdge(phaseGraph, `${comp.id}:LIN`, `${comp.id}:LOUT`);
      }
    } else if (comp.type === COMPONENT_TYPES.SWITCH) {
      if (comp.properties.isOn) {
        addEdge(phaseGraph, `${comp.id}:IN_L`, `${comp.id}:OUT_L`);
      }
    } else if (comp.type === COMPONENT_TYPES.METER) {
      addEdge(phaseGraph, `${comp.id}:IN_L`, `${comp.id}:OUT_L`);
      addEdge(neutralGraph, `${comp.id}:IN_N`, `${comp.id}:OUT_N`);
    } else if (comp.type === COMPONENT_TYPES.NEUTRAL_BAR) {
      // Connect all N terminals together
      const terms = registryItem.terminals;
      for (let i = 0; i < terms.length - 1; i++) {
        addEdge(neutralGraph, `${comp.id}:${terms[i].id}`, `${comp.id}:${terms[i+1].id}`);
      }
    } else if (comp.type === COMPONENT_TYPES.EARTH_BAR) {
      // Connect all E terminals together
      const terms = registryItem.terminals;
      for (let i = 0; i < terms.length - 1; i++) {
        addEdge(earthGraph, `${comp.id}:${terms[i].id}`, `${comp.id}:${terms[i+1].id}`);
      }
    } else if (comp.type === COMPONENT_TYPES.BUSBAR) {
      // Connect IN to all OUTs (chain them or star)
      // Let's star them from IN for simplicity or chain. 
      // Chaining is safer against recursion depth if many nodes? Not really.
      // Star from IN:
      const terms = registryItem.terminals;
      const inT = terms.find(t => t.id === 'IN');
      if (inT) {
         terms.forEach(t => {
            if (t.id !== 'IN') {
               addEdge(phaseGraph, `${comp.id}:IN`, `${comp.id}:${t.id}`);
            }
         });
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

  // 3. BFS Propagation
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

  // 4. Compute Socket States (and maybe Lamp states if we want to export them, but they calculate locally)
  components.forEach(comp => {
    if (comp.type === COMPONENT_TYPES.SOCKET) {
      const hasL = livePhaseSet.has(`${comp.id}:L`);
      const hasN = neutralSet.has(`${comp.id}:N`);
      const hasE = earthSet.has(`${comp.id}:E`);

      let status = 'DEAD'; // Gray
      if (hasL && hasN && hasE) {
        status = 'LIVE_OK'; // Green
      } else if (hasL && hasN && !hasE) {
        status = 'NO_EARTH'; // Orange
      } else if (hasL && !hasN) {
        status = 'NO_NEUTRAL'; // Orange
      } else if (!hasL) {
        status = 'NO_PHASE'; // Gray/Dead
      }

      socketStates[comp.id] = {
        hasPhase: hasL,
        hasNeutral: hasN,
        hasEarth: hasE,
        status,
      };
    }
  });

  return { livePhaseSet, neutralSet, earthSet, socketStates };
};