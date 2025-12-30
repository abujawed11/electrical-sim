import { COMPONENT_TYPES, TERMINAL_KINDS } from '../types';
import { PART_DEFINITIONS as PART_REGISTRY } from '../parts/partDefinitions';

/**
 * Recomputes the electrical network state.
 * Supports Single Phase, 3-Phase LV, and 11kV HV systems.
 * 
 * @param {Array} components - List of all components in the scene
 * @param {Array} wires - List of all wires
 * @param {Object} pqStatus - Optional { R, Y, B } boolean status
 * @returns {Object} { livePhaseSet, neutralSet, earthSet, phaseRSet, ... hvPhaseRSet ... }
 */
export const evaluateNetwork = (components, wires, pqStatus) => {
  // Default to all ON if no status provided
  const statusR = pqStatus ? pqStatus.R : true;
  const statusY = pqStatus ? pqStatus.Y : true;
  const statusB = pqStatus ? pqStatus.B : true;

  console.log('[EVAL NETWORK] Called with pqStatus:', pqStatus);
  console.log('[EVAL NETWORK] Phase R status:', statusR);
  console.log('[EVAL NETWORK] Phase Y status:', statusY);
  console.log('[EVAL NETWORK] Phase B status:', statusB);

  // Sets for energized terminals (LV)
  const phaseRSet = new Set();
  const phaseYSet = new Set();
  const phaseBSet = new Set();
  const livePhaseSet = new Set(); // Legacy/Union of LV R+Y+B+Generic
  
  // Sets for energized terminals (HV 11kV)
  const hvPhaseRSet = new Set();
  const hvPhaseYSet = new Set();
  const hvPhaseBSet = new Set();

  const neutralSet = new Set();
  const earthSet = new Set();
  
  const socketStates = {};
  const protectedPhaseSet = new Set();
  const protectedNeutralSet = new Set();

  // 1. Build Adjacency Graphs (Full Connectivity)
  const conductorGraph = new Map();
  const neutralGraph = new Map();
  const earthGraph = new Map();

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
      // Phase/Generic/HV wires conduct Phases
      if (term.kind.includes('PHASE') || term.kind === TERMINAL_KINDS.GENERIC) addEdge(conductorGraph, fromId, toId);
      // Neutral/Generic wires conduct Neutral
      if (term.kind === TERMINAL_KINDS.NEUTRAL || term.kind === TERMINAL_KINDS.GENERIC) addEdge(neutralGraph, fromId, toId);
      // Earth/Generic wires conduct Earth
      if (term.kind === TERMINAL_KINDS.EARTH || term.kind === TERMINAL_KINDS.GENERIC) addEdge(earthGraph, fromId, toId);
    }
  });

  // Add Internal Connections (Device Logic)
  const rccbList = [];

  components.forEach(comp => {
    const registryItem = PART_REGISTRY[comp.type];
    if (!registryItem) return;

    if (comp.type === COMPONENT_TYPES.MCB) {
      if (comp.properties.isOn) addEdge(conductorGraph, `${comp.id}:LIN`, `${comp.id}:LOUT`);
    } 
    else if (comp.type === COMPONENT_TYPES.SWITCH) {
      if (comp.properties.isOn) addEdge(conductorGraph, `${comp.id}:IN_L`, `${comp.id}:OUT_L`);
    } 
    else if (comp.type === COMPONENT_TYPES.METER) {
      addEdge(conductorGraph, `${comp.id}:IN_L`, `${comp.id}:OUT_L`);
      addEdge(neutralGraph, `${comp.id}:IN_N`, `${comp.id}:OUT_N`);
    } 
    else if (comp.type === COMPONENT_TYPES.RCCB || comp.type === COMPONENT_TYPES.RCBO) {
      rccbList.push(comp);
      if (comp.properties.isOn && !comp.properties.isTripped) {
         addEdge(conductorGraph, `${comp.id}:L_IN`, `${comp.id}:L_OUT`);
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
            if (t.id !== 'IN') addEdge(conductorGraph, `${comp.id}:IN`, `${comp.id}:${t.id}`);
         });
      }
    }
    else if (comp.type === COMPONENT_TYPES.JUNCTION_BOX) {
      const terms = registryItem.terminals;
      for (let i = 0; i < terms.length - 1; i++) {
          const u = `${comp.id}:${terms[i].id}`;
          const v = `${comp.id}:${terms[i+1].id}`;
          addEdge(conductorGraph, u, v);
          addEdge(neutralGraph, u, v);
          addEdge(earthGraph, u, v);
      }
    }
    else if (comp.type === COMPONENT_TYPES.CHANGEOVER) {
      if (comp.properties.position === 'MAINS') {
          addEdge(conductorGraph, `${comp.id}:A_L`, `${comp.id}:OUT_L`);
          addEdge(neutralGraph, `${comp.id}:A_N`, `${comp.id}:OUT_N`);
      } else if (comp.properties.position === 'INVERTER') {
          addEdge(conductorGraph, `${comp.id}:B_L`, `${comp.id}:OUT_L`);
          addEdge(neutralGraph, `${comp.id}:B_N`, `${comp.id}:OUT_N`);
      }
    }
    else if (comp.type === COMPONENT_TYPES.INVERTER) {
        if (comp.properties.isBypassMode) {
            addEdge(conductorGraph, `${comp.id}:AC_IN_L`, `${comp.id}:AC_OUT_L`);
            addEdge(neutralGraph, `${comp.id}:AC_IN_N`, `${comp.id}:AC_OUT_N`);
        }
    }
    else if (comp.type === COMPONENT_TYPES.MCB_3P) {
      if (comp.properties.isOn && !comp.properties.isTripped) {
          addEdge(conductorGraph, `${comp.id}:IN_R`, `${comp.id}:OUT_R`);
          addEdge(conductorGraph, `${comp.id}:IN_Y`, `${comp.id}:OUT_Y`);
          addEdge(conductorGraph, `${comp.id}:IN_B`, `${comp.id}:OUT_B`);
      }
    }
    else if (comp.type === COMPONENT_TYPES.ISOLATOR_3P) {
      if (comp.properties.isOn) {
          addEdge(conductorGraph, `${comp.id}:IN_R`, `${comp.id}:OUT_R`);
          addEdge(conductorGraph, `${comp.id}:IN_Y`, `${comp.id}:OUT_Y`);
          addEdge(conductorGraph, `${comp.id}:IN_B`, `${comp.id}:OUT_B`);
      }
    }
    else if (comp.type === COMPONENT_TYPES.METER_3P) {
      addEdge(conductorGraph, `${comp.id}:IN_R`, `${comp.id}:OUT_R`);
      addEdge(conductorGraph, `${comp.id}:IN_Y`, `${comp.id}:OUT_Y`);
      addEdge(conductorGraph, `${comp.id}:IN_B`, `${comp.id}:OUT_B`);
      addEdge(neutralGraph, `${comp.id}:IN_N`, `${comp.id}:OUT_N`);
    }
    else if ([COMPONENT_TYPES.BUSBAR_R, COMPONENT_TYPES.BUSBAR_Y, COMPONENT_TYPES.BUSBAR_B].includes(comp.type)) {
      const terms = registryItem.terminals;
      for (let i = 0; i < terms.length - 1; i++) {
          addEdge(conductorGraph, `${comp.id}:${terms[i].id}`, `${comp.id}:${terms[i+1].id}`);
      }
    }
  });

  // 2. Identify Primary Sources
  const phaseRSources = [];
  const phaseYSources = [];
  const phaseBSources = [];
  const genericPhaseSources = []; // For Single Phase Supply L
  const neutralSources = [];
  const earthSources = [];

  // HV Sources (11kV)
  const hvPhaseRSources = [];
  const hvPhaseYSources = [];
  const hvPhaseBSources = [];

  // 11kV Feeder
  components.filter(c => c.type === COMPONENT_TYPES.FEEDER_11KV && c.properties.enabled).forEach(s => {
      console.log('[EVAL NETWORK] 11kV Feeder found:', s.id);
      if (statusR) {
          hvPhaseRSources.push(`${s.id}:R`);
          console.log('[EVAL NETWORK]   R phase ENABLED - adding source');
      } else {
          console.log('[EVAL NETWORK]   R phase DISABLED - NOT adding source');
      }
      if (statusY) {
          hvPhaseYSources.push(`${s.id}:Y`);
          console.log('[EVAL NETWORK]   Y phase ENABLED - adding source');
      } else {
          console.log('[EVAL NETWORK]   Y phase DISABLED - NOT adding source');
      }
      if (statusB) {
          hvPhaseBSources.push(`${s.id}:B`);
          console.log('[EVAL NETWORK]   B phase ENABLED - adding source');
      } else {
          console.log('[EVAL NETWORK]   B phase DISABLED - NOT adding source');
      }
      earthSources.push(`${s.id}:E`);
  });

  // Single Phase Supplies (Treat as Phase R)
  components.filter(c => c.type === COMPONENT_TYPES.SUPPLY && c.properties.enabled).forEach(s => {
      if (statusR) genericPhaseSources.push(`${s.id}:L`);
      neutralSources.push(`${s.id}:N`);
      earthSources.push(`${s.id}:E`);
  });

  // 3-Phase Supplies
  components.filter(c => c.type === COMPONENT_TYPES.SUPPLY_3P && c.properties.enabled).forEach(s => {
      if (statusR) phaseRSources.push(`${s.id}:R`);
      if (statusY) phaseYSources.push(`${s.id}:Y`);
      if (statusB) phaseBSources.push(`${s.id}:B`);
      neutralSources.push(`${s.id}:N`);
      earthSources.push(`${s.id}:E`);
  });

  // Inverters
  components.filter(c =>
      c.type === COMPONENT_TYPES.INVERTER &&
      c.properties.enabled &&
      c.properties.socWh > 0 &&
      !c.properties.isBypassMode
  ).forEach(inv => {
      genericPhaseSources.push(`${inv.id}:AC_OUT_L`);
      neutralSources.push(`${inv.id}:AC_OUT_N`);
  });

  // 3. Propagation Helper
  const propagate = (sources, graph, resultSet) => {
    const queue = [...sources];
    sources.forEach(s => resultSet.add(s));
    while (queue.length > 0) {
      const current = queue.shift();
      const neighbors = graph.get(current) || [];
      neighbors.forEach(next => {
        if (!resultSet.has(next)) {
          resultSet.add(next);
          queue.push(next);
        }
      });
    }
  };

  // 4. Propagate HV Sources
  propagate(hvPhaseRSources, conductorGraph, hvPhaseRSet);
  propagate(hvPhaseYSources, conductorGraph, hvPhaseYSet);
  propagate(hvPhaseBSources, conductorGraph, hvPhaseBSet);

  // 5. Handle Transformers (HV -> LV)
  // Check if Primaries are energized by HV sets
  const transformers = components.filter(c => c.type === COMPONENT_TYPES.TRANSFORMER_3P);
  
  if (transformers.length > 0) {
      const txRSources = [];
      const txYSources = [];
      const txBSources = [];
      const txNSources = [];

      transformers.forEach(tx => {
          // Check Primary Energization via HV sets (Per-phase independent operation)
          // Each phase operates independently - partial phase loss is realistic in 3-phase systems
          const hasR = hvPhaseRSet.has(`${tx.id}:PRI_R`);
          const hasY = hvPhaseYSet.has(`${tx.id}:PRI_Y`);
          const hasB = hvPhaseBSet.has(`${tx.id}:PRI_B`);

          // Energize each secondary phase independently based on its primary
          if (hasR) {
              txRSources.push(`${tx.id}:SEC_R`);
          }
          if (hasY) {
              txYSources.push(`${tx.id}:SEC_Y`);
          }
          if (hasB) {
              txBSources.push(`${tx.id}:SEC_B`);
          }

          // Neutral available if at least one phase is present (star connection)
          if ((hasR || hasY || hasB) && tx.properties.connection && tx.properties.connection.endsWith('STAR')) {
              txNSources.push(`${tx.id}:SEC_N`);
          }
      });

      // Add Secondary Sources to LV Source Lists
      txRSources.forEach(s => phaseRSources.push(s));
      txYSources.forEach(s => phaseYSources.push(s));
      txBSources.forEach(s => phaseBSources.push(s));
      txNSources.forEach(s => neutralSources.push(s));
  }

  // 6. Propagate LV Sources
  propagate(phaseRSources, conductorGraph, phaseRSet);
  propagate(phaseYSources, conductorGraph, phaseYSet);
  propagate(phaseBSources, conductorGraph, phaseBSet);
  propagate(genericPhaseSources, conductorGraph, livePhaseSet);
  propagate(neutralSources, neutralGraph, neutralSet);
  propagate(earthSources, earthGraph, earthSet);

  // 7. Merge Sets for Legacy/Generic components
  phaseRSet.forEach(t => livePhaseSet.add(t));
  phaseYSet.forEach(t => livePhaseSet.add(t));
  phaseBSet.forEach(t => livePhaseSet.add(t));

  // 8. Protection Analysis (Isolated Graph for RCCB/RCBO)
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
      if (term.kind.includes('PHASE') || term.kind === TERMINAL_KINDS.GENERIC) addEdge(protPhaseGraph, fromId, toId);
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
      rccbPhaseOuts.push(`${rccb.id}:L_OUT`);
      rccbNeutralOuts.push(`${rccb.id}:N_OUT`);
  });

  propagate(rccbPhaseOuts, protPhaseGraph, protectedPhaseSet);
  propagate(rccbNeutralOuts, protNeutralGraph, protectedNeutralSet);

  // 9. Compute Socket States
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
          warning = 'NEUTRAL_BYPASS'; 
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

  return { 
    livePhaseSet, 
    neutralSet, 
    earthSet, 
    socketStates, 
    protectedPhaseSet, 
    protectedNeutralSet, 
    phaseRSet, 
    phaseYSet, 
    phaseBSet,
    hvPhaseRSet,
    hvPhaseYSet,
    hvPhaseBSet
  };
};
