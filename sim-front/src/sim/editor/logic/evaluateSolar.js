// import { COMPONENT_TYPES, TERMINAL_KINDS } from '../types';
// import { PART_DEFINITIONS } from '../parts/partDefinitions';

// /**
//  * Evaluates Solar and DC Energy physics.
//  * Handles PV generation, MPPT charging, Battery SOC updates, and Inverter DC draw.
//  * 
//  * @param {Array} components 
//  * @param {Array} wires 
//  * @param {Object} deviceLoads - Calculated AC loads { 'invId': { P: 100, ... } }
//  * @param {Number} dtHours - Time delta in hours
//  * @param {Number} sunIntensity - 0.0 to 1.0
//  * @returns {Array} List of component updates [{ id, properties: {...} }]
//  */
// export const evaluateSolar = (components, wires, deviceLoads, dtHours, sunIntensity = 1.0) => {
//     const updates = [];
//     const updatesMap = new Map(); // id -> props

//     const addUpdate = (id, props) => {
//         const existing = updatesMap.get(id) || {};
//         updatesMap.set(id, { ...existing, ...props });
//     };

//     // 1. Build DC Graph
//     const dcGraph = new Map();
//     const addEdge = (u, v) => {
//         if (!dcGraph.has(u)) dcGraph.set(u, []);
//         if (!dcGraph.has(v)) dcGraph.set(v, []);
//         dcGraph.get(u).push(v);
//         dcGraph.get(v).push(u);
//     };

//     wires.forEach(w => {
//         // Only trace DC wires
//         // We can inspect terminal kinds, or just trace everything and filter logic later.
//         // Better to be specific.
//         const fromComp = components.find(c => c.id === w.from.compId);
//         const toComp = components.find(c => c.id === w.to.compId);
//         if(!fromComp || !toComp) return;

//         const fromDef = PART_DEFINITIONS[fromComp.type];
//         const toDef = PART_DEFINITIONS[toComp.type];
//         const fromTerm = fromDef.terminals.find(t => t.id === w.from.terminalId);
//         const toTerm = toDef.terminals.find(t => t.id === w.to.terminalId);

//         const isDC = (k) => k === TERMINAL_KINDS.DC_POS || k === TERMINAL_KINDS.DC_NEG || k === TERMINAL_KINDS.GENERIC;

//         if (fromTerm && toTerm && (isDC(fromTerm.kind) || isDC(toTerm.kind))) {
//              addEdge(`${w.from.compId}:${w.from.terminalId}`, `${w.to.compId}:${w.to.terminalId}`);
//         }
//     });

//     // Internal Connections for MCBs
//     components.forEach(c => {
//         if (c.type === COMPONENT_TYPES.DC_MCB && c.properties.isOn) {
//             addEdge(`${c.id}:IN_POS`, `${c.id}:OUT_POS`);
//             addEdge(`${c.id}:IN_NEG`, `${c.id}:OUT_NEG`);
//         }
//     });

//     // 2. Solar Generation (PV -> MPPT)
//     const mppts = components.filter(c => c.type === COMPONENT_TYPES.SOLAR_CONTROLLER);

//     mppts.forEach(mppt => {
//         // Find connected PVs on PV_POS / PV_NEG
//         const pvPowerW = findConnectedGeneration(mppt.id, 'PV_POS', dcGraph, components, sunIntensity);

//         // Find connected Batteries on BAT_POS / BAT_NEG
//         const batteryIds = findConnectedBatteries(mppt.id, 'BAT_POS', dcGraph, components);

//         // DEBUG: Trace Solar State
//         if (batteryIds.length > 0 || pvPowerW > 0) {
//              console.log(`[SOLAR] MPPT ${mppt.id}: PV=${Math.round(pvPowerW)}W, BatCount=${batteryIds.length}`);
//         } else {
//              // console.log(`[SOLAR] MPPT ${mppt.id}: No PV or No Battery`);
//         }

//         let chargingCurrent = 0;
//         let isCharging = false;

//         if (batteryIds.length > 0 && pvPowerW > 0) {
//             // Simple logic: Distribute power to batteries
//             // P_charge = P_pv * Efficiency
//             const eff = mppt.properties.efficiency || 0.95;
//             const totalChargeW = pvPowerW * eff;

//             // Apply to batteries
//             const wPerBat = totalChargeW / batteryIds.length;

//             batteryIds.forEach(batId => {
//                 const bat = components.find(c => c.id === batId);
//                 const voltage = bat.properties.voltage || 12;
//                 const i_charge = wPerBat / voltage; // Amps

//                 // Rate Limit by MPPT Rating? 
//                 // totalCurrent = totalChargeW / voltage. 
//                 // clamp(totalCurrent, rating)

//                 // Update Battery (Accumulate changes, processed in step 4)
//                 addBatteryFlow(batId, wPerBat, updatesMap);
//             });

//             chargingCurrent = totalChargeW / 12; // approx display
//             isCharging = true;
//         }

//         addUpdate(mppt.id, { isCharging, inputPowerW: pvPowerW });
//     });

//     // 3. Inverter Load (Battery -> Inverter)
//     const inverters = components.filter(c => c.type === COMPONENT_TYPES.SOLAR_INVERTER && c.properties.enabled);

//     inverters.forEach(inv => {
//         const loadP = deviceLoads[inv.id]?.P || 0;
//         const loadS = deviceLoads[inv.id]?.S || 0;

//         // Find connected batteries on BAT_POS
//         const batteryIds = findConnectedBatteries(inv.id, 'BAT_POS', dcGraph, components);

//         let hasBattery = batteryIds.length > 0;
//         let totalBatCapacity = 0;
//         let totalBatSoc = 0;
//         let avgVoltage = 0;

//         if (hasBattery) {
//             let voltSum = 0;
//             batteryIds.forEach(bid => {
//                 const bat = components.find(c => c.id === bid);
//                 totalBatCapacity += bat.properties.capacityAh * bat.properties.voltage; // Wh
//                 totalBatSoc += (bat.properties.socAh / bat.properties.capacityAh) * (bat.properties.capacityAh * bat.properties.voltage); // Wh approx
//                 voltSum += bat.properties.voltage;
//             });
//             avgVoltage = voltSum / batteryIds.length;
//         }

//         // Discharge Logic
//         // Inverter consumes DC Power = AC Load / Efficiency
//         const efficiency = 0.9; 
//         const dcPowerDraw = (loadP > 0) ? (loadP / efficiency) : 0;

//         // Mains Charging Logic (Grid Charging)
//         let dcChargingDraw = 0;
//         if (inv.properties.isBypassMode && inv.properties.enabled) {
//             // If bypass (mains available), we might charge the battery
//             // Charging Rate
//             const chargeRateW = inv.properties.chargingPowerW || 500;
//             // Only charge if not full
//             if (hasBattery && totalBatSoc < totalBatCapacity * 0.98) {
//                 dcChargingDraw = -chargeRateW; // Negative draw = Charging
//             }
//         }

//         const netDcPower = dcPowerDraw + dcChargingDraw; // Positive = Draining, Negative = Charging

//         if (hasBattery) {
//             // Apply to external batteries
//             const wPerBat = netDcPower / batteryIds.length;
//             batteryIds.forEach(bid => {
//                 addBatteryFlow(bid, -wPerBat, updatesMap); // Flow IN is positive in addBatteryFlow logic, so invert
//             });

//             // Update Inverter Display props
//             addUpdate(inv.id, { 
//                 socWh: totalBatSoc, // For display
//                 batteryVoltage: avgVoltage
//             });
//         } else {
//             // No Battery -> Inverter shuts down or shows error if not in Bypass?
//             // If no battery, it can't invert. 
//             addUpdate(inv.id, {
//                 socWh: 0,
//                 batteryVoltage: 0
//             });
//         }

//         // Handle Overload
//         const capacityVA = inv.properties.capacityVA || 2000;
//         const isOverloaded = loadS > capacityVA;
//         let isAlarming = inv.properties.isAlarming || false;
//         let overloadStartTime = inv.properties.overloadStartTime || 0;
//         let newEnabled = inv.properties.enabled;

//         if (isOverloaded) {
//              if (!inv.properties.isOverloaded) {
//                  overloadStartTime = Date.now();
//                  isAlarming = true;
//              }
//              // Shutdown check
//              const duration = Date.now() - overloadStartTime;
//              if (duration > (inv.properties.overloadShutdownDelayMs || 30000)) {
//                  newEnabled = false;
//                  isAlarming = false;
//              }
//         } else {
//             overloadStartTime = 0;
//             isAlarming = false;
//         }

//         addUpdate(inv.id, { isOverloaded, isAlarming, overloadStartTime, enabled: newEnabled });
//     });

//     // 4. Finalize Battery States
//     // updatesMap entries for batteries contain 'flowW' (Net Flow Watts, + = Charging, - = Discharging)
//     updatesMap.forEach((ups, id) => {
//         const comp = components.find(c => c.id === id);
//         if (comp && comp.type === COMPONENT_TYPES.BATTERY) {
//             const flowW = ups.flowW || 0;
//             const voltage = comp.properties.voltage || 12;

//             // Convert Power Flow to Ah Flow
//             // I = P / V
//             const currentA = flowW / voltage; 
//             const deltaAh = currentA * dtHours;

//             const newSocAh = Math.max(0, Math.min(comp.properties.capacityAh, comp.properties.socAh + deltaAh));

//             // Simple Voltage Curve
//             // 0% = 11.5V, 100% = 12.8V (Resting)
//             // + I * R_internal (0.02 Ohm)
//             const socPct = newSocAh / comp.properties.capacityAh;
//             const restingV = 11.5 + (1.3 * socPct);
//             const rInt = 0.05; // 50 mOhm
//             const dynamicV = restingV + (currentA * rInt);

//             updatesMap.set(id, { 
//                 ...ups, 
//                 socAh: newSocAh,
//                 terminalVoltage: dynamicV // could be used for display
//             });
//             delete ups.flowW; // cleanup
//         }
//     });

//     // Convert Map to List
//     const result = [];
//     updatesMap.forEach((v, k) => result.push({ id: k, properties: v }));
//     return result;
// };

// // --- Helpers ---

// function addBatteryFlow(id, watts, map) {
//     const prev = map.get(id) || {};
//     const flow = prev.flowW || 0;
//     map.set(id, { ...prev, flowW: flow + watts });
// }

// function findConnectedGeneration(startCompId, terminalId, graph, components, sunIntensity) {
//     // DFS to find SOLAR_PANELs
//     let totalW = 0;
//     const visited = new Set();
//     const stack = [`${startCompId}:${terminalId}`];

//     while(stack.length > 0) {
//         const curr = stack.pop();
//         if (visited.has(curr)) continue;
//         visited.add(curr);

//         const [cId] = curr.split(':');
//         const comp = components.find(c => c.id === cId);

//         if (comp && comp.type === COMPONENT_TYPES.SOLAR_PANEL && comp.properties.enabled) {
//             const p = (comp.properties.powerW || 0) * sunIntensity;
//             totalW += p;
//             // console.log(`[SOLAR] Found Panel ${cId}: ${p}W`);
//         }

//         // Traverse Neighbors
//         const neighbors = graph.get(curr) || [];
//         neighbors.forEach(n => stack.push(n));
//     }
//     return totalW;
// }

// function findConnectedBatteries(startCompId, terminalId, graph, components) {
//     const batteryIds = new Set();
//     const visited = new Set();
//     const stack = [`${startCompId}:${terminalId}`];

//     while(stack.length > 0) {
//         const curr = stack.pop();
//         if (visited.has(curr)) continue;
//         visited.add(curr);

//         const [cId] = curr.split(':');
//         const comp = components.find(c => c.id === cId);

//         if (comp && comp.type === COMPONENT_TYPES.BATTERY) {
//             batteryIds.add(cId);
//         }

//         const neighbors = graph.get(curr) || [];
//         neighbors.forEach(n => stack.push(n));
//     }
//     return Array.from(batteryIds);
// }















import { COMPONENT_TYPES, TERMINAL_KINDS } from '../types';
import { PART_DEFINITIONS } from '../parts/partDefinitions';
import { buildPvGraph, computePvStringsForMppt, computePvFromStrings } from './pvStrings';

/**
 * Evaluates Solar and DC Energy physics.
 * Handles PV generation, MPPT charging, Battery SOC updates, and Inverter DC draw.
 *
 * IMPORTANT FIX:
 *   DC connectivity must require BOTH polarities.
 *   We maintain separate POS and NEG graphs and intersect reachability.
 *
 * @param {Array} components
 * @param {Array} wires
 * @param {Object} deviceLoads - Calculated AC loads { 'invId': { P: 100, S: 120, ... } }
 * @param {Number} dtHours - Time delta in hours
 * @param {Number} sunIntensity - 0.0 to 1.0
 * @returns {Array} List of component updates [{ id, properties: {...} }]
 */
export const evaluateSolar = (components, wires, deviceLoads, dtHours, sunIntensity = 1.0) => {
    const updatesMap = new Map();
    const pushUpdate = (id, props) => {
        const existing = updatesMap.get(id) || {};
        updatesMap.set(id, { ...existing, ...props });
    };

    const dtSec = Math.max(0, Number(dtHours || 0) * 3600);
    const DEBUG_SOLAR = false;
    const DEBUG_PV_STRINGS = false;


    const hasClosedDcPath = (graph, startNode, targetNode) => {
        const visited = new Set();
        const stack = [startNode];

        while (stack.length) {
            const cur = stack.pop();
            if (cur === targetNode) return true;
            if (visited.has(cur)) continue;
            visited.add(cur);

            const nbrs = graph.get(cur) || [];
            nbrs.forEach(n => stack.push(n));
        }
        return false;
    };

    // -----------------------------
    // 1) Build separate DC graphs
    // -----------------------------
    const dcPosGraph = new Map();
    const dcNegGraph = new Map();

    const addEdge = (graph, a, b) => {
        if (!graph.has(a)) graph.set(a, []);
        if (!graph.has(b)) graph.set(b, []);
        graph.get(a).push(b);
        graph.get(b).push(a);
    };

    // Add wire edges into correct DC graph based on terminal kind (same approach as evaluateNetwork)
    wires.forEach(w => {
        const fromComp = components.find(c => c.id === w.from.compId);
        const toComp = components.find(c => c.id === w.to.compId);
        if (!fromComp || !toComp) return;

        const fromDef = PART_DEFINITIONS[fromComp.type];
        const toDef = PART_DEFINITIONS[toComp.type];
        if (!fromDef || !toDef) return;

        const fromTerm = fromDef.terminals.find(t => t.id === w.from.terminalId);
        const toTerm = toDef.terminals.find(t => t.id === w.to.terminalId);
        if (!fromTerm || !toTerm) return;

        const isDcPosish = (k) => k === TERMINAL_KINDS.DC_POS || k === TERMINAL_KINDS.GENERIC;
        const isDcNegish = (k) => k === TERMINAL_KINDS.DC_NEG || k === TERMINAL_KINDS.GENERIC;

        const fromNode = `${w.from.compId}:${w.from.terminalId}`;
        const toNode = `${w.to.compId}:${w.to.terminalId}`;

        // IMPORTANT: avoid polarity mixing by only adding the wire to a DC graph when BOTH endpoints are compatible.
        // This prevents false continuity such as DC_POS nodes "reaching" DC_NEG nodes through mis-typed terminals.
        if (isDcPosish(fromTerm.kind) && isDcPosish(toTerm.kind)) {
            addEdge(dcPosGraph, fromNode, toNode);
        }
        if (isDcNegish(fromTerm.kind) && isDcNegish(toTerm.kind)) {
            addEdge(dcNegGraph, fromNode, toNode);
        }
    });

    // Internal device connections (DC_MCB pass-through, MPPT optional common-negative)
    components.forEach(c => {
        if (c.type === COMPONENT_TYPES.DC_MCB && c.properties.isOn) {
            addEdge(dcPosGraph, `${c.id}:IN_POS`, `${c.id}:OUT_POS`);
            addEdge(dcNegGraph, `${c.id}:IN_NEG`, `${c.id}:OUT_NEG`);
        }

        if (c.type === COMPONENT_TYPES.SOLAR_CONTROLLER) {
            // Some MPPTs have common negative; make it configurable
            const commonNeg = c.properties?.commonNegative ?? false;
            if (commonNeg) {
                addEdge(dcNegGraph, `${c.id}:PV_NEG`, `${c.id}:BAT_NEG`);
            }
        }
    });

    // -----------------------------
    // 2) Helpers: reachability + intersection
    // -----------------------------
    const reachableIdsByType = (graph, startNode, type) => {
        const visited = new Set();
        const stack = [startNode];
        const ids = new Set();

        while (stack.length) {
            const cur = stack.pop();
            if (visited.has(cur)) continue;
            visited.add(cur);

            const [compId] = cur.split(':');
            const comp = components.find(c => c.id === compId);
            if (comp && comp.type === type) ids.add(compId);

            const nbrs = graph.get(cur) || [];
            for (const n of nbrs) stack.push(n);
        }

        return ids;
    };

    const intersectSets = (a, b) => {
        const out = new Set();
        a.forEach(v => { if (b.has(v)) out.add(v); });
        return out;
    };

    // Get battery strings (preserves series/parallel topology)
    const getBatteryStringsAt = (compId, posTerminalId, negTerminalId) => {
        return findBatteryStrings(compId, posTerminalId, negTerminalId);
    };

    const connectedBatteryIdsAt = (compId, posTerminalId, negTerminalId) => {
        // Use new battery string discovery
        const strings = getBatteryStringsAt(compId, posTerminalId, negTerminalId);

        // Flatten all strings to get unique battery IDs
        const allBatteryIds = new Set();
        strings.forEach(str => str.forEach(batId => allBatteryIds.add(batId)));

        return Array.from(allBatteryIds);
    };

    const connectedPanelIdsAt = (compId, posTerminalId, negTerminalId) => {
        const posIds = reachableIdsByType(dcPosGraph, `${compId}:${posTerminalId}`, COMPONENT_TYPES.SOLAR_PANEL);
        const negIds = reachableIdsByType(dcNegGraph, `${compId}:${negTerminalId}`, COMPONENT_TYPES.SOLAR_PANEL);
        return Array.from(intersectSets(posIds, negIds));
    };

    // Battery flow accumulator (+W = charging, -W = discharging)
    // Now also stores current (amps) to properly handle series batteries
    const addBatteryFlow = (batId, watts, amps) => {
        const prev = updatesMap.get(batId) || {};
        const flowW = prev.flowW || 0;
        const flowA = prev.flowA || 0;
        updatesMap.set(batId, {
            ...prev,
            flowW: flowW + watts,
            flowA: flowA + (amps !== undefined ? amps : 0)
        });
    };

    const batteryKeyFor = (batteryIds) => {
        if (!batteryIds || batteryIds.length === 0) return null;
        return [...batteryIds].sort().join('|');
    };

    const ensureBus = (busByKey, batteryIds, batteryStrings = []) => {
        const key = batteryKeyFor(batteryIds);
        if (!key) return null;
        if (!busByKey.has(key)) {
            busByKey.set(key, {
                key,
                batteryIds: [...batteryIds].sort(),
                batteryStrings: batteryStrings, // Preserve string topology
                mppts: [],
                inverters: []
            });
        }
        return busByKey.get(key);
    };

    // -----------------------------
    // 3) Build DC-bus net power (PV - load)
    // -----------------------------
    const busByKey = new Map(); // key -> { batteryIds[], mppts[], inverters[] }

    // PV wiring topology graph (for series/parallel PV strings)
    const pvGraph = buildPvGraph(components, wires);

    // -----------------------------
    // Battery unified graph (for series/parallel battery strings)
    // -----------------------------
    const buildBatteryGraph = () => {
        const graph = new Map();
        const componentsById = new Map(components.map(c => [c.id, c]));

        const addBatteryEdge = (a, b) => {
            if (!graph.has(a)) graph.set(a, []);
            if (!graph.has(b)) graph.set(b, []);
            graph.get(a).push(b);
            graph.get(b).push(a);
        };

        const getTerminalKind = (compId, terminalId) => {
            const comp = componentsById.get(compId);
            if (!comp) return null;
            const def = PART_DEFINITIONS[comp.type];
            const term = def?.terminals?.find(t => t.id === terminalId);
            return term?.kind ?? null;
        };

        const isDcKind = (k) =>
            k === TERMINAL_KINDS.DC_POS ||
            k === TERMINAL_KINDS.DC_NEG ||
            k === TERMINAL_KINDS.GENERIC;

        // Add all DC wires (allows series topology: POS->NEG->POS)
        wires.forEach(w => {
            const fromKind = getTerminalKind(w.from.compId, w.from.terminalId);
            const toKind = getTerminalKind(w.to.compId, w.to.terminalId);
            if (!isDcKind(fromKind) || !isDcKind(toKind)) return;
            addBatteryEdge(`${w.from.compId}:${w.from.terminalId}`, `${w.to.compId}:${w.to.terminalId}`);
        });

        // DC_MCB pass-through (only if ON)
        components.forEach(c => {
            if (c.type !== COMPONENT_TYPES.DC_MCB) return;
            if (!c.properties?.isOn) return;
            addBatteryEdge(`${c.id}:IN_POS`, `${c.id}:OUT_POS`);
            addBatteryEdge(`${c.id}:IN_NEG`, `${c.id}:OUT_NEG`);
        });

        // Battery internal connection: NEG <-> POS (like solar panels)
        components.forEach(c => {
            if (c.type !== COMPONENT_TYPES.BATTERY) return;
            addBatteryEdge(`${c.id}:NEG`, `${c.id}:POS`);
        });

        return graph;
    };

    const batteryGraph = buildBatteryGraph();

    // Discover battery strings from a component's terminals
    const findBatteryStrings = (compId, posTerminalId, negTerminalId) => {
        const componentsById = new Map(components.map(c => [c.id, c]));
        const start = `${compId}:${posTerminalId}`;
        const goal = `${compId}:${negTerminalId}`;

        const isBatteryTerminal = (node) => {
            const [cId, termId] = node.split(':');
            const comp = componentsById.get(cId);
            if (!comp || comp.type !== COMPONENT_TYPES.BATTERY) return null;
            if (termId !== 'POS' && termId !== 'NEG') return null;
            return { batteryId: cId, terminalId: termId };
        };

        const strings = [];
        const dedupe = new Set();
        const stack = [{
            node: start,
            visitedNodes: new Set([start]),
            usedBatteries: new Set(),
            batterySeq: [],
            visits: 0,
        }];

        const maxStrings = 64;
        const maxNodeVisits = 4000;

        while (stack.length && strings.length < maxStrings) {
            const cur = stack.pop();
            if (cur.visits > maxNodeVisits) break;

            if (cur.node === goal) {
                const key = cur.batterySeq.join('|');
                if (cur.batterySeq.length > 0 && !dedupe.has(key)) {
                    dedupe.add(key);
                    strings.push(cur.batterySeq);
                }
                continue;
            }

            const neighbors = batteryGraph.get(cur.node) || [];
            for (const next of neighbors) {
                if (cur.visitedNodes.has(next)) continue;

                const nextVisited = new Set(cur.visitedNodes);
                nextVisited.add(next);

                const nextUsedBatteries = new Set(cur.usedBatteries);
                const nextSeq = cur.batterySeq.slice();

                // If traversing internal battery edge (POS<->NEG), record battery
                const a = isBatteryTerminal(cur.node);
                const b = isBatteryTerminal(next);
                if (a && b && a.batteryId === b.batteryId && a.terminalId !== b.terminalId) {
                    if (nextUsedBatteries.has(a.batteryId)) continue;
                    nextUsedBatteries.add(a.batteryId);
                    nextSeq.push(a.batteryId);
                }

                stack.push({
                    node: next,
                    visitedNodes: nextVisited,
                    usedBatteries: nextUsedBatteries,
                    batterySeq: nextSeq,
                    visits: cur.visits + 1,
                });
            }
        }

        return strings;
    };

    // 3a) Inverter DC load demand (external battery systems)
    const solarInverters = components.filter(c => c.type === COMPONENT_TYPES.SOLAR_INVERTER);

    solarInverters.forEach(inv => {
        const batteryIds = connectedBatteryIdsAt(inv.id, 'BAT_POS', 'BAT_NEG');
        const batteryStrings = getBatteryStringsAt(inv.id, 'BAT_POS', 'BAT_NEG');
        const hasBattery = batteryIds.length > 0;

        // Reset computed props each tick (prevents sticky flags)
        pushUpdate(inv.id, {
            hasDcBatteryWired: hasBattery,
            loadW: 0,
            loadA: 0,
            outputW: 0,
            outputA: 0,
            outputV: 0,
            dcInputW: 0,
            dcInputA: 0,
            dcLoadW: 0,
            overloadActive: false,
            overloadTimerSec: 0,
            lowBattWarning: false,
            brownoutActive: false,
            status: 'OFF',
            canInvert: false,
        });

        if (!hasBattery) return;

        const invEnabled = inv.properties?.enabled !== false;
        const bypass = Boolean(inv.properties?.isBypassMode);

        // Treat toggling OFF as a reset (clears trip + overload timer).
        const wasTripped = Boolean(inv.properties?.isTripped);
        if (!invEnabled) {
            pushUpdate(inv.id, {
                isTripped: false,
                overloadTimerSec: 0,
                overloadActive: false,
                status: 'OFF',
                canInvert: false,
            });
            ensureBus(busByKey, batteryIds, batteryStrings)?.inverters.push({
                invId: inv.id,
                batteryIds,
                requestedW: 0,
                outputW: 0,
                dcLoadW: 0,
                status: 'OFF',
                isTripped: false,
                overloadActive: false,
                overloadTimerSec: 0,
            });
            return;
        }

        if (bypass) {
            pushUpdate(inv.id, { status: 'BYPASS', canInvert: false });
            ensureBus(busByKey, batteryIds, batteryStrings)?.inverters.push({
                invId: inv.id,
                batteryIds,
                requestedW: 0,
                outputW: 0,
                dcLoadW: 0,
                status: 'BYPASS',
                isTripped: false,
                overloadActive: false,
                overloadTimerSec: 0,
            });
            return;
        }

        // AC load requested (from evaluateLoads attribution to this inverter as the source)
        const requestedW = Math.max(0, Number(deviceLoads?.[inv.id]?.P || 0));

        const ratedW = Math.max(0, Number(inv.properties?.ratedW ?? inv.properties?.capacityVA ?? 1000));
        const surgeW = Math.max(ratedW, Number(inv.properties?.surgeW ?? ratedW));
        const surgeSec = Math.max(0, Number(inv.properties?.surgeSec ?? 0));
        const overloadDelaySec = Math.max(0, Number(inv.properties?.overloadDelaySec ?? 1));
        const invEff = Math.max(0.01, Math.min(1, Number(inv.properties?.efficiency ?? 0.9)));

        // Estimate bus voltage for UI current readouts (avoid negative/zero)
        const vEsts = batteryIds.map(bid => {
            const b = components.find(c => c.id === bid);
            const v = Number(b?.properties?.terminalVoltage || b?.properties?.voltage || 12);
            return (Number.isFinite(v) && v > 1) ? v : Number(b?.properties?.voltage || 12);
        }).filter(v => Number.isFinite(v) && v > 1);
        const vBusEst = vEsts.length ? (vEsts.reduce((a, b) => a + b, 0) / vEsts.length) : 12;

        let isTripped = wasTripped;
        let overloadActive = false;
        let overloadTimerSec = Math.max(0, Number(inv.properties?.overloadTimerSec ?? 0));
        let status = 'ON';
        let outputW = requestedW;

        if (isTripped) {
            status = 'TRIPPED';
            outputW = 0;
        } else if (requestedW <= ratedW) {
            status = 'ON';
            overloadActive = false;
            overloadTimerSec = 0;
            outputW = requestedW;
        } else {
            status = 'OVERLOAD';
            overloadActive = true;
            overloadTimerSec += dtSec;

            // Limit delivered output during overload window (prevents insane battery drain)
            outputW = Math.min(requestedW, surgeW);

            const shouldTrip = requestedW > surgeW
                ? (overloadTimerSec >= overloadDelaySec)
                : (surgeSec > 0 && overloadTimerSec >= surgeSec);

            if (shouldTrip) {
                isTripped = true;
                status = 'TRIPPED';
                outputW = 0;
                overloadActive = false;
            }
        }

        const outputA = outputW / 230;
        const dcInputW = outputW / invEff;
        const dcInputA = dcInputW / Math.max(1e-6, vBusEst);

        pushUpdate(inv.id, {
            isTripped,
            overloadActive,
            overloadTimerSec,
            status,
            loadW: requestedW,
            loadA: requestedW / 230,
            outputW,
            outputA,
            outputV: outputW > 0 ? 230 : 0,
            dcInputW,
            dcInputA,
            dcLoadW: dcInputW,
            // canInvert finalized after bus net-power solve (depends on PV + battery)
        });

        ensureBus(busByKey, batteryIds, batteryStrings)?.inverters.push({
            invId: inv.id,
            batteryIds,
            requestedW,
            outputW,
            dcLoadW: dcInputW,
            status,
            isTripped,
            overloadActive,
            overloadTimerSec,
            invEff,
        });
    });

    // 3b) MPPT PV harvesting potential (PV is opportunistic; battery SOC changes only from NET power)
    const mppts = components.filter(c => c.type === COMPONENT_TYPES.SOLAR_CONTROLLER);

    const mpptInfos = []; // computed wiring + PV potential, finalized after bus net-power solve

    mppts.forEach(mppt => {
        // Always reset each tick (prevents stuck metrics when we early-return for any reason)
        // IMPORTANT: UI must be driven by current-tick computed values only.
        const efficiencyUsed = Math.max(0, Math.min(1, Number(mppt.properties?.efficiency ?? 0.95)));
        pushUpdate(mppt.id, {
            isCharging: false,
            chargingW: 0,
            pvInputW: 0,
            inputPowerW: 0, // legacy/alias used by some UI
            pvVmppV: 0,
            pvImppA: 0,
            pvPmppW: 0,
            pvStringCount: 0,
            chargingA: 0,
            avgBatteryV: 0,
            mpptLimitW: 0,
            efficiencyUsed,
            connectedPanels: 0,
            connectedBatteries: 0,
            busDcLoadW: 0,
            busSolarUsedW: 0,
            netBatteryW: 0,
            mode: 'IDLE',
            lastTickReason: '',
        });

        const mpptEnabled = mppt.properties?.enabled !== false;
        if (!mpptEnabled) {
            pushUpdate(mppt.id, { mode: 'IDLE', lastTickReason: 'DISABLED' });
            return;
        }

        const batteryIds = connectedBatteryIdsAt(mppt.id, 'BAT_POS', 'BAT_NEG');
        const batteryStrings = getBatteryStringsAt(mppt.id, 'BAT_POS', 'BAT_NEG');
        if (batteryIds.length === 0) {
            pushUpdate(mppt.id, { connectedBatteries: 0, mode: 'NO_BATTERY', lastTickReason: 'NO_BATTERY' });
            return; // already reset above
        }

        // PV available power must come from REAL wiring topology (series/parallel strings).
        const strings = computePvStringsForMppt(pvGraph, components, mppt.id);
        const pvModel = computePvFromStrings(components, strings, sunIntensity);

        pushUpdate(mppt.id, {
            connectedPanels: pvModel.connectedPanels.length,
            connectedBatteries: batteryIds.length,
            pvVmppV: pvModel.vmppV,
            pvImppA: pvModel.imppA,
            pvPmppW: pvModel.pmppW,
            pvStringCount: pvModel.stringCount,
        });

        let pvAvailableW = Math.max(0, Number(pvModel.pmppW || 0));
        let pvReason = '';
        if (pvModel.connectedPanels.length === 0) {
            pvReason = 'NO_PANELS';
        } else if (pvModel.stringCount === 0) {
            pvReason = 'PV_OPEN';
        } else if (pvAvailableW <= 0) {
            pvReason = 'NO_SUN';
        }

        if (DEBUG_PV_STRINGS) {
            console.log('[PV STRINGS]', {
                mpptId: mppt.id,
                stringCount: pvModel.stringCount,
                strings: pvModel.stringDetails,
                pvAvailableW,
            });
        }

        const pvToDcW = Math.max(0, pvAvailableW * efficiencyUsed);
        const ratingA = Number(mppt.properties.ratingA ?? 40);

        const bus = ensureBus(busByKey, batteryIds, batteryStrings);
        if (bus) {
            const busKey = bus.key;
            mpptInfos.push({
                id: mppt.id,
                busKey,
                batteryIds,
                efficiencyUsed,
                ratingA,
                pvAvailableW,
                pvToDcW,
                pvReason,
            });
            bus.mppts.push(mppt.id);
        }
    });

    // 3c) Solve net power per DC bus and apply to batteries
    const mpptInfoById = new Map(mpptInfos.map(i => [i.id, i]));

    busByKey.forEach(bus => {
        const batteryIds = bus.batteryIds;
        if (!batteryIds || batteryIds.length === 0) return;

        // Battery stats (capacity-weighted)
        const batStats = batteryIds.map(bid => {
            const b = components.find(c => c.id === bid);
            const capAh = Math.max(1e-6, Number(b?.properties?.capacityAh ?? 0));
            const socAh = Math.max(0, Math.min(capAh, Number(b?.properties?.socAh ?? capAh)));
            const v = Number(b?.properties?.terminalVoltage || b?.properties?.voltage || 12);
            const nominalV = Number(b?.properties?.voltage || 12);
            return {
                bid,
                capAh,
                socAh,
                v: (Number.isFinite(v) && v > 0) ? v : 12,
                nominalV: (Number.isFinite(nominalV) && nominalV > 0) ? nominalV : 12,
            };
        });

        const totalCapAh = batStats.reduce((s, x) => s + x.capAh, 0);
        const totalSocAh = batStats.reduce((s, x) => s + x.socAh, 0);
        const avgSocPct = totalCapAh > 0 ? (totalSocAh / totalCapAh) : 1;

        // Calculate bus voltage from battery strings (properly handles series/parallel)
        const calculateBusVoltage = () => {
            const batteryStrings = bus.batteryStrings || [];
            if (batteryStrings.length === 0) {
                // Fallback to old method if no strings info
                return totalCapAh > 0
                    ? (batStats.reduce((s, x) => s + x.v * x.capAh, 0) / totalCapAh)
                    : 12;
            }

            // For each string, voltages add (series)
            const stringVoltages = batteryStrings.map(str => {
                return str.reduce((vSum, batId) => {
                    const batStat = batStats.find(b => b.bid === batId);
                    return vSum + (batStat ? batStat.v : 0);
                }, 0);
            });

            // Multiple strings in parallel: average their voltages
            if (stringVoltages.length === 0) return 12;
            const avgStringV = stringVoltages.reduce((s, v) => s + v, 0) / stringVoltages.length;
            return avgStringV;
        };

        const avgBatteryV = calculateBusVoltage();

        const totalCapacityWh = batStats.reduce((s, x) => s + x.capAh * x.nominalV, 0);
        const totalSocWh = batStats.reduce((s, x) => s + x.socAh * x.nominalV, 0);

        const isFull = avgSocPct >= 0.999;
        const isEmpty = avgSocPct <= 0.001;

        // Decide which inverters on this DC bus can actually invert THIS tick.
        // IMPORTANT: we must not count "loads" for net-power unless the inverter can invert,
        // otherwise you get ghost discharge / oscillation when the inverter is OFF (battery low, tripped, bypass, etc).
        const invDecisionById = new Map(); // invId -> { canInvert, statusForUi, lowBattWarning, recovered, ... }

        (bus.inverters || []).forEach(inv => {
            const invComp = components.find(c => c.id === inv.invId);

            const prevCanInvert = invComp?.properties?.canInvert === true;
            const minSocRunPct = Number(invComp?.properties?.minSocRunPct ?? 0.5);
            const minSocStartPct = Number(invComp?.properties?.minSocStartPct ?? 1);
            const socThreshold = ((prevCanInvert ? minSocRunPct : minSocStartPct) / 100);
            const socOk = avgSocPct >= Math.max(0, socThreshold);

            const invIsTripped = Boolean(inv.isTripped);
            const invStatus = String(inv.status || 'ON');
            const invEnabledForOutput = !invIsTripped && invStatus !== 'OFF' && invStatus !== 'BYPASS';

            const lowBattWarnV = Number(invComp?.properties?.lowBattWarnV ?? 11.2);
            const lowBattCutoffV = Number(invComp?.properties?.lowBattCutoffV ?? 10.8);
            const lowBattRecoverV = Number(invComp?.properties?.lowBattRecoverV ?? 12.0);

            const lowBattWarning = avgBatteryV > 0 && avgBatteryV <= lowBattWarnV;
            const shouldCutoff = avgBatteryV > 0 && avgBatteryV <= lowBattCutoffV;
            const recovered = avgBatteryV >= lowBattRecoverV;

            let canInvert = invEnabledForOutput && socOk && !shouldCutoff;
            let statusForUi = invStatus;

            if (shouldCutoff) {
                // Hard cutoff: stop output and latch trip until user resets.
                canInvert = false;
                statusForUi = 'LOW_BATT_CUTOFF';
            } else if (!canInvert) {
                statusForUi = invIsTripped ? 'TRIPPED' : (invStatus === 'BYPASS' ? 'BYPASS' : 'OFF');
            } else if (lowBattWarning && invStatus === 'ON') {
                statusForUi = 'LOW_BATT_WARN';
            }

            invDecisionById.set(inv.invId, {
                canInvert,
                statusForUi,
                lowBattWarning,
                lowBattWarnV,
                lowBattCutoffV,
                lowBattRecoverV,
                recovered,
            });
        });

        const dcLoadW = (bus.inverters || []).reduce((s, inv) => {
            const canInvert = invDecisionById.get(inv.invId)?.canInvert === true;
            return s + (canInvert ? Number(inv.dcLoadW || 0) : 0);
        }, 0);

        // MPPT output capability on this bus (PV opportunistically harvested, limited by controller ratingA*V)
        const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

        const mpptDetails = (bus.mppts || []).map(id => {
            const info = mpptInfoById.get(id);
            if (!info) return null;
            const mpptLimitW = Math.max(0, Number(info.ratingA || 0) * Math.max(1e-6, avgBatteryV));
            const maxOutW = Math.min(Math.max(0, info.pvToDcW || 0), mpptLimitW);
            return { ...info, mpptLimitW, maxOutW };
        }).filter(Boolean);

        const solarMaxOutW = mpptDetails.reduce((s, m) => s + m.maxOutW, 0);
        const mpptLimitTotalW = mpptDetails.reduce((s, m) => s + m.mpptLimitW, 0);

        // Charge stages limit how much of the bus power is allowed to go into the battery.
        // Load is supplied first by available solar; the remainder (net) charges/discharges the battery.
        let mode = 'NO_PV';
        let stageFactor = 0;

        if (solarMaxOutW > 0) {
            if (isFull && dcLoadW <= 5) {
                mode = 'FULL';
                stageFactor = 0;
            } else if (avgSocPct < 0.80) {
                mode = 'BULK';
                stageFactor = 1.0;
            } else if (avgSocPct < 0.95) {
                mode = 'ABSORB';
                stageFactor = lerp(1.0, 0.3, (avgSocPct - 0.80) / 0.15);
            } else {
                mode = 'FLOAT';
                stageFactor = lerp(0.3, 0.05, (avgSocPct - 0.95) / 0.05);
            }
        }

        // Battery cannot be charged above 100% SOC (net charging is clamped to 0 at full).
        const maxBatteryChargeW = isFull ? 0 : Math.max(0, mpptLimitTotalW * stageFactor);

        // Total solar actually harvested on this bus is limited by what the system can absorb:
        // load first, then allowed battery charging (tapered by stage/SOC).
        const solarUsedW = Math.min(solarMaxOutW, dcLoadW + maxBatteryChargeW);

        let netBatteryW = solarUsedW - dcLoadW;
        if (isEmpty && netBatteryW < 0) netBatteryW = 0;
        if (isFull && netBatteryW > 0) netBatteryW = 0;

        // ═══════════════════════════════════════════════════════════════════════
        // CRITICAL: Distribute current correctly for series/parallel topology
        // ═══════════════════════════════════════════════════════════════════════
        if (Math.abs(netBatteryW) > 1e-9) {
            const batteryStrings = bus.batteryStrings || [];

            if (batteryStrings.length > 0) {
                // Calculate total bus current from net power and bus voltage
                const I_bus = avgBatteryV > 0 ? (netBatteryW / avgBatteryV) : 0;

                // Current splits EQUALLY among parallel strings
                const I_per_string = I_bus / batteryStrings.length;

                // Apply SAME current to all batteries in each series string
                batteryStrings.forEach(stringBatteryIds => {
                    stringBatteryIds.forEach(bid => {
                        const batStat = batStats.find(b => b.bid === bid);
                        const V_bat = batStat ? batStat.v : 12;

                        // Power varies by battery voltage, current is constant in series
                        const P_bat = I_per_string * V_bat;

                        // Store both power and current (current is the physical constraint)
                        addBatteryFlow(bid, P_bat, I_per_string);
                    });
                });
            } else {
                // Fallback: treat all batteries as parallel (old behavior)
                // This handles edge cases where string detection fails
                batStats.forEach(({ bid, capAh }) => {
                    const portion = capAh / Math.max(1e-6, totalCapAh);
                    const P_bat = netBatteryW * portion;
                    const V_bat = batStats.find(b => b.bid === bid)?.v || 12;
                    const I_bat = V_bat > 0 ? (P_bat / V_bat) : 0;
                    addBatteryFlow(bid, P_bat, I_bat);
                });
            }
        }

        (bus.inverters || []).forEach(inv => {
            const decision = invDecisionById.get(inv.invId) || {};
            const canInvert = decision.canInvert === true;

            const shouldCutoff = avgBatteryV > 0 && avgBatteryV <= Number(decision.lowBattCutoffV ?? 10.8);
            const finalIsTripped = Boolean(inv.isTripped) || Boolean(shouldCutoff);
            const finalCanInvert = canInvert && !finalIsTripped;

            const effectiveOutputW = finalCanInvert ? Number(inv.outputW || 0) : 0;
            const effectiveDcLoadW = finalCanInvert ? Number(inv.dcLoadW || 0) : 0;

            pushUpdate(inv.invId, {
                isTripped: finalIsTripped,
                canInvert: finalCanInvert,

                // When the inverter cannot invert, its AC OUT must not energize the network.
                outputV: finalCanInvert ? 230 : 0,
                outputW: effectiveOutputW,
                outputA: effectiveOutputW / 230,

                dcLoadW: effectiveDcLoadW,
                dcInputW: effectiveDcLoadW,
                dcInputA: effectiveDcLoadW / Math.max(1e-6, avgBatteryV),

                // Only show "load" when we are actually supplying AC.
                loadW: finalCanInvert ? Number(inv.requestedW || 0) : 0,
                loadA: finalCanInvert ? (Number(inv.requestedW || 0) / 230) : 0,

                // Display + load-attribution helpers (evaluateLoads uses these)
                socWh: totalSocWh,
                socPercent: Math.max(0, Math.min(100, avgSocPct * 100)),
                batteryVoltage: avgBatteryV,
                totalCapacityWh,
                // Signed net battery power on this DC bus: +ve = charging, -ve = discharging
                netBatteryW,
                // Simple indicator: battery is charging on this bus (net power into battery)
                isCharging: netBatteryW > 1 && avgSocPct < 0.999,
                lowBattWarning: Boolean(decision.lowBattWarning),
                brownoutActive: Boolean(decision.lowBattWarning) && finalCanInvert,
                lowBattRecoverV: Number(decision.lowBattRecoverV ?? 12.0),
                lowBattCutoffV: Number(decision.lowBattCutoffV ?? 10.8),
                lowBattWarnV: Number(decision.lowBattWarnV ?? 11.2),
                lowBattRecovered: Boolean(decision.recovered),
                status: finalIsTripped && shouldCutoff ? 'LOW_BATT_CUTOFF' : String(decision.statusForUi || 'OFF'),
            });
        });

        // Update MPPT metrics (chargingW/A reflect NET battery charging only, not load supply).
        mpptDetails.forEach(m => {
            const mpptSolarUsedW = solarMaxOutW > 0 ? (solarUsedW * (m.maxOutW / solarMaxOutW)) : 0;
            const batteryChargeWTotal = Math.max(0, netBatteryW);
            const mpptBatteryChargeW = solarUsedW > 0 ? (batteryChargeWTotal * (mpptSolarUsedW / solarUsedW)) : 0;
            const chargingA = avgBatteryV > 0 ? (mpptBatteryChargeW / avgBatteryV) : 0;

            const NET_EPS_W = 1;
            const pvPresent = (m.pvAvailableW || 0) > 0;

            let mpptMode = 'IDLE';
            let lastTickReason = '';

            if (!pvPresent) {
                mpptMode = 'NO_PV';
                lastTickReason = m.pvReason || 'NO_PV';
            } else if (dcLoadW > 5 && netBatteryW < -NET_EPS_W) {
                // PV is present, but total load exceeds solar. Battery is discharging (net negative).
                mpptMode = 'LOAD_EXCEEDS_SOLAR';
                lastTickReason = 'LOAD_EXCEEDS_SOLAR';
            } else if (dcLoadW > 5 && Math.abs(netBatteryW) <= NET_EPS_W && solarUsedW > 1) {
                // PV is present and supplying the load, but there's no meaningful net charge into the battery.
                mpptMode = 'SOLAR_TO_LOAD';
                lastTickReason = 'SOLAR_TO_LOAD';
            } else if (isFull && dcLoadW <= 5) {
                mpptMode = 'FULL';
                lastTickReason = 'BAT_FULL_NO_LOAD';
            } else if (netBatteryW > NET_EPS_W) {
                // Net charging state: show charge stage (BULK/ABSORB/FLOAT).
                mpptMode = mode;
            } else {
                mpptMode = 'IDLE';
                lastTickReason = 'ZERO_NET';
            }

            const isCharging =
                mpptBatteryChargeW > 1 &&
                mpptMode !== 'FULL' &&
                !(mpptMode === 'FLOAT' && mpptBatteryChargeW < 5);

            if (DEBUG_SOLAR && isCharging) {
                const posMcbs = Array.from(reachableIdsByType(dcPosGraph, `${m.id}:PV_POS`, COMPONENT_TYPES.DC_MCB));
                const negMcbs = Array.from(reachableIdsByType(dcNegGraph, `${m.id}:PV_NEG`, COMPONENT_TYPES.DC_MCB));
                const mcbIds = Array.from(new Set([...posMcbs, ...negMcbs]));
                const mcbStates = mcbIds.map(mid => ({
                    id: mid,
                    isOn: Boolean(components.find(c => c.id === mid)?.properties?.isOn),
                }));

                console.log('[SOLAR DEBUG] MPPT charging', {
                    mpptId: m.id,
                    mode: mpptMode,
                    pvInputW: Number(m.pvAvailableW || 0),
                    chargingW: mpptBatteryChargeW,
                    chargingA,
                    pvPosConnected: Boolean(m.pvPosConnected),
                    pvNegConnected: Boolean(m.pvNegConnected),
                    dcLoadW,
                    netBatteryW,
                    mcbStates,
                });
            }

            pushUpdate(m.id, {
                pvInputW: Number(m.pvAvailableW || 0),
                inputPowerW: Number(m.pvAvailableW || 0), // legacy/alias used by some UI
                busDcLoadW: dcLoadW,
                busSolarUsedW: solarUsedW,
                netBatteryW,
                chargingW: mpptBatteryChargeW,
                chargingA,
                avgBatteryV,
                mpptLimitW: m.mpptLimitW,
                efficiencyUsed: m.efficiencyUsed,
                isCharging,
                mode: mpptMode,
                lastTickReason,
            });
        });
    });


    // mppts.forEach(mppt => {
    //     const panelIds = connectedPanelIdsAt(mppt.id, 'PV_POS', 'PV_NEG')
    //         .filter(pid => {
    //             const p = components.find(c => c.id === pid);
    //             return p?.properties?.enabled;
    //         });

    //     const batteryIds = connectedBatteryIdsAt(mppt.id, 'BAT_POS', 'BAT_NEG');


    //     // =========================================================
    //     // ✅ REAL FIX: require CLOSED electrical path PV → MPPT
    //     // =========================================================
    //     const pvPosNode = `${mppt.id}:PV_POS`;
    //     const pvNegNode = `${mppt.id}:PV_NEG`;

    //     const panelPosNodes = panelIds.map(pid => `${pid}:POS`);
    //     const panelNegNodes = panelIds.map(pid => `${pid}:NEG`);

    //     const pvPosConnected = panelPosNodes.some(p =>
    //         hasClosedDcPath(dcPosGraph, p, pvPosNode)
    //     );
    //     const pvNegConnected = panelNegNodes.some(p =>
    //         hasClosedDcPath(dcNegGraph, p, pvNegNode)
    //     );

    //     const pvElectricallyPresent = pvPosConnected && pvNegConnected;

    //     if (!pvElectricallyPresent || batteryIds.length === 0) {
    //         pushUpdate(mppt.id, {
    //             isCharging: false,
    //             chargingW: 0,
    //             pvInputW: 0,
    //         });
    //         return; // ⛔ stop MPPT here
    //     }
    //     // =========================================================

    //     const pvAvailableW = panelIds.reduce((sum, pid) => {
    //         const p = components.find(c => c.id === pid);
    //         const rated = Number(p?.properties?.powerW || 0);
    //         return sum + rated * sunIntensity;
    //     }, 0);

    //     if (pvAvailableW <= 0 || batteryIds.length === 0) {
    //         // no meaningful action
    //         return;
    //     }

    //     const eff = Number(mppt.properties.efficiency ?? 0.95);
    //     const pvToDcW = pvAvailableW * eff;

    //     // Estimate battery voltage for clamping current
    //     const batVoltages = batteryIds.map(bid => {
    //         const b = components.find(c => c.id === bid);
    //         return Number(b?.properties?.terminalVoltage || b?.properties?.voltage || 12);
    //     }).filter(v => Number.isFinite(v) && v > 0);

    //     const avgV = batVoltages.length ? (batVoltages.reduce((a, b) => a + b, 0) / batVoltages.length) : 12;

    //     // Clamp by MPPT rating (A)
    //     const ratingA = Number(mppt.properties.ratingA ?? 40);
    //     const maxChargeW = Math.max(0, ratingA * avgV);

    //     const chargeW = Math.min(pvToDcW, maxChargeW);

    //     // Distribute charging proportional to capacityAh (so bigger batteries get more)
    //     const caps = batteryIds.map(bid => {
    //         const b = components.find(c => c.id === bid);
    //         const cap = Number(b?.properties?.capacityAh || 0);
    //         return { bid, cap: Math.max(0.0001, cap) };
    //     });

    //     const totalCap = caps.reduce((s, x) => s + x.cap, 0);

    //     caps.forEach(({ bid, cap }) => {
    //         const portion = cap / totalCap;
    //         addBatteryFlow(bid, chargeW * portion);
    //     });

    //     // Optional: UI/debug on MPPT
    //     pushUpdate(mppt.id, {
    //         pvInputW: pvAvailableW,
    //         chargingW: chargeW,
    //         isCharging: chargeW > 1,
    //     });
    // });

    // -----------------------------
    // 5) Integrate battery SOC from flowW
    // -----------------------------
    components.forEach(comp => {
        if (comp.type !== COMPONENT_TYPES.BATTERY) return;

        // Reset computed flags each tick (prevents sticky CHARGING on batteries)
        pushUpdate(comp.id, { isCharging: false, isDischarging: false, batteryState: 'IDLE' });

        const pending = updatesMap.get(comp.id);
        const flowW = Number(pending?.flowW || 0);
        const flowA = Number(pending?.flowA || 0);  // Current set by bus-level topology

        const capAh = Number(comp.properties.capacityAh || 100);
        const nominalV = Number(comp.properties.voltage || 12);
        const measuredV = Number(comp.properties.terminalVoltage);

        // Always compute voltage from SOC, even when flowW is 0, so voltage never "sticks" from a previous tick.
        // This is required for correct low-battery cutoff behavior.
        const prevAh = Number(comp.properties.socAh ?? capAh);
        const safeCapAh = Math.max(1e-6, capAh);
        const rInt = Number(comp.properties.rInternal ?? 0.05);
        const useV = (Number.isFinite(measuredV) && measuredV > 1)
            ? measuredV
            : Math.max(1, (Number.isFinite(nominalV) && nominalV > 0) ? nominalV : 12);

        let currentA = 0;
        let newAh = Math.max(0, Math.min(safeCapAh, prevAh));

        // ═══════════════════════════════════════════════════════════════════════
        // CRITICAL: Use flowA (current) directly for series batteries
        // Current is the physical constraint in series, NOT power
        // ═══════════════════════════════════════════════════════════════════════
        if (Number.isFinite(flowA) && Math.abs(flowA) > 1e-9 && dtHours > 0) {
            // Use the current that was calculated from series/parallel topology
            currentA = flowA;
            const dAh = currentA * dtHours;
            newAh = Math.max(0, Math.min(safeCapAh, newAh + dAh));
        } else if (Number.isFinite(flowW) && Math.abs(flowW) > 1e-9 && dtHours > 0) {
            // Fallback: if no flowA stored, calculate from power (old behavior)
            currentA = flowW / Math.max(1e-6, useV);
            const dAh = currentA * dtHours;
            newAh = Math.max(0, Math.min(safeCapAh, newAh + dAh));
        }

        // Simple SOC->Voltage approximation (lead-acid-ish) + internal R.
        // 0%: ~10.5V, 50%: ~12.1V, 100%: ~12.7V.
        const socPct = newAh / Math.max(1e-6, safeCapAh);
        const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));
        const restingV = socPct < 0.5
            ? lerp(10.5, 12.1, socPct / 0.5)
            : lerp(12.1, 12.7, (socPct - 0.5) / 0.5);
        const terminalV = Math.max(0, restingV + currentA * rInt);

        const chargingNow = flowW > 1 && newAh < capAh - 1e-6;
        const dischargingNow = flowW < -1 && newAh > 1e-6;

        pushUpdate(comp.id, {
            socAh: newAh,
            terminalVoltage: terminalV,
            isCharging: chargingNow,
            isDischarging: dischargingNow,
            batteryState: chargingNow ? 'CHARGING' : (dischargingNow ? 'DISCHARGING' : 'IDLE'),
        });

        // cleanup accumulator (remove flowW and flowA)
        const { flowW: _ignoreW, flowA: _ignoreA, ...rest } = updatesMap.get(comp.id) || {};
        updatesMap.set(comp.id, rest);
    });

    // -----------------------------
    // Return updates
    // -----------------------------
    const result = [];
    updatesMap.forEach((props, id) => result.push({ id, properties: props }));
    return result;
};
