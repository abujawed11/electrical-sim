import { COMPONENT_TYPES, TERMINAL_KINDS } from '../types';
import { PART_DEFINITIONS as PART_REGISTRY } from '../parts/partDefinitions';

/**
 * Calculates current draw and load distribution with Power Factor.
 * 
 * @param {Array} components 
 * @param {Array} wires 
 * @param {Object} simulationState { livePhaseSet, neutralSet }
 * @param {Object|Number} voltages - { R, Y, B } or scalar (legacy)
 * @returns {Object} { loadData, deviceLoads, totalSystemPowerW, phaseCurrents }
 */
export const evaluateLoads = (components, wires, simulationState, voltages) => {
  const loadData = {};
  const deviceLoads = {
      'TOTAL_MAINS': { I_real: 0, I_imag: 0, currentA: 0, P: 0, S: 0, Q: 0 },
      'TOTAL_INVERTER': { I_real: 0, I_imag: 0, currentA: 0, P: 0, S: 0, Q: 0 }
  };
  let totalSystemPowerW = 0;
  
  // Track total current per phase (RMS sum approx or scalar sum for worst case sag?)
  // For voltage sag V = V0 - I*R, we usually want scalar sum of currents if PF~1, or |I_complex|.
  // We'll track scalar RMS sum for simplicity in Sag Model.
  const phaseCurrents = { R: 0, Y: 0, B: 0 };

  // Normalize voltages
  const V_R = (typeof voltages === 'object') ? voltages.R : voltages;
  const V_Y = (typeof voltages === 'object') ? voltages.Y : voltages;
  const V_B = (typeof voltages === 'object') ? voltages.B : voltages;
  // Fallback for Generic
  const V_Gen = V_R; 

  const { livePhaseSet, neutralSet, phaseRSet, phaseYSet, phaseBSet } = simulationState;

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
      else if (c.type === COMPONENT_TYPES.INVERTER && c.properties.enabled && c.properties.isBypassMode) {
          addInternal(phaseGraph, c.id, 'AC_IN_L', 'AC_OUT_L');
      }
      else if (c.type === COMPONENT_TYPES.BUSBAR) {
          const terms = PART_REGISTRY[c.type].terminals;
          terms.forEach(t => { if(t.id !== 'IN') addInternal(phaseGraph, c.id, t.id, 'IN'); });
      }
      else if (c.type === COMPONENT_TYPES.JUNCTION_BOX) {
          const terms = PART_REGISTRY[c.type].terminals;
          for (let i = 0; i < terms.length - 1; i++) {
              addInternal(phaseGraph, c.id, terms[i].id, terms[i+1].id);
          }
      }
      else if (c.type === COMPONENT_TYPES.CHANGEOVER) {
          if (c.properties.position === 'MAINS') {
             addInternal(phaseGraph, c.id, 'A_L', 'OUT_L');
          } else {
             addInternal(phaseGraph, c.id, 'B_L', 'OUT_L');
          }
      }
      else if (c.type === COMPONENT_TYPES.MCB_3P && isClosed) {
          addInternal(phaseGraph, c.id, 'OUT_R', 'IN_R');
          addInternal(phaseGraph, c.id, 'OUT_Y', 'IN_Y');
          addInternal(phaseGraph, c.id, 'OUT_B', 'IN_B');
      }
      else if (c.type === COMPONENT_TYPES.METER_3P) {
          addInternal(phaseGraph, c.id, 'OUT_R', 'IN_R');
          addInternal(phaseGraph, c.id, 'OUT_Y', 'IN_Y');
          addInternal(phaseGraph, c.id, 'OUT_B', 'IN_B');
      }
      else if (c.type === COMPONENT_TYPES.ISOLATOR_3P && c.properties.isOn) {
          addInternal(phaseGraph, c.id, 'OUT_R', 'IN_R');
          addInternal(phaseGraph, c.id, 'OUT_Y', 'IN_Y');
          addInternal(phaseGraph, c.id, 'OUT_B', 'IN_B');
      }
      else if ([COMPONENT_TYPES.BUSBAR_R, COMPONENT_TYPES.BUSBAR_Y, COMPONENT_TYPES.BUSBAR_B].includes(c.type)) {
          const terms = PART_REGISTRY[c.type].terminals;
          for (let i = 0; i < terms.length - 1; i++) {
              addInternal(phaseGraph, c.id, terms[i].id, terms[i+1].id);
          }
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
          
          // Determine Voltage & Phase
          let V = V_Gen;
          let phase = 'R'; // Default to R for generic/unknown

          if (phaseRSet.has(termL)) { V = V_R; phase = 'R'; }
          else if (phaseYSet.has(termL)) { V = V_Y; phase = 'Y'; }
          else if (phaseBSet.has(termL)) { V = V_B; phase = 'B'; }
          
          // Calculations
          // Avoid div/0
          const effV = V < 1 ? 1 : V;
          
          const S = isPowered ? P / pf : 0;
          const I = isPowered ? S / effV : 0;
          let Q = isPowered ? Math.sqrt(Math.max(0, S*S - P*P)) : 0;
          
          if (type === 'CAPACITIVE') Q = -Q;

          // Components of Current
          // I_real = I * pf
          // I_imag = I * sin(acos(pf)) ... approx Q/V
          const I_real = isPowered ? (P / effV) : 0;
          const I_imag = isPowered ? (Q / effV) : 0;

          if (isPowered) {
              phaseCurrents[phase] += I;
          }

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

              // Identify Source
              const { hasMains, inverterIds } = findUpstreamSources(termL, phaseGraph, components);
              // If Mains is reachable, it is the active source (inverter may still show voltage via bypass).
              if (hasMains) {
                  addToDevice('TOTAL_MAINS');
              } else if (inverterIds.length > 0) {
                  // Only count "inverter current" when the inverter is actively supplying (not bypass mode).
                  addToDevice(inverterIds[0]);
                  addToDevice('TOTAL_INVERTER');
              } else {
                  // Powered but no explicit source detected; default to MAINS to avoid false inverter drain.
                  addToDevice('TOTAL_MAINS');
              }
              
              const breakers = findUpstreamBreakers(termL, phaseGraph, components);
              breakers.forEach(bId => addToDevice(bId));
          }
      }

      // 3-Phase Balanced Loads (Motors, etc.)
      else if (comp.type === COMPONENT_TYPES.LOAD_3P_BALANCED) {
          const P_total = (comp.properties.powerKW || 0) * 1000; // Convert kW to W
          const pf = comp.properties.powerFactor || 0.85;
          
          // Approximate Line Voltage from Phase Voltages
          // V_L_L = V_L_N * sqrt(3)
          // We take the average of available phases or just R for reference
          // Ideally: sqrt(V_R^2 + V_Y^2 - 2*V_R*V_Y*cos(120)) ... 
          // Simplification: Average Phase V * sqrt(3)
          const avgPhaseV = (V_R + V_Y + V_B) / 3;
          const lineVoltage = avgPhaseV * Math.sqrt(3);

          // Check if all 3 phases are present
          const termR = `${comp.id}:R`;
          const termY = `${comp.id}:Y`;
          const termB = `${comp.id}:B`;

          const hasR = phaseRSet.has(termR) || livePhaseSet.has(termR);
          const hasY = phaseYSet.has(termY) || livePhaseSet.has(termY);
          const hasB = phaseBSet.has(termB) || livePhaseSet.has(termB);

          const isPowered = hasR && hasY && hasB;
          const phasesPresent = [hasR, hasY, hasB].filter(Boolean).length;

          // 3-Phase Power Calculations
          // P_total = √3 × V_line × I_line × PF
          // I_line = P_total / (√3 × V_line × PF)
          
          const effLineV = lineVoltage < 1 ? 1 : lineVoltage;
          
          const S_total = isPowered ? P_total / pf : 0;
          const I_line = isPowered ? S_total / (Math.sqrt(3) * effLineV) : 0;
          const Q_total = isPowered ? Math.sqrt(Math.max(0, S_total**2 - P_total**2)) : 0;

          if (isPowered) {
              phaseCurrents.R += I_line;
              phaseCurrents.Y += I_line;
              phaseCurrents.B += I_line;
          }

          // Per-phase values (for balanced load)
          const P_per_phase = P_total / 3;
          const I_real_per_phase = isPowered ? (P_per_phase / (effLineV / Math.sqrt(3))) : 0;
          const I_imag_per_phase = isPowered ? (Q_total / 3 / (effLineV / Math.sqrt(3))) : 0;

          loadData[comp.id] = {
              currentA: I_line,
              powerW: P_total,
              apparentVA: S_total,
              reactiveVAR: Q_total,
              powerFactor: pf,
              isPowered,
              phasesPresent,
              hasPhaseImbalance: phasesPresent > 0 && phasesPresent < 3,
              I_real: I_real_per_phase * 3, // Total for tracking
              I_imag: I_imag_per_phase * 3
          };

          if (isPowered) {
              totalSystemPowerW += P_total;

              const addToDevice = (id) => {
                  if (!deviceLoads[id]) deviceLoads[id] = { I_real: 0, I_imag: 0, currentA: 0, P: 0, S: 0, Q: 0 };
                  deviceLoads[id].I_real += I_real_per_phase * 3;
                  deviceLoads[id].I_imag += I_imag_per_phase * 3;
                  deviceLoads[id].P += P_total;
                  deviceLoads[id].Q += Q_total;
                  deviceLoads[id].currentA = Math.sqrt(deviceLoads[id].I_real**2 + deviceLoads[id].I_imag**2);
                  deviceLoads[id].S = Math.sqrt(deviceLoads[id].P**2 + deviceLoads[id].Q**2);
              };

              // 3-phase loads are typically mains-powered
              // TODO: Track upstream from each phase separately
              addToDevice('TOTAL_MAINS');

              const breakers = findUpstreamBreakers(termR, phaseGraph, components);
              breakers.forEach(bId => addToDevice(bId));
          }
      }
  });

  return { loadData, deviceLoads, totalSystemPowerW, phaseCurrents };
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
            // Single-phase breakers
            if ((comp.type === COMPONENT_TYPES.MCB || comp.type === COMPONENT_TYPES.RCCB || comp.type === COMPONENT_TYPES.RCBO)
                && (termId === 'LOUT' || termId === 'L_OUT')) {
                breakers.add(comp.id);
            }
            // Three-phase breakers
            if (comp.type === COMPONENT_TYPES.MCB_3P
                && (termId === 'OUT_R' || termId === 'OUT_Y' || termId === 'OUT_B')) {
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

function findUpstreamSources(startNode, graph, components) {
    let hasMains = false;
    const inverterIds = new Set();
    const queue = [startNode];
    const visited = new Set();
    visited.add(startNode);

    while (queue.length > 0) {
        const current = queue.shift();
        const [compId, termId] = current.split(':');
        const comp = components.find(c => c.id === compId);

        if (comp) {
            if (comp.type === COMPONENT_TYPES.SUPPLY && comp.properties.enabled) {
                hasMains = true;
            }
            if (
                comp.type === COMPONENT_TYPES.INVERTER &&
                comp.properties.enabled &&
                !comp.properties.isBypassMode &&
                comp.properties.socWh > 0 &&
                termId === 'AC_OUT_L'
            ) {
                // Inverter continues to supply power during overload alarm period
                // It only stops when enabled=false (after shutdown)
                inverterIds.add(comp.id);
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

    return { hasMains, inverterIds: Array.from(inverterIds) };
}
