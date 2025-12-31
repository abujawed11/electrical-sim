// import { COMPONENT_TYPES, TERMINAL_KINDS } from '../types';
// import { PART_DEFINITIONS as PART_REGISTRY } from '../parts/partDefinitions';
// import { phasorForPhaseLN, phasorZero } from './phasor';

// /**
//  * Recomputes the electrical network state.
//  * Supports Single Phase, 3-Phase LV, and 11kV HV systems.
//  * 
//  * @param {Array} components - List of all components in the scene
//  * @param {Array} wires - List of all wires
//  * @param {Object} pqStatus - Optional { R, Y, B } boolean status
//  * @param {Object} voltageModel - Optional { lvBaseVoltageLN: number, gridMultiplier: {R,Y,B} }
//  * @returns {Object} { livePhaseSet, neutralSet, earthSet, phaseRSet, ... hvPhaseRSet ... }
//  */
// export const evaluateNetwork = (components, wires, pqStatus, voltageModel) => {
//   // Default to all ON if no status provided
//   const statusR = pqStatus ? pqStatus.R : true;
//   const statusY = pqStatus ? pqStatus.Y : true;
//   const statusB = pqStatus ? pqStatus.B : true;

//   console.log('[EVAL NETWORK] Called with pqStatus:', pqStatus);
//   console.log('[EVAL NETWORK] Phase R status:', statusR);
//   console.log('[EVAL NETWORK] Phase Y status:', statusY);
//   console.log('[EVAL NETWORK] Phase B status:', statusB);

//   // Sets for energized terminals (LV)
//   const phaseRSet = new Set();
//   const phaseYSet = new Set();
//   const phaseBSet = new Set();
//   const livePhaseSet = new Set(); // Legacy/Union of LV R+Y+B+Generic

//   // Sets for energized terminals (HV 11kV)
//   const hvPhaseRSet = new Set();
//   const hvPhaseYSet = new Set();
//   const hvPhaseBSet = new Set();

//   const neutralSet = new Set();
//   const earthSet = new Set();

//   // DC Sets
//   const dcPosSet = new Set();
//   const dcNegSet = new Set();

//   const socketStates = {};
//   const protectedPhaseSet = new Set();
//   const protectedNeutralSet = new Set();

//   const lvBaseVoltageLN = voltageModel?.lvBaseVoltageLN ?? 230;
//   const gridMultiplier = voltageModel?.gridMultiplier ?? { R: 1, Y: 1, B: 1 };

//   const gridLvPhaseVoltagesLN = {
//     R: lvBaseVoltageLN * (gridMultiplier.R ?? 1),
//     Y: lvBaseVoltageLN * (gridMultiplier.Y ?? 1),
//     B: lvBaseVoltageLN * (gridMultiplier.B ?? 1),
//   };

//   const terminalVoltageLN = Object.create(null);
//   const terminalPhasors = Object.create(null);
//   const terminalMeta = Object.create(null);

//   const upsertTerminalPhasor = (terminalId, system, phase, vLN, sourceType) => {
//     const prev = terminalVoltageLN[terminalId];
//     if (prev != null && prev >= vLN) return;
//     terminalVoltageLN[terminalId] = vLN;
//     terminalMeta[terminalId] = { system, phase, sourceType };
//     if (!phase || vLN <= 0) {
//       terminalPhasors[terminalId] = phasorZero();
//       return;
//     }
//     terminalPhasors[terminalId] = phasorForPhaseLN(phase, vLN);
//   };

//   // 1. Build Adjacency Graphs (Full Connectivity)
//   const conductorGraph = new Map();
//   const neutralGraph = new Map();
//   const earthGraph = new Map();
//   const dcPosGraph = new Map();
//   const dcNegGraph = new Map();

//   const addEdge = (graph, nodeA, nodeB) => {
//     if (!graph.has(nodeA)) graph.set(nodeA, []);
//     if (!graph.has(nodeB)) graph.set(nodeB, []);
//     graph.get(nodeA).push(nodeB);
//     graph.get(nodeB).push(nodeA);
//   };

//   // Add Wire Connections
//   wires.forEach(wire => {
//     const fromId = `${wire.from.compId}:${wire.from.terminalId}`;
//     const toId = `${wire.to.compId}:${wire.to.terminalId}`;
//     const comp = components.find(c => c.id === wire.from.compId);
//     if (!comp) return;
//     const registry = PART_REGISTRY[comp.type];
//     const term = registry.terminals.find(t => t.id === wire.from.terminalId);
//     if (term) {
//       // Phase/Generic/HV wires conduct Phases
//       if (term.kind.includes('PHASE') || term.kind === TERMINAL_KINDS.GENERIC) addEdge(conductorGraph, fromId, toId);
//       // Neutral/Generic wires conduct Neutral
//       if (term.kind === TERMINAL_KINDS.NEUTRAL || term.kind === TERMINAL_KINDS.GENERIC) addEdge(neutralGraph, fromId, toId);
//       // Earth/Generic wires conduct Earth
//       if (term.kind === TERMINAL_KINDS.EARTH || term.kind === TERMINAL_KINDS.GENERIC) addEdge(earthGraph, fromId, toId);

//       // DC
//       if (term.kind === TERMINAL_KINDS.DC_POS || term.kind === TERMINAL_KINDS.GENERIC) addEdge(dcPosGraph, fromId, toId);
//       if (term.kind === TERMINAL_KINDS.DC_NEG || term.kind === TERMINAL_KINDS.GENERIC) addEdge(dcNegGraph, fromId, toId);
//     }
//   });

//   // Add Internal Connections (Device Logic)
//   const rccbList = [];

//   components.forEach(comp => {
//     const registryItem = PART_REGISTRY[comp.type];
//     if (!registryItem) return;

//     if (comp.type === COMPONENT_TYPES.MCB) {
//       if (comp.properties.isOn) addEdge(conductorGraph, `${comp.id}:LIN`, `${comp.id}:LOUT`);
//     } 
//     else if (comp.type === COMPONENT_TYPES.DC_MCB) {
//         if (comp.properties.isOn) {
//             addEdge(dcPosGraph, `${comp.id}:IN_POS`, `${comp.id}:OUT_POS`);
//             addEdge(dcNegGraph, `${comp.id}:IN_NEG`, `${comp.id}:OUT_NEG`);
//         }
//     }
//     else if (comp.type === COMPONENT_TYPES.SOLAR_CONTROLLER) {
//         // MPPT connects PV to Battery internally (logically) but usually they are separate ports.
//         // If we want them to share common potential (common ground), we might connect negatives.
//         // For now, let's keep them isolated unless explicitly common-grounded by user wiring.
//         // Some controllers have common negative.
//         addEdge(dcNegGraph, `${comp.id}:PV_NEG`, `${comp.id}:BAT_NEG`);
//     }
//     else if (comp.type === COMPONENT_TYPES.SWITCH) {
//       if (comp.properties.isOn) addEdge(conductorGraph, `${comp.id}:IN_L`, `${comp.id}:OUT_L`);
//     } 
//     else if (comp.type === COMPONENT_TYPES.METER) {
//       addEdge(conductorGraph, `${comp.id}:IN_L`, `${comp.id}:OUT_L`);
//       addEdge(neutralGraph, `${comp.id}:IN_N`, `${comp.id}:OUT_N`);
//     } 
//     else if (comp.type === COMPONENT_TYPES.RCCB || comp.type === COMPONENT_TYPES.RCBO) {
//       rccbList.push(comp);
//       if (comp.properties.isOn && !comp.properties.isTripped) {
//          addEdge(conductorGraph, `${comp.id}:L_IN`, `${comp.id}:L_OUT`);
//          addEdge(neutralGraph, `${comp.id}:N_IN`, `${comp.id}:N_OUT`);
//       }
//     }
//     else if (comp.type === COMPONENT_TYPES.NEUTRAL_BAR) {
//       const terms = registryItem.terminals;
//       for (let i = 0; i < terms.length - 1; i++) addEdge(neutralGraph, `${comp.id}:${terms[i].id}`, `${comp.id}:${terms[i+1].id}`);
//     } 
//     else if (comp.type === COMPONENT_TYPES.EARTH_BAR) {
//       const terms = registryItem.terminals;
//       for (let i = 0; i < terms.length - 1; i++) addEdge(earthGraph, `${comp.id}:${terms[i].id}`, `${comp.id}:${terms[i+1].id}`);
//     } 
//     else if (comp.type === COMPONENT_TYPES.BUSBAR) {
//       const terms = registryItem.terminals;
//       const inT = terms.find(t => t.id === 'IN');
//       if (inT) {
//          terms.forEach(t => {
//             if (t.id !== 'IN') addEdge(conductorGraph, `${comp.id}:IN`, `${comp.id}:${t.id}`);
//          });
//       }
//     }
//     else if (comp.type === COMPONENT_TYPES.JUNCTION_BOX) {
//       const terms = registryItem.terminals;
//       for (let i = 0; i < terms.length - 1; i++) {
//           const u = `${comp.id}:${terms[i].id}`;
//           const v = `${comp.id}:${terms[i+1].id}`;
//           addEdge(conductorGraph, u, v);
//           addEdge(neutralGraph, u, v);
//           addEdge(earthGraph, u, v);
//       }
//     }
//     else if (comp.type === COMPONENT_TYPES.CHANGEOVER) {
//       if (comp.properties.position === 'MAINS') {
//           addEdge(conductorGraph, `${comp.id}:A_L`, `${comp.id}:OUT_L`);
//           addEdge(neutralGraph, `${comp.id}:A_N`, `${comp.id}:OUT_N`);
//       } else if (comp.properties.position === 'INVERTER') {
//           addEdge(conductorGraph, `${comp.id}:B_L`, `${comp.id}:OUT_L`);
//           addEdge(neutralGraph, `${comp.id}:B_N`, `${comp.id}:OUT_N`);
//       }
//     }
//     else if (comp.type === COMPONENT_TYPES.INVERTER) {
//         if (comp.properties.isBypassMode) {
//             addEdge(conductorGraph, `${comp.id}:AC_IN_L`, `${comp.id}:AC_OUT_L`);
//             addEdge(neutralGraph, `${comp.id}:AC_IN_N`, `${comp.id}:AC_OUT_N`);
//         }
//     }
//     else if (comp.type === COMPONENT_TYPES.SOLAR_INVERTER) {
//         if (comp.properties.isBypassMode) {
//             addEdge(conductorGraph, `${comp.id}:AC_IN_L`, `${comp.id}:AC_OUT_L`);
//             addEdge(neutralGraph, `${comp.id}:AC_IN_N`, `${comp.id}:AC_OUT_N`);
//         }
//         // DC Internal Connection? No, it's a load/source, not a pass-through.
//     }
//     else if (comp.type === COMPONENT_TYPES.MCB_3P) {
//       if (comp.properties.isOn && !comp.properties.isTripped) {
//           addEdge(conductorGraph, `${comp.id}:IN_R`, `${comp.id}:OUT_R`);
//           addEdge(conductorGraph, `${comp.id}:IN_Y`, `${comp.id}:OUT_Y`);
//           addEdge(conductorGraph, `${comp.id}:IN_B`, `${comp.id}:OUT_B`);
//       }
//     }
//     else if (comp.type === COMPONENT_TYPES.ISOLATOR_3P) {
//       if (comp.properties.isOn) {
//           addEdge(conductorGraph, `${comp.id}:IN_R`, `${comp.id}:OUT_R`);
//           addEdge(conductorGraph, `${comp.id}:IN_Y`, `${comp.id}:OUT_Y`);
//           addEdge(conductorGraph, `${comp.id}:IN_B`, `${comp.id}:OUT_B`);
//       }
//     }
//     else if (comp.type === COMPONENT_TYPES.METER_3P) {
//       addEdge(conductorGraph, `${comp.id}:IN_R`, `${comp.id}:OUT_R`);
//       addEdge(conductorGraph, `${comp.id}:IN_Y`, `${comp.id}:OUT_Y`);
//       addEdge(conductorGraph, `${comp.id}:IN_B`, `${comp.id}:OUT_B`);
//       addEdge(neutralGraph, `${comp.id}:IN_N`, `${comp.id}:OUT_N`);
//     }
//     else if ([COMPONENT_TYPES.BUSBAR_R, COMPONENT_TYPES.BUSBAR_Y, COMPONENT_TYPES.BUSBAR_B].includes(comp.type)) {
//       const terms = registryItem.terminals;
//       for (let i = 0; i < terms.length - 1; i++) {
//           addEdge(conductorGraph, `${comp.id}:${terms[i].id}`, `${comp.id}:${terms[i+1].id}`);
//       }
//     }
//   });

//   // 2. Identify Primary Sources
//   const phaseRSources = [];
//   const phaseYSources = [];
//   const phaseBSources = [];
//   const genericPhaseSources = []; // For Single Phase Supply L
//   const neutralSources = [];
//   const earthSources = [];

//   // HV Sources (11kV)
//   const hvPhaseRSources = [];
//   const hvPhaseYSources = [];
//   const hvPhaseBSources = [];

//   const hvSourceMagByNode = Object.create(null);
//   const lvSourceMagByNode = Object.create(null);
//   const genericLvSourceMagByNode = Object.create(null);
//   const inverterSourceMagByNode = Object.create(null);
//   const inverterPhaseSources = [];

//   const dcPosSources = [];
//   const dcNegSources = [];

//   // Solar Panels (DC Source) - Always ON if enabled (Sun logic elsewhere)
//   components.filter(c => c.type === COMPONENT_TYPES.SOLAR_PANEL && c.properties.enabled).forEach(s => {
//       dcPosSources.push(`${s.id}:POS`);
//       dcNegSources.push(`${s.id}:NEG`);
//   });

//   // Batteries (DC Source)
//   components.filter(c => c.type === COMPONENT_TYPES.BATTERY).forEach(s => {
//       dcPosSources.push(`${s.id}:POS`);
//       dcNegSources.push(`${s.id}:NEG`);
//   });

//   // 11kV Feeder
//   components.filter(c => c.type === COMPONENT_TYPES.FEEDER_11KV && c.properties.enabled).forEach(s => {
//       console.log('[EVAL NETWORK] 11kV Feeder found:', s.id);
//       const feederVLL = Number(s.properties.voltage || 11000);
//       const feederVLN = feederVLL / Math.sqrt(3);
//       if (statusR) {
//           const src = `${s.id}:R`;
//           hvPhaseRSources.push(src);
//           hvSourceMagByNode[src] = feederVLN * (gridMultiplier.R ?? 1);
//           console.log('[EVAL NETWORK]   R phase ENABLED - adding source');
//       } else {
//           console.log('[EVAL NETWORK]   R phase DISABLED - NOT adding source');
//       }
//       if (statusY) {
//           const src = `${s.id}:Y`;
//           hvPhaseYSources.push(src);
//           hvSourceMagByNode[src] = feederVLN * (gridMultiplier.Y ?? 1);
//           console.log('[EVAL NETWORK]   Y phase ENABLED - adding source');
//       } else {
//           console.log('[EVAL NETWORK]   Y phase DISABLED - NOT adding source');
//       }
//       if (statusB) {
//           const src = `${s.id}:B`;
//           hvPhaseBSources.push(src);
//           hvSourceMagByNode[src] = feederVLN * (gridMultiplier.B ?? 1);
//           console.log('[EVAL NETWORK]   B phase ENABLED - adding source');
//       } else {
//           console.log('[EVAL NETWORK]   B phase DISABLED - NOT adding source');
//       }
//       earthSources.push(`${s.id}:E`);
//   });

//   // Single Phase Supplies (Treat as Phase R)
//   components.filter(c => c.type === COMPONENT_TYPES.SUPPLY && c.properties.enabled).forEach(s => {
//       if (statusR) {
//         const src = `${s.id}:L`;
//         genericPhaseSources.push(src);
//         genericLvSourceMagByNode[src] = gridLvPhaseVoltagesLN.R;
//       }
//       neutralSources.push(`${s.id}:N`);
//       earthSources.push(`${s.id}:E`);
//   });

//   // 3-Phase Supplies
//   components.filter(c => c.type === COMPONENT_TYPES.SUPPLY_3P && c.properties.enabled).forEach(s => {
//       if (statusR) {
//         const src = `${s.id}:R`;
//         phaseRSources.push(src);
//         lvSourceMagByNode[src] = gridLvPhaseVoltagesLN.R;
//       }
//       if (statusY) {
//         const src = `${s.id}:Y`;
//         phaseYSources.push(src);
//         lvSourceMagByNode[src] = gridLvPhaseVoltagesLN.Y;
//       }
//       if (statusB) {
//         const src = `${s.id}:B`;
//         phaseBSources.push(src);
//         lvSourceMagByNode[src] = gridLvPhaseVoltagesLN.B;
//       }
//       neutralSources.push(`${s.id}:N`);
//       earthSources.push(`${s.id}:E`);
//   });

//   // Inverters
//   components.filter(c =>
//       (c.type === COMPONENT_TYPES.INVERTER || c.type === COMPONENT_TYPES.SOLAR_INVERTER) &&
//       c.properties.enabled &&
//       c.properties.socWh > 0 &&
//       !c.properties.isBypassMode
//   ).forEach(inv => {
//       const src = `${inv.id}:AC_OUT_L`;
//       genericPhaseSources.push(src);
//       // Inverter output is modeled as "regulated"/stable for now (not affected by grid PQ)
//       genericLvSourceMagByNode[src] = lvBaseVoltageLN;
//       neutralSources.push(`${inv.id}:AC_OUT_N`);
//   });

//   // 3. Propagation Helper
//   const propagate = (sources, graph, resultSet) => {
//     const queue = [...sources];
//     sources.forEach(s => resultSet.add(s));
//     while (queue.length > 0) {
//       const current = queue.shift();
//       const neighbors = graph.get(current) || [];
//       neighbors.forEach(next => {
//         if (!resultSet.has(next)) {
//           resultSet.add(next);
//           queue.push(next);
//         }
//       });
//     }
//   };

//   const propagateWithVoltage = (sources, sourceMagByNode, phase, system, graph, resultSet, sourceType) => {
//     const queue = [];
//     sources.forEach(s => {
//       const mag = Number(sourceMagByNode[s] ?? 0);
//       if (mag > 0) queue.push({ node: s, mag });
//     });
//     const best = new Map();
//     while (queue.length > 0) {
//       const { node, mag } = queue.shift();
//       const prev = best.get(node);
//       if (prev != null && prev >= mag) continue;
//       best.set(node, mag);
//       resultSet.add(node);
//       upsertTerminalPhasor(node, system, phase, mag, sourceType);
//       const neighbors = graph.get(node) || [];
//       neighbors.forEach(next => {
//         const prevNext = best.get(next);
//         if (prevNext == null || prevNext < mag) queue.push({ node: next, mag });
//       });
//     }
//   };

//   // 4. Propagate HV Sources
//   propagateWithVoltage(hvPhaseRSources, hvSourceMagByNode, 'R', 'HV', conductorGraph, hvPhaseRSet, 'GRID');
//   propagateWithVoltage(hvPhaseYSources, hvSourceMagByNode, 'Y', 'HV', conductorGraph, hvPhaseYSet, 'GRID');
//   propagateWithVoltage(hvPhaseBSources, hvSourceMagByNode, 'B', 'HV', conductorGraph, hvPhaseBSet, 'GRID');

//   // Propagate DC
//   propagate(dcPosSources, dcPosGraph, dcPosSet);
//   propagate(dcNegSources, dcNegGraph, dcNegSet);

//   // 5. Handle Transformers (HV -> LV)
//   // Check if Primaries are energized by HV sets
//   const transformers = components.filter(c => c.type === COMPONENT_TYPES.TRANSFORMER_3P);

//   if (transformers.length > 0) {
//       const txRSources = [];
//       const txYSources = [];
//       const txBSources = [];
//       const txNSources = [];

//        transformers.forEach(tx => {
//            // Check Primary Energization via HV sets (Per-phase independent operation)
//            // Each phase operates independently - partial phase loss is realistic in 3-phase systems
//            const priR = `${tx.id}:PRI_R`;
//            const priY = `${tx.id}:PRI_Y`;
//            const priB = `${tx.id}:PRI_B`;

//            const hasR = hvPhaseRSet.has(priR);
//            const hasY = hvPhaseYSet.has(priY);
//            const hasB = hvPhaseBSet.has(priB);

//            const ratio = (() => {
//              const hvNom = Number(tx.properties.primaryVoltage || 11000);
//              const lvNom = Number(tx.properties.secondaryVoltage || 415);
//              if (!Number.isFinite(hvNom) || hvNom <= 0) return 0;
//              return lvNom / hvNom;
//            })();

//            // Energize each secondary phase independently based on its primary
//            if (hasR) {
//                const sec = `${tx.id}:SEC_R`;
//                txRSources.push(sec);
//                const vPri = Number(terminalVoltageLN[priR] ?? 0);
//                lvSourceMagByNode[sec] = vPri * ratio;
//            }
//            if (hasY) {
//                const sec = `${tx.id}:SEC_Y`;
//                txYSources.push(sec);
//                const vPri = Number(terminalVoltageLN[priY] ?? 0);
//                lvSourceMagByNode[sec] = vPri * ratio;
//            }
//            if (hasB) {
//                const sec = `${tx.id}:SEC_B`;
//                txBSources.push(sec);
//                const vPri = Number(terminalVoltageLN[priB] ?? 0);
//                lvSourceMagByNode[sec] = vPri * ratio;
//            }

//            // Neutral available if at least one phase is present (star connection)
//            if ((hasR || hasY || hasB) && tx.properties.connection && tx.properties.connection.endsWith('STAR')) {
//               txNSources.push(`${tx.id}:SEC_N`);
//           }
//       });

//       // Add Secondary Sources to LV Source Lists
//       txRSources.forEach(s => phaseRSources.push(s));
//       txYSources.forEach(s => phaseYSources.push(s));
//       txBSources.forEach(s => phaseBSources.push(s));
//       txNSources.forEach(s => neutralSources.push(s));
//   }

//   // 6. Propagate LV Sources
//   propagateWithVoltage(phaseRSources, lvSourceMagByNode, 'R', 'LV', conductorGraph, phaseRSet, 'GRID');
//   propagateWithVoltage(phaseYSources, lvSourceMagByNode, 'Y', 'LV', conductorGraph, phaseYSet, 'GRID');
//   propagateWithVoltage(phaseBSources, lvSourceMagByNode, 'B', 'LV', conductorGraph, phaseBSet, 'GRID');
//   propagateWithVoltage(genericPhaseSources, genericLvSourceMagByNode, 'R', 'LV', conductorGraph, livePhaseSet, 'GRID');
//   propagate(neutralSources, neutralGraph, neutralSet);
//   propagate(earthSources, earthGraph, earthSet);

//   // 7. Merge Sets for Legacy/Generic components
//   phaseRSet.forEach(t => livePhaseSet.add(t));
//   phaseYSet.forEach(t => livePhaseSet.add(t));
//   phaseBSet.forEach(t => livePhaseSet.add(t));

//   // 8. Protection Analysis (Isolated Graph for RCCB/RCBO)
//   const protPhaseGraph = new Map();
//   const protNeutralGraph = new Map();

//   // Add wires again
//   wires.forEach(wire => {
//     const fromId = `${wire.from.compId}:${wire.from.terminalId}`;
//     const toId = `${wire.to.compId}:${wire.to.terminalId}`;
//     const comp = components.find(c => c.id === wire.from.compId);
//     if (!comp) return;
//     const registry = PART_REGISTRY[comp.type];
//     const term = registry.terminals.find(t => t.id === wire.from.terminalId);
//     if (term) {
//       if (term.kind.includes('PHASE') || term.kind === TERMINAL_KINDS.GENERIC) addEdge(protPhaseGraph, fromId, toId);
//       if (term.kind === TERMINAL_KINDS.NEUTRAL || term.kind === TERMINAL_KINDS.GENERIC) addEdge(protNeutralGraph, fromId, toId);
//     }
//   });

//   // Add internal connections EXCEPT RCCB/RCBO
//   components.forEach(comp => {
//     const registryItem = PART_REGISTRY[comp.type];
//     if (!registryItem) return;

//     if (comp.type === COMPONENT_TYPES.MCB && comp.properties.isOn) addEdge(protPhaseGraph, `${comp.id}:LIN`, `${comp.id}:LOUT`);
//     else if (comp.type === COMPONENT_TYPES.SWITCH && comp.properties.isOn) addEdge(protPhaseGraph, `${comp.id}:IN_L`, `${comp.id}:OUT_L`);
//     else if (comp.type === COMPONENT_TYPES.METER) {
//       addEdge(protPhaseGraph, `${comp.id}:IN_L`, `${comp.id}:OUT_L`);
//       addEdge(protNeutralGraph, `${comp.id}:IN_N`, `${comp.id}:OUT_N`);
//     }
//     else if (comp.type === COMPONENT_TYPES.NEUTRAL_BAR) {
//       const terms = registryItem.terminals;
//       for (let i = 0; i < terms.length - 1; i++) addEdge(protNeutralGraph, `${comp.id}:${terms[i].id}`, `${comp.id}:${terms[i+1].id}`);
//     } 
//     else if (comp.type === COMPONENT_TYPES.BUSBAR) {
//        const terms = registryItem.terminals;
//        const inT = terms.find(t => t.id === 'IN');
//        if (inT) {
//           terms.forEach(t => {
//              if (t.id !== 'IN') addEdge(protPhaseGraph, `${comp.id}:IN`, `${comp.id}:${t.id}`);
//           });
//        }
//     }
//     else if (comp.type === COMPONENT_TYPES.JUNCTION_BOX) {
//       const terms = registryItem.terminals;
//       for (let i = 0; i < terms.length - 1; i++) {
//           const u = `${comp.id}:${terms[i].id}`;
//           const v = `${comp.id}:${terms[i+1].id}`;
//           addEdge(protPhaseGraph, u, v);
//           addEdge(protNeutralGraph, u, v);
//       }
//     }
//   });

//   // Sources for Protection Sets: All RCCB/RCBO Outputs
//   const rccbPhaseOuts = [];
//   const rccbNeutralOuts = [];

//   rccbList.forEach(rccb => {
//       rccbPhaseOuts.push(`${rccb.id}:L_OUT`);
//       rccbNeutralOuts.push(`${rccb.id}:N_OUT`);
//   });

//   propagate(rccbPhaseOuts, protPhaseGraph, protectedPhaseSet);
//   propagate(rccbNeutralOuts, protNeutralGraph, protectedNeutralSet);

//   // 9. Compute Socket States
//   components.forEach(comp => {
//     if (comp.type === COMPONENT_TYPES.SOCKET) {
//       const hasL = livePhaseSet.has(`${comp.id}:L`);
//       const hasN = neutralSet.has(`${comp.id}:N`);
//       const hasE = earthSet.has(`${comp.id}:E`);

//       const isProtL = protectedPhaseSet.has(`${comp.id}:L`);
//       const isProtN = protectedNeutralSet.has(`${comp.id}:N`);

//       let status = 'DEAD'; 
//       let warning = null;

//       if (hasL && hasN && hasE) {
//         status = 'LIVE_OK';
//       } else if (hasL && hasN && !hasE) {
//         status = 'NO_EARTH';
//       } else if (hasL && !hasN) {
//         status = 'NO_NEUTRAL';
//       } else if (!hasL) {
//         status = 'NO_PHASE';
//       }

//       // Bypass Check
//       if (isProtL && !isProtN && hasN) {
//           warning = 'NEUTRAL_BYPASS'; 
//           status = 'UNSAFE_BYPASS';
//       }

//       socketStates[comp.id] = {
//         hasPhase: hasL,
//         hasNeutral: hasN,
//         hasEarth: hasE,
//         status,
//         warning
//       };
//     }
//   });

//   // Ensure neutral/earth are always 0V for measurement
//   neutralSet.forEach(t => {
//     terminalVoltageLN[t] = 0;
//     terminalMeta[t] = { system: 'LV', phase: null, sourceType: null };
//     terminalPhasors[t] = phasorZero();
//   });
//   earthSet.forEach(t => {
//     terminalVoltageLN[t] = 0;
//     terminalMeta[t] = { system: 'LV', phase: null, sourceType: null };
//     terminalPhasors[t] = phasorZero();
//   });

//   return { 
//     livePhaseSet, 
//     neutralSet, 
//     earthSet, 
//     socketStates, 
//     protectedPhaseSet, 
//     protectedNeutralSet, 
//     phaseRSet, 
//     phaseYSet, 
//     phaseBSet,
//     hvPhaseRSet,
//     hvPhaseYSet,
//     hvPhaseBSet,
//     dcPosSet,
//     dcNegSet,
//     terminalVoltageLN,
//     terminalPhasors,
//     terminalMeta,
//   };
// };











import { COMPONENT_TYPES, TERMINAL_KINDS } from '../types';
import { PART_DEFINITIONS as PART_REGISTRY } from '../parts/partDefinitions';
import { phasorForPhaseLN, phasorZero } from './phasor';

/**
 * Recomputes the electrical network state.
 * Supports Single Phase, 3-Phase LV, and 11kV HV systems.
 *
 * @param {Array} components - List of all components in the scene
 * @param {Array} wires - List of all wires
 * @param {Object} pqStatus - Optional { R, Y, B } boolean status
 * @param {Object} voltageModel - Optional { lvBaseVoltageLN: number, gridMultiplier: {R,Y,B} }
 * @returns {Object} sets + terminalVoltageLN/phasors/meta
 */
export const evaluateNetwork = (components, wires, pqStatus, voltageModel) => {
  const statusR = pqStatus ? pqStatus.R : true;
  const statusY = pqStatus ? pqStatus.Y : true;
  const statusB = pqStatus ? pqStatus.B : true;

  // Sets for energized terminals (LV)
  const phaseRSet = new Set();
  const phaseYSet = new Set();
  const phaseBSet = new Set();
  const livePhaseSet = new Set(); // Union of LV R+Y+B+Generic

  // Sets for energized terminals (HV 11kV)
  const hvPhaseRSet = new Set();
  const hvPhaseYSet = new Set();
  const hvPhaseBSet = new Set();

  const neutralSet = new Set();
  const earthSet = new Set();

  // DC sets (energized from DC sources through DC graphs)
  const dcPosSet = new Set();
  const dcNegSet = new Set();

  const socketStates = {};
  const protectedPhaseSet = new Set();
  const protectedNeutralSet = new Set();

  const lvBaseVoltageLN = voltageModel?.lvBaseVoltageLN ?? 230;
  const gridMultiplier = voltageModel?.gridMultiplier ?? { R: 1, Y: 1, B: 1 };

  const gridLvPhaseVoltagesLN = {
    R: lvBaseVoltageLN * (gridMultiplier.R ?? 1),
    Y: lvBaseVoltageLN * (gridMultiplier.Y ?? 1),
    B: lvBaseVoltageLN * (gridMultiplier.B ?? 1),
  };

  const terminalVoltageLN = Object.create(null);
  const terminalPhasors = Object.create(null);
  const terminalMeta = Object.create(null);

  const upsertTerminalPhasor = (terminalId, system, phase, vLN, sourceType) => {
    const prev = terminalVoltageLN[terminalId];
    if (prev != null && prev >= vLN) return;
    terminalVoltageLN[terminalId] = vLN;
    terminalMeta[terminalId] = { system, phase, sourceType };
    if (!phase || vLN <= 0) {
      terminalPhasors[terminalId] = phasorZero();
      return;
    }
    terminalPhasors[terminalId] = phasorForPhaseLN(phase, vLN);
  };

  // 1) Graphs
  const conductorGraph = new Map();
  const neutralGraph = new Map();
  const earthGraph = new Map();
  const dcPosGraph = new Map();
  const dcNegGraph = new Map();

  const addEdge = (graph, nodeA, nodeB) => {
    if (!graph.has(nodeA)) graph.set(nodeA, []);
    if (!graph.has(nodeB)) graph.set(nodeB, []);
    graph.get(nodeA).push(nodeB);
    graph.get(nodeB).push(nodeA);
  };

  // Wire connections
  wires.forEach(wire => {
    const fromId = `${wire.from.compId}:${wire.from.terminalId}`;
    const toId = `${wire.to.compId}:${wire.to.terminalId}`;

    const fromComp = components.find(c => c.id === wire.from.compId);
    const toComp = components.find(c => c.id === wire.to.compId);
    if (!fromComp || !toComp) return;

    const fromRegistry = PART_REGISTRY[fromComp.type];
    const toRegistry = PART_REGISTRY[toComp.type];
    if (!fromRegistry || !toRegistry) return;

    const fromTerm = fromRegistry.terminals.find(t => t.id === wire.from.terminalId);
    const toTerm = toRegistry.terminals.find(t => t.id === wire.to.terminalId);
    if (!fromTerm || !toTerm) return;

    if (fromTerm.kind.includes('PHASE') || fromTerm.kind === TERMINAL_KINDS.GENERIC) addEdge(conductorGraph, fromId, toId);
    if (fromTerm.kind === TERMINAL_KINDS.NEUTRAL || fromTerm.kind === TERMINAL_KINDS.GENERIC) addEdge(neutralGraph, fromId, toId);
    if (fromTerm.kind === TERMINAL_KINDS.EARTH || fromTerm.kind === TERMINAL_KINDS.GENERIC) addEdge(earthGraph, fromId, toId);

    // DC graphs (IMPORTANT: separate)
    const isDcPosish = (k) => k === TERMINAL_KINDS.DC_POS || k === TERMINAL_KINDS.GENERIC;
    const isDcNegish = (k) => k === TERMINAL_KINDS.DC_NEG || k === TERMINAL_KINDS.GENERIC;

    // Only add a wire to a DC graph if BOTH endpoints are compatible (prevents polarity mixing / false continuity).
    if (isDcPosish(fromTerm.kind) && isDcPosish(toTerm.kind)) addEdge(dcPosGraph, fromId, toId);
    if (isDcNegish(fromTerm.kind) && isDcNegish(toTerm.kind)) addEdge(dcNegGraph, fromId, toId);
  });

  // Internal connections
  const rccbList = [];

  components.forEach(comp => {
    const registryItem = PART_REGISTRY[comp.type];
    if (!registryItem) return;

    if (comp.type === COMPONENT_TYPES.MCB) {
      if (comp.properties.isOn) addEdge(conductorGraph, `${comp.id}:LIN`, `${comp.id}:LOUT`);
    } else if (comp.type === COMPONENT_TYPES.DC_MCB) {
      if (comp.properties.isOn) {
        addEdge(dcPosGraph, `${comp.id}:IN_POS`, `${comp.id}:OUT_POS`);
        addEdge(dcNegGraph, `${comp.id}:IN_NEG`, `${comp.id}:OUT_NEG`);
      }
    } else if (comp.type === COMPONENT_TYPES.SOLAR_CONTROLLER) {
      // FIX: Do NOT force PV_NEG <-> BAT_NEG unless configured
      const commonNeg = comp.properties?.commonNegative ?? false;
      if (commonNeg) addEdge(dcNegGraph, `${comp.id}:PV_NEG`, `${comp.id}:BAT_NEG`);
    } else if (comp.type === COMPONENT_TYPES.SWITCH) {
      if (comp.properties.isOn) addEdge(conductorGraph, `${comp.id}:IN_L`, `${comp.id}:OUT_L`);
    } else if (comp.type === COMPONENT_TYPES.METER) {
      addEdge(conductorGraph, `${comp.id}:IN_L`, `${comp.id}:OUT_L`);
      addEdge(neutralGraph, `${comp.id}:IN_N`, `${comp.id}:OUT_N`);
    } else if (comp.type === COMPONENT_TYPES.RCCB || comp.type === COMPONENT_TYPES.RCBO) {
      rccbList.push(comp);
      if (comp.properties.isOn && !comp.properties.isTripped) {
        addEdge(conductorGraph, `${comp.id}:L_IN`, `${comp.id}:L_OUT`);
        addEdge(neutralGraph, `${comp.id}:N_IN`, `${comp.id}:N_OUT`);
      }
    } else if (comp.type === COMPONENT_TYPES.NEUTRAL_BAR) {
      const terms = registryItem.terminals;
      for (let i = 0; i < terms.length - 1; i++) addEdge(neutralGraph, `${comp.id}:${terms[i].id}`, `${comp.id}:${terms[i + 1].id}`);
    } else if (comp.type === COMPONENT_TYPES.EARTH_BAR) {
      const terms = registryItem.terminals;
      for (let i = 0; i < terms.length - 1; i++) addEdge(earthGraph, `${comp.id}:${terms[i].id}`, `${comp.id}:${terms[i + 1].id}`);
    } else if (comp.type === COMPONENT_TYPES.BUSBAR) {
      const terms = registryItem.terminals;
      const inT = terms.find(t => t.id === 'IN');
      if (inT) {
        terms.forEach(t => {
          if (t.id !== 'IN') addEdge(conductorGraph, `${comp.id}:IN`, `${comp.id}:${t.id}`);
        });
      }
    } else if (comp.type === COMPONENT_TYPES.JUNCTION_BOX) {
      const terms = registryItem.terminals;
      for (let i = 0; i < terms.length - 1; i++) {
        const u = `${comp.id}:${terms[i].id}`;
        const v = `${comp.id}:${terms[i + 1].id}`;
        addEdge(conductorGraph, u, v);
        addEdge(neutralGraph, u, v);
        addEdge(earthGraph, u, v);
      }
    } else if (comp.type === COMPONENT_TYPES.CHANGEOVER) {
      if (comp.properties.position === 'MAINS') {
        addEdge(conductorGraph, `${comp.id}:A_L`, `${comp.id}:OUT_L`);
        addEdge(neutralGraph, `${comp.id}:A_N`, `${comp.id}:OUT_N`);
      } else if (comp.properties.position === 'INVERTER') {
        addEdge(conductorGraph, `${comp.id}:B_L`, `${comp.id}:OUT_L`);
        addEdge(neutralGraph, `${comp.id}:B_N`, `${comp.id}:OUT_N`);
      }
    } else if (comp.type === COMPONENT_TYPES.INVERTER) {
      if (comp.properties.isBypassMode) {
        addEdge(conductorGraph, `${comp.id}:AC_IN_L`, `${comp.id}:AC_OUT_L`);
        addEdge(neutralGraph, `${comp.id}:AC_IN_N`, `${comp.id}:AC_OUT_N`);
      }
    } else if (comp.type === COMPONENT_TYPES.SOLAR_INVERTER) {
      if (comp.properties.isBypassMode) {
        addEdge(conductorGraph, `${comp.id}:AC_IN_L`, `${comp.id}:AC_OUT_L`);
        addEdge(neutralGraph, `${comp.id}:AC_IN_N`, `${comp.id}:AC_OUT_N`);
      }
    } else if (comp.type === COMPONENT_TYPES.MCB_3P) {
      if (comp.properties.isOn && !comp.properties.isTripped) {
        addEdge(conductorGraph, `${comp.id}:IN_R`, `${comp.id}:OUT_R`);
        addEdge(conductorGraph, `${comp.id}:IN_Y`, `${comp.id}:OUT_Y`);
        addEdge(conductorGraph, `${comp.id}:IN_B`, `${comp.id}:OUT_B`);
      }
    } else if (comp.type === COMPONENT_TYPES.ISOLATOR_3P) {
      if (comp.properties.isOn) {
        addEdge(conductorGraph, `${comp.id}:IN_R`, `${comp.id}:OUT_R`);
        addEdge(conductorGraph, `${comp.id}:IN_Y`, `${comp.id}:OUT_Y`);
        addEdge(conductorGraph, `${comp.id}:IN_B`, `${comp.id}:OUT_B`);
      }
    } else if (comp.type === COMPONENT_TYPES.METER_3P) {
      addEdge(conductorGraph, `${comp.id}:IN_R`, `${comp.id}:OUT_R`);
      addEdge(conductorGraph, `${comp.id}:IN_Y`, `${comp.id}:OUT_Y`);
      addEdge(conductorGraph, `${comp.id}:IN_B`, `${comp.id}:OUT_B`);
      addEdge(neutralGraph, `${comp.id}:IN_N`, `${comp.id}:OUT_N`);
    } else if ([COMPONENT_TYPES.BUSBAR_R, COMPONENT_TYPES.BUSBAR_Y, COMPONENT_TYPES.BUSBAR_B].includes(comp.type)) {
      const terms = registryItem.terminals;
      for (let i = 0; i < terms.length - 1; i++) addEdge(conductorGraph, `${comp.id}:${terms[i].id}`, `${comp.id}:${terms[i + 1].id}`);
    }
  });

  // 2) Sources
  const phaseRSources = [];
  const phaseYSources = [];
  const phaseBSources = [];
  const genericPhaseSources = [];
  const neutralSources = [];
  const earthSources = [];

  const hvPhaseRSources = [];
  const hvPhaseYSources = [];
  const hvPhaseBSources = [];

  const hvSourceMagByNode = Object.create(null);
  const lvSourceMagByNode = Object.create(null);
  const genericLvSourceMagByNode = Object.create(null);

  const dcPosSources = [];
  const dcNegSources = [];

  // Solar panels (DC)
  components.filter(c => c.type === COMPONENT_TYPES.SOLAR_PANEL && c.properties.enabled).forEach(s => {
    dcPosSources.push(`${s.id}:POS`);
    dcNegSources.push(`${s.id}:NEG`);
  });

  // Batteries (DC)
  components.filter(c => c.type === COMPONENT_TYPES.BATTERY).forEach(b => {
    dcPosSources.push(`${b.id}:POS`);
    dcNegSources.push(`${b.id}:NEG`);
  });

  // 11kV Feeder
  components.filter(c => c.type === COMPONENT_TYPES.FEEDER_11KV && c.properties.enabled).forEach(s => {
    const feederVLL = Number(s.properties.voltage || 11000);
    const feederVLN = feederVLL / Math.sqrt(3);
    if (statusR) {
      const src = `${s.id}:R`;
      hvPhaseRSources.push(src);
      hvSourceMagByNode[src] = feederVLN * (gridMultiplier.R ?? 1);
    }
    if (statusY) {
      const src = `${s.id}:Y`;
      hvPhaseYSources.push(src);
      hvSourceMagByNode[src] = feederVLN * (gridMultiplier.Y ?? 1);
    }
    if (statusB) {
      const src = `${s.id}:B`;
      hvPhaseBSources.push(src);
      hvSourceMagByNode[src] = feederVLN * (gridMultiplier.B ?? 1);
    }
    earthSources.push(`${s.id}:E`);
  });

  // Single-phase supply
  components.filter(c => c.type === COMPONENT_TYPES.SUPPLY && c.properties.enabled).forEach(s => {
    if (statusR) {
      const src = `${s.id}:L`;
      genericPhaseSources.push(src);
      genericLvSourceMagByNode[src] = gridLvPhaseVoltagesLN.R;
    }
    neutralSources.push(`${s.id}:N`);
    earthSources.push(`${s.id}:E`);
  });

  // 3-phase supply
  components.filter(c => c.type === COMPONENT_TYPES.SUPPLY_3P && c.properties.enabled).forEach(s => {
    if (statusR) {
      const src = `${s.id}:R`;
      phaseRSources.push(src);
      lvSourceMagByNode[src] = gridLvPhaseVoltagesLN.R;
    }
    if (statusY) {
      const src = `${s.id}:Y`;
      phaseYSources.push(src);
      lvSourceMagByNode[src] = gridLvPhaseVoltagesLN.Y;
    }
    if (statusB) {
      const src = `${s.id}:B`;
      phaseBSources.push(src);
      lvSourceMagByNode[src] = gridLvPhaseVoltagesLN.B;
    }
    neutralSources.push(`${s.id}:N`);
    earthSources.push(`${s.id}:E`);
  });

  // 3) Propagation helpers
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

  const propagateWithVoltage = (sources, sourceMagByNode, phase, system, graph, resultSet, sourceType) => {
    const queue = [];
    sources.forEach(s => {
      const mag = Number(sourceMagByNode[s] ?? 0);
      if (mag > 0) queue.push({ node: s, mag });
    });
    const best = new Map();
    while (queue.length > 0) {
      const { node, mag } = queue.shift();
      const prev = best.get(node);
      if (prev != null && prev >= mag) continue;
      best.set(node, mag);
      resultSet.add(node);
      upsertTerminalPhasor(node, system, phase, mag, sourceType);
      const neighbors = graph.get(node) || [];
      neighbors.forEach(next => {
        const prevNext = best.get(next);
        if (prevNext == null || prevNext < mag) queue.push({ node: next, mag });
      });
    }
  };

  // 4) Propagate HV
  propagateWithVoltage(hvPhaseRSources, hvSourceMagByNode, 'R', 'HV', conductorGraph, hvPhaseRSet, 'GRID');
  propagateWithVoltage(hvPhaseYSources, hvSourceMagByNode, 'Y', 'HV', conductorGraph, hvPhaseYSet, 'GRID');
  propagateWithVoltage(hvPhaseBSources, hvSourceMagByNode, 'B', 'HV', conductorGraph, hvPhaseBSet, 'GRID');

  // Propagate DC (NOW we can validate inverter DC wiring)
  propagate(dcPosSources, dcPosGraph, dcPosSet);
  propagate(dcNegSources, dcNegGraph, dcNegSet);

  // 5) Transformers HV->LV (unchanged from your file)
  const transformers = components.filter(c => c.type === COMPONENT_TYPES.TRANSFORMER_3P);
  if (transformers.length > 0) {
    const txRSources = [];
    const txYSources = [];
    const txBSources = [];
    const txNSources = [];

    transformers.forEach(tx => {
      const priR = `${tx.id}:PRI_R`;
      const priY = `${tx.id}:PRI_Y`;
      const priB = `${tx.id}:PRI_B`;

      const hasR = hvPhaseRSet.has(priR);
      const hasY = hvPhaseYSet.has(priY);
      const hasB = hvPhaseBSet.has(priB);

      const ratio = (() => {
        const hvNom = Number(tx.properties.primaryVoltage || 11000);
        const lvNom = Number(tx.properties.secondaryVoltage || 415);
        if (!Number.isFinite(hvNom) || hvNom <= 0) return 0;
        return lvNom / hvNom;
      })();

      if (hasR) {
        const sec = `${tx.id}:SEC_R`;
        txRSources.push(sec);
        const vPri = Number(terminalVoltageLN[priR] ?? 0);
        lvSourceMagByNode[sec] = vPri * ratio;
      }
      if (hasY) {
        const sec = `${tx.id}:SEC_Y`;
        txYSources.push(sec);
        const vPri = Number(terminalVoltageLN[priY] ?? 0);
        lvSourceMagByNode[sec] = vPri * ratio;
      }
      if (hasB) {
        const sec = `${tx.id}:SEC_B`;
        txBSources.push(sec);
        const vPri = Number(terminalVoltageLN[priB] ?? 0);
        lvSourceMagByNode[sec] = vPri * ratio;
      }

      if ((hasR || hasY || hasB) && tx.properties.connection && tx.properties.connection.endsWith('STAR')) {
        txNSources.push(`${tx.id}:SEC_N`);
      }
    });

    txRSources.forEach(s => phaseRSources.push(s));
    txYSources.forEach(s => phaseYSources.push(s));
    txBSources.forEach(s => phaseBSources.push(s));
    txNSources.forEach(s => neutralSources.push(s));
  }

  // 6) Inverters as LV sources (FIX: require DC wiring ok)
  const isDcWiredOk = (inv) => {
    const posNode = `${inv.id}:BAT_POS`;
    const negNode = `${inv.id}:BAT_NEG`;
    return dcPosSet.has(posNode) && dcNegSet.has(negNode);
  };

  components.filter(c =>
    (c.type === COMPONENT_TYPES.INVERTER || c.type === COMPONENT_TYPES.SOLAR_INVERTER) &&
    // c.properties.enabled &&
    // c.properties.socWh > 0 &&
    // !c.properties.isBypassMode
    c.properties.enabled &&
    !c.properties.isBypassMode

  ).forEach(inv => {
    if (inv.properties.isTripped) return;
    // IMPORTANT: only energize AC from SOLAR_INVERTER when evaluateSolar explicitly says it can invert.
    if (inv.type === COMPONENT_TYPES.SOLAR_INVERTER && inv.properties.canInvert !== true) return;
    if (inv.type === COMPONENT_TYPES.INVERTER && Number(inv.properties.socWh || 0) <= 0) return;
    if (!isDcWiredOk(inv)) return; // ✅ core fix for your glowing bulb bug

    const src = `${inv.id}:AC_OUT_L`;
    genericPhaseSources.push(src);
    genericLvSourceMagByNode[src] = lvBaseVoltageLN;
    neutralSources.push(`${inv.id}:AC_OUT_N`);
  });

  // 7) Propagate LV
  propagateWithVoltage(phaseRSources, lvSourceMagByNode, 'R', 'LV', conductorGraph, phaseRSet, 'GRID');
  propagateWithVoltage(phaseYSources, lvSourceMagByNode, 'Y', 'LV', conductorGraph, phaseYSet, 'GRID');
  propagateWithVoltage(phaseBSources, lvSourceMagByNode, 'B', 'LV', conductorGraph, phaseBSet, 'GRID');
  propagateWithVoltage(genericPhaseSources, genericLvSourceMagByNode, 'R', 'LV', conductorGraph, livePhaseSet, 'GRID');
  propagate(neutralSources, neutralGraph, neutralSet);
  propagate(earthSources, earthGraph, earthSet);

  // Merge sets
  phaseRSet.forEach(t => livePhaseSet.add(t));
  phaseYSet.forEach(t => livePhaseSet.add(t));
  phaseBSet.forEach(t => livePhaseSet.add(t));

  // 8) Protection graph (unchanged from your file)
  const protPhaseGraph = new Map();
  const protNeutralGraph = new Map();

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

  components.forEach(comp => {
    const registryItem = PART_REGISTRY[comp.type];
    if (!registryItem) return;

    if (comp.type === COMPONENT_TYPES.MCB && comp.properties.isOn) addEdge(protPhaseGraph, `${comp.id}:LIN`, `${comp.id}:LOUT`);
    else if (comp.type === COMPONENT_TYPES.SWITCH && comp.properties.isOn) addEdge(protPhaseGraph, `${comp.id}:IN_L`, `${comp.id}:OUT_L`);
    else if (comp.type === COMPONENT_TYPES.METER) {
      addEdge(protPhaseGraph, `${comp.id}:IN_L`, `${comp.id}:OUT_L`);
      addEdge(protNeutralGraph, `${comp.id}:IN_N`, `${comp.id}:OUT_N`);
    } else if (comp.type === COMPONENT_TYPES.NEUTRAL_BAR) {
      const terms = registryItem.terminals;
      for (let i = 0; i < terms.length - 1; i++) addEdge(protNeutralGraph, `${comp.id}:${terms[i].id}`, `${comp.id}:${terms[i + 1].id}`);
    } else if (comp.type === COMPONENT_TYPES.BUSBAR) {
      const terms = registryItem.terminals;
      const inT = terms.find(t => t.id === 'IN');
      if (inT) {
        terms.forEach(t => {
          if (t.id !== 'IN') addEdge(protPhaseGraph, `${comp.id}:IN`, `${comp.id}:${t.id}`);
        });
      }
    } else if (comp.type === COMPONENT_TYPES.JUNCTION_BOX) {
      const terms = registryItem.terminals;
      for (let i = 0; i < terms.length - 1; i++) {
        const u = `${comp.id}:${terms[i].id}`;
        const v = `${comp.id}:${terms[i + 1].id}`;
        addEdge(protPhaseGraph, u, v);
        addEdge(protNeutralGraph, u, v);
      }
    }
  });

  const rccbPhaseOuts = [];
  const rccbNeutralOuts = [];
  rccbList.forEach(rccb => {
    rccbPhaseOuts.push(`${rccb.id}:L_OUT`);
    rccbNeutralOuts.push(`${rccb.id}:N_OUT`);
  });

  propagate(rccbPhaseOuts, protPhaseGraph, protectedPhaseSet);
  propagate(rccbNeutralOuts, protNeutralGraph, protectedNeutralSet);

  // 9) Socket states
  components.forEach(comp => {
    if (comp.type !== COMPONENT_TYPES.SOCKET) return;

    const hasL = livePhaseSet.has(`${comp.id}:L`);
    const hasN = neutralSet.has(`${comp.id}:N`);
    const hasE = earthSet.has(`${comp.id}:E`);

    const isProtL = protectedPhaseSet.has(`${comp.id}:L`);
    const isProtN = protectedNeutralSet.has(`${comp.id}:N`);

    let status = 'DEAD';
    let warning = null;

    if (hasL && hasN && hasE) status = 'LIVE_OK';
    else if (hasL && hasN && !hasE) status = 'NO_EARTH';
    else if (hasL && !hasN) status = 'NO_NEUTRAL';
    else if (!hasL) status = 'NO_PHASE';

    if (isProtL && !isProtN && hasN) {
      warning = 'NEUTRAL_BYPASS';
      status = 'UNSAFE_BYPASS';
    }

    socketStates[comp.id] = { hasPhase: hasL, hasNeutral: hasN, hasEarth: hasE, status, warning };
  });

  // Neutral/Earth 0V
  neutralSet.forEach(t => {
    terminalVoltageLN[t] = 0;
    terminalMeta[t] = { system: 'LV', phase: null, sourceType: null };
    terminalPhasors[t] = phasorZero();
  });
  earthSet.forEach(t => {
    terminalVoltageLN[t] = 0;
    terminalMeta[t] = { system: 'LV', phase: null, sourceType: null };
    terminalPhasors[t] = phasorZero();
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
    hvPhaseBSet,
    dcPosSet,
    dcNegSet,
    terminalVoltageLN,
    terminalPhasors,
    terminalMeta,
  };
};
