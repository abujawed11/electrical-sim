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

const DEBUG_SOLAR = false;

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

    const findAnyPath = (graph, startNode, targetNode) => {
        if (!startNode || !targetNode) return null;
        if (startNode === targetNode) return [startNode];

        const queue = [startNode];
        const prev = new Map([[startNode, null]]);

        while (queue.length) {
            const cur = queue.shift();
            const nbrs = graph.get(cur) || [];
            for (const n of nbrs) {
                if (prev.has(n)) continue;
                prev.set(n, cur);
                if (n === targetNode) {
                    const path = [];
                    let at = targetNode;
                    while (at !== null) {
                        path.push(at);
                        at = prev.get(at) ?? null;
                    }
                    return path.reverse();
                }
                queue.push(n);
            }
        }
        return null;
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

    const connectedBatteryIdsAt = (compId, posTerminalId, negTerminalId) => {
        const posIds = reachableIdsByType(dcPosGraph, `${compId}:${posTerminalId}`, COMPONENT_TYPES.BATTERY);
        const negIds = reachableIdsByType(dcNegGraph, `${compId}:${negTerminalId}`, COMPONENT_TYPES.BATTERY);
        return Array.from(intersectSets(posIds, negIds));
    };

    const connectedPanelIdsAt = (compId, posTerminalId, negTerminalId) => {
        const posIds = reachableIdsByType(dcPosGraph, `${compId}:${posTerminalId}`, COMPONENT_TYPES.SOLAR_PANEL);
        const negIds = reachableIdsByType(dcNegGraph, `${compId}:${negTerminalId}`, COMPONENT_TYPES.SOLAR_PANEL);
        return Array.from(intersectSets(posIds, negIds));
    };

    // Battery flow accumulator (+W = charging, -W = discharging)
    const addBatteryFlow = (batId, watts) => {
        const prev = updatesMap.get(batId) || {};
        const flowW = prev.flowW || 0;
        updatesMap.set(batId, { ...prev, flowW: flowW + watts });
    };

    // Precompute DC load demand from solar inverters (external battery systems).
    // MPPT uses this to avoid showing "CHARGING" when batteries are full and there is no load,
    // while still allowing PV to support real DC loads when present.
    const solarInverterDcDemands = components
        .filter(c => c.type === COMPONENT_TYPES.SOLAR_INVERTER && c.properties.enabled)
        .map(inv => {
            const invBatteryIds = connectedBatteryIdsAt(inv.id, 'BAT_POS', 'BAT_NEG');
            if (invBatteryIds.length === 0) return { invId: inv.id, invBatteryIds, dcDemandW: 0 };

            const loadP = Number(deviceLoads?.[inv.id]?.P || 0);
            const loadS = Number(deviceLoads?.[inv.id]?.S || 0);
            if (loadP <= 0 && loadS <= 0) return { invId: inv.id, invBatteryIds, dcDemandW: 0 };

            const invEff = Number(inv.properties.efficiency ?? 0.9);
            const dcDemandW = Math.max(0, loadP / Math.max(0.01, invEff));
            return { invId: inv.id, invBatteryIds, dcDemandW };
        });

    // -----------------------------
    // 3) PV -> MPPT -> Battery charging
    // -----------------------------
    const mppts = components.filter(c => c.type === COMPONENT_TYPES.SOLAR_CONTROLLER);


    mppts.forEach(mppt => {
        // Always reset each tick (prevents stuck metrics when we early-return for any reason)
        // IMPORTANT: UI must be driven by current-tick computed values only.
        const efficiencyUsed = Math.max(0, Math.min(1, Number(mppt.properties?.efficiency ?? 0.95)));
        pushUpdate(mppt.id, {
            isCharging: false,
            chargingW: 0,
            pvInputW: 0,
            inputPowerW: 0, // legacy/alias used by some UI
            chargingA: 0,
            avgBatteryV: 0,
            mpptLimitW: 0,
            efficiencyUsed,
            connectedPanels: 0,
            connectedBatteries: 0,
            mode: 'IDLE',
            lastTickReason: '',
        });

        const mpptEnabled = mppt.properties?.enabled !== false;
        if (!mpptEnabled) {
            pushUpdate(mppt.id, { mode: 'IDLE', lastTickReason: 'DISABLED' });
            return;
        }

        const panelIds = connectedPanelIdsAt(mppt.id, 'PV_POS', 'PV_NEG')
            .filter(pid => {
                const p = components.find(c => c.id === pid);
                return p?.properties?.enabled !== false;
            });

        const batteryIds = connectedBatteryIdsAt(mppt.id, 'BAT_POS', 'BAT_NEG');

        pushUpdate(mppt.id, {
            connectedPanels: panelIds.length,
            connectedBatteries: batteryIds.length,
        });

        // ✅ Require CLOSED electrical path PV → MPPT
        const pvPosNode = `${mppt.id}:PV_POS`;
        const pvNegNode = `${mppt.id}:PV_NEG`;

        const panelPosNodes = panelIds.map(pid => `${pid}:POS`);
        const panelNegNodes = panelIds.map(pid => `${pid}:NEG`);

        const pvPosConnected = panelPosNodes.some(p =>
            hasClosedDcPath(dcPosGraph, p, pvPosNode)
        );
        const pvNegConnected = panelNegNodes.some(p =>
            hasClosedDcPath(dcNegGraph, p, pvNegNode)
        );

        const pvElectricallyPresent = pvPosConnected && pvNegConnected;

        if (batteryIds.length === 0) {
            pushUpdate(mppt.id, { mode: 'NO_BATTERY', lastTickReason: 'NO_BATTERY' });
            return; // already reset above
        }

        if (!pvElectricallyPresent || panelIds.length === 0) {
            pushUpdate(mppt.id, { mode: 'NO_PV', lastTickReason: panelIds.length === 0 ? 'NO_PANELS' : 'PV_OPEN' });
            return; // already reset above
        }

        const pvAvailableW = panelIds.reduce((sum, pid) => {
            const p = components.find(c => c.id === pid);
            const rated = Number(p?.properties?.powerW || 0);
            return sum + rated * sunIntensity;
        }, 0);

        if (pvAvailableW <= 0) {
            pushUpdate(mppt.id, { mode: 'IDLE', lastTickReason: 'NO_SUN' });
            return;
        }

        const pvToDcW = pvAvailableW * efficiencyUsed;

        const batVoltages = batteryIds.map(bid => {
            const b = components.find(c => c.id === bid);
            return Number(b?.properties?.terminalVoltage || b?.properties?.voltage || 12);
        }).filter(v => Number.isFinite(v) && v > 0);

        const avgV = batVoltages.length ? (batVoltages.reduce((a, b) => a + b, 0) / batVoltages.length) : 12;

        const ratingA = Number(mppt.properties.ratingA ?? 40);
        const maxChargeW = Math.max(0, ratingA * avgV);
        const chargeWRaw = Math.min(pvToDcW, maxChargeW);

        // Average SOC across connected batteries (0..1)
        const socPcts = batteryIds.map(bid => {
            const b = components.find(c => c.id === bid);
            const capAh = Math.max(1e-6, Number(b?.properties?.capacityAh ?? 0));
            const socAh = Number(b?.properties?.socAh ?? capAh);
            if (!Number.isFinite(capAh) || capAh <= 0) return 1;
            const pct = socAh / capAh;
            return Math.max(0, Math.min(1, pct));
        });
        const avgSocPct = socPcts.length ? (socPcts.reduce((a, b) => a + b, 0) / socPcts.length) : 1;

        // Detect meaningful DC load on this battery network (currently: solar inverters wired to these batteries)
        const batterySet = new Set(batteryIds);
        const dcLoadW = solarInverterDcDemands.reduce((sum, d) => {
            if (d.dcDemandW <= 0) return sum;
            const sharesBattery = d.invBatteryIds.some(id => batterySet.has(id));
            return sharesBattery ? (sum + d.dcDemandW) : sum;
        }, 0);

        // Simple MPPT charge stages + tapering based on SOC.
        const lerp = (a, b, t) => a + (b - a) * Math.max(0, Math.min(1, t));

        let mode = 'BULK';
        let stageFactor = 1.0;
        if (avgSocPct < 0.80) {
            mode = 'BULK';
            stageFactor = 1.0;
        } else if (avgSocPct < 0.95) {
            mode = 'ABSORB';
            stageFactor = lerp(1.0, 0.3, (avgSocPct - 0.80) / 0.15);
        } else {
            mode = 'FLOAT';
            stageFactor = lerp(0.3, 0.05, (avgSocPct - 0.95) / 0.05);
        }

        const taperedChargeW = Math.max(0, chargeWRaw * stageFactor);
        const loadSupportW = Math.max(0, Math.min(chargeWRaw, dcLoadW)); // allow PV to cover real DC load even if SOC is high

        let chargeW = Math.max(taperedChargeW, loadSupportW);

        // Battery is full and there is no meaningful load => stop charging and show FULL (not CHARGING).
        if (avgSocPct >= 0.995 && dcLoadW <= 5) {
            mode = 'FULL';
            chargeW = 0;
        }

        const chargeA = avgV > 0 ? (chargeW / avgV) : 0;

        const caps = batteryIds.map(bid => {
            const b = components.find(c => c.id === bid);
            const cap = Number(b?.properties?.capacityAh || 0);
            return { bid, cap: Math.max(0.0001, cap) };
        });

        const totalCap = caps.reduce((s, x) => s + x.cap, 0);

        if (chargeW > 0) {
            caps.forEach(({ bid, cap }) => {
                const portion = cap / totalCap;
                addBatteryFlow(bid, chargeW * portion);
            });
        }

        if (DEBUG_SOLAR && chargeW > 1) {
            const posStart = panelPosNodes.find(p => hasClosedDcPath(dcPosGraph, p, pvPosNode));
            const negStart = panelNegNodes.find(p => hasClosedDcPath(dcNegGraph, p, pvNegNode));
            const posPath = findAnyPath(dcPosGraph, posStart, pvPosNode) || [];
            const negPath = findAnyPath(dcNegGraph, negStart, pvNegNode) || [];

            const mcbIds = new Set();
            [...posPath, ...negPath].forEach(n => {
                const [compId] = n.split(':');
                const comp = components.find(c => c.id === compId);
                if (comp?.type === COMPONENT_TYPES.DC_MCB) mcbIds.add(compId);
            });

            const mcbStates = Array.from(mcbIds).map(id => {
                const mcb = components.find(c => c.id === id);
                return { id, isOn: Boolean(mcb?.properties?.isOn) };
            });

            console.log('[SOLAR][MPPT][CHARGING]', {
                id: mppt.id,
                pvInputW: pvAvailableW,
                chargingW: chargeW,
                chargingA: chargeA,
                mode,
                avgSocPct,
                dcLoadW,
                pvPosConnected,
                pvNegConnected,
                mcbStates,
            });
        }

        // Now set charging status
        const isCharging =
            chargeW > 1 &&
            mode !== 'FULL' &&
            !(mode === 'FLOAT' && chargeW < 5);

        pushUpdate(mppt.id, {
            pvInputW: pvAvailableW,
            inputPowerW: pvAvailableW, // legacy/alias used by some UI
            chargingW: chargeW,
            chargingA: chargeA,
            avgBatteryV: avgV,
            mpptLimitW: maxChargeW,
            efficiencyUsed,
            isCharging,
            mode,
            lastTickReason:
                mode === 'FULL' ? 'BAT_FULL_NO_LOAD' :
                (chargeW <= 0 ? 'ZERO_CHARGE' : ''),
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
    // 4) Solar inverter DC draw (battery -> AC load)
    // -----------------------------
    const solarInverters = components.filter(c => c.type === COMPONENT_TYPES.SOLAR_INVERTER && c.properties.enabled);

    solarInverters.forEach(inv => {
        // Must have BOTH BAT+ and BAT- connected to same battery(ies)
        const batteryIds = connectedBatteryIdsAt(inv.id, 'BAT_POS', 'BAT_NEG');

        const loadP = Number(deviceLoads?.[inv.id]?.P || 0);
        const loadS = Number(deviceLoads?.[inv.id]?.S || 0);

        const hasBattery = batteryIds.length > 0;

        // Store a helpful status flag for UI
        pushUpdate(inv.id, { hasDcBatteryWired: hasBattery });

        if (!hasBattery) {
            // No DC supply wiring => inverter cannot supply load
            return;
        }

        if (loadP <= 0 && loadS <= 0) return;

        // DC draw includes inverter efficiency (Pdc = Pac / eff)
        const invEff = Number(inv.properties.efficiency ?? 0.9);
        const dcDrawW = loadP / Math.max(0.01, invEff);

        // Split DC draw across connected batteries proportional to capacity
        const caps = batteryIds.map(bid => {
            const b = components.find(c => c.id === bid);
            const cap = Number(b?.properties?.capacityAh || 0);
            return { bid, cap: Math.max(0.0001, cap) };
        });

        const totalCap = caps.reduce((s, x) => s + x.cap, 0);

        caps.forEach(({ bid, cap }) => {
            const portion = cap / totalCap;
            addBatteryFlow(bid, -(dcDrawW * portion)); // negative => discharge
        });
    });

    // -----------------------------
    // 5) Integrate battery SOC from flowW
    // -----------------------------
    components.forEach(comp => {
        if (comp.type !== COMPONENT_TYPES.BATTERY) return;

        // Reset computed flags each tick (prevents sticky CHARGING on batteries)
        pushUpdate(comp.id, { isCharging: false });

        const pending = updatesMap.get(comp.id);
        const flowW = pending?.flowW || 0;
        if (!flowW || !Number.isFinite(flowW) || dtHours <= 0) return;

        const capAh = Number(comp.properties.capacityAh || 100);
        const baseV = Number(comp.properties.voltage || 12);

        // Current from power (I = P/V)
        const currentA = flowW / Math.max(1e-6, baseV);
        const dAh = currentA * dtHours;

        const prevAh = Number(comp.properties.socAh ?? capAh);
        const newAh = Math.max(0, Math.min(capAh, prevAh + dAh));

        // Simple voltage estimate: resting curve + internal R
        const socPct = newAh / Math.max(1e-6, capAh);
        const restingV = 11.5 + (1.3 * socPct);
        const rInt = Number(comp.properties.rInternal ?? 0.05);
        const terminalV = restingV + currentA * rInt;

        pushUpdate(comp.id, {
            socAh: newAh,
            terminalVoltage: terminalV,
            isCharging: flowW > 1 && newAh < capAh - 1e-6,
        });

        // cleanup accumulator
        const { flowW: _ignore, ...rest } = updatesMap.get(comp.id) || {};
        updatesMap.set(comp.id, rest);
    });

    // -----------------------------
    // Return updates
    // -----------------------------
    const result = [];
    updatesMap.forEach((props, id) => result.push({ id, properties: props }));
    return result;
};
