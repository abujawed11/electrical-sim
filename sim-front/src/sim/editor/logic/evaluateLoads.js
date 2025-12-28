import { COMPONENT_TYPES, TERMINAL_KINDS } from '../types';
import { PART_DEFINITIONS as PART_REGISTRY } from '../parts/partDefinitions';

/**
 * Calculates current draw and load distribution with Power Factor.
 * 
 * @param {Array} components 
 * @param {Array} wires 
 * @param {Object} simulationState { livePhaseSet, neutralSet }
 * @param {Number} mainsVoltage
 * @returns {Object} { loadData, deviceLoads, totalSystemPowerW }
 */
export const evaluateLoads = (components, wires, simulationState, mainsVoltage) => {
  const loadData = {}; 
  const deviceLoads = { 
      'TOTAL_MAINS': { I_real: 0, I_imag: 0, currentA: 0, P: 0, S: 0, Q: 0 } 
  }; 
  let totalSystemPowerW = 0;

  const { livePhaseSet, neutralSet } = simulationState;

  // 1. Build Phase Graph
  const phaseGraph = new Map();
  wires.forEach(w => {
      const u = `${w.from.compId}:${w.from.terminalId}`;
      const v = `${w.to.compId}:${w.to.terminalId}`;
      if (!phaseGraph.has(u)) phaseGraph.set(u, []);
      if (!phaseGraph.has(v)) phaseGraph.set(v, []);
      phaseGraph.get(u).push(v);
      phaseGraph.get(v).push(u);
  });

  components.forEach(c => {
      const isClosed = (c.properties.isOn && !c.properties.isTripped);
      if (c.type === COMPONENT_TYPES.MCB && isClosed) addInternal(phaseGraph, c.id, 'LOUT', 'LIN');
      else if ((c.type === COMPONENT_TYPES.RCCB || c.type === COMPONENT_TYPES.RCBO) && isClosed) addInternal(phaseGraph, c.id, 'L_OUT', 'L_IN');
      else if (c.type === COMPONENT_TYPES.SWITCH && c.properties.isOn) addInternal(phaseGraph, c.id, 'OUT_L', 'IN_L');
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

  // 2. Identify Loads
  components.forEach(comp => {
      if ([COMPONENT_TYPES.LAMP, COMPONENT_TYPES.GENERIC_LOAD, COMPONENT_TYPES.FAN, COMPONENT_TYPES.AC, COMPONENT_TYPES.HEATER, COMPONENT_TYPES.GEYSER].includes(comp.type)) {
          const P = comp.properties.powerW || 0;
          const pf = comp.properties.powerFactor || 1.0;
          const type = comp.properties.loadType || 'RESISTIVE';
          
          const termL = `${comp.id}:L`;
          const termN = `${comp.id}:N`;
          
          const isPowered = livePhaseSet.has(termL) && neutralSet.has(termN);
          
          // Calculations
          const S = isPowered ? P / pf : 0;
          const I = isPowered ? S / mainsVoltage : 0;
          let Q = isPowered ? Math.sqrt(Math.max(0, S*S - P*P)) : 0;
          
          if (type === 'CAPACITIVE') Q = -Q;

          // Components of Current
          // I_real = I * pf
          // I_imag = I * sin(acos(pf)) ... approx Q/V
          const I_real = isPowered ? (P / mainsVoltage) : 0;
          const I_imag = isPowered ? (Q / mainsVoltage) : 0;

          loadData[comp.id] = {
              currentA: I,
              powerW: P,
              apparentVA: S,
              reactiveVAR: Q,
              powerFactor: pf,
              isPowered,
              I_real,
              I_imag
          };

          if (isPowered) {
              totalSystemPowerW += P;
              
              const addToDevice = (id) => {
                  if (!deviceLoads[id]) deviceLoads[id] = { I_real: 0, I_imag: 0, currentA: 0, P: 0, S: 0, Q: 0 };
                  deviceLoads[id].I_real += I_real;
                  deviceLoads[id].I_imag += I_imag;
                  deviceLoads[id].P += P;
                  deviceLoads[id].Q += Q;
                  // Recompute RMS magnitude
                  deviceLoads[id].currentA = Math.sqrt(deviceLoads[id].I_real**2 + deviceLoads[id].I_imag**2);
                  deviceLoads[id].S = Math.sqrt(deviceLoads[id].P**2 + deviceLoads[id].Q**2);
              };

              addToDevice('TOTAL_MAINS');
              
              const breakers = findUpstreamBreakers(termL, phaseGraph, components);
              breakers.forEach(bId => addToDevice(bId));
          }
      }
  });

  return { loadData, deviceLoads, totalSystemPowerW };
};

function findUpstreamBreakers(startNode, graph, components) {
    const breakers = new Set();
    const queue = [startNode];
    const visited = new Set();
    visited.add(startNode);

    while (queue.length > 0) {
        const current = queue.shift();
        const [compId, termId] = current.split(':');
        const comp = components.find(c => c.id === compId);

        if (comp) {
            if ((comp.type === COMPONENT_TYPES.MCB || comp.type === COMPONENT_TYPES.RCCB || comp.type === COMPONENT_TYPES.RCBO) 
                && (termId === 'LOUT' || termId === 'L_OUT')) {
                breakers.add(comp.id);
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
    return Array.from(breakers);
}