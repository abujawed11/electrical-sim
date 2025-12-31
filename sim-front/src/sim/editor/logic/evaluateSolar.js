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

    const batteryKeyFor = (batteryIds) => {
        if (!batteryIds || batteryIds.length === 0) return null;
        return [...batteryIds].sort().join('|');
    };

    const ensureBus = (busByKey, batteryIds) => {
        const key = batteryKeyFor(batteryIds);
        if (!key) return null;
        if (!busByKey.has(key)) busByKey.set(key, { key, batteryIds: [...batteryIds].sort(), mppts: [], inverters: [] });
        return busByKey.get(key);
    };

    // -----------------------------
    // 3) Build DC-bus net power (PV - load)
    // -----------------------------
    const busByKey = new Map(); // key -> { batteryIds[], mppts[], inverters[] }

    // 3a) Inverter DC load demand (external battery systems)
    const solarInverters = components.filter(c => c.type === COMPONENT_TYPES.SOLAR_INVERTER);

    solarInverters.forEach(inv => {
        const batteryIds = connectedBatteryIdsAt(inv.id, 'BAT_POS', 'BAT_NEG');
        const hasBattery = batteryIds.length > 0;

        // Reset computed props each tick (prevents sticky flags)
        pushUpdate(inv.id, {
            hasDcBatteryWired: hasBattery,
            loadW: 0,
            loadA: 0,
            outputW: 0,
            outputA: 0,
            dcInputW: 0,
            dcInputA: 0,
            dcLoadW: 0,
            overloadActive: false,
            overloadTimerSec: 0,
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
            ensureBus(busByKey, batteryIds)?.inverters.push({
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
            ensureBus(busByKey, batteryIds)?.inverters.push({
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
            dcInputW,
            dcInputA,
            dcLoadW: dcInputW,
            // canInvert finalized after bus net-power solve (depends on PV + battery)
        });

        ensureBus(busByKey, batteryIds)?.inverters.push({
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

        let pvAvailableW = 0;
        let pvReason = '';
        if (panelIds.length === 0) {
            pvReason = 'NO_PANELS';
        } else if (!pvElectricallyPresent) {
            pvReason = 'PV_OPEN';
        } else {
            pvAvailableW = panelIds.reduce((sum, pid) => {
                const p = components.find(c => c.id === pid);
                const rated = Number(p?.properties?.powerW || 0);
                return sum + rated * sunIntensity;
            }, 0);
            if (pvAvailableW <= 0) pvReason = 'NO_SUN';
        }

        const pvToDcW = Math.max(0, pvAvailableW * efficiencyUsed);
        const ratingA = Number(mppt.properties.ratingA ?? 40);

        const bus = ensureBus(busByKey, batteryIds);
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
        const avgBatteryV = totalCapAh > 0
            ? (batStats.reduce((s, x) => s + x.v * x.capAh, 0) / totalCapAh)
            : 12;

        const totalCapacityWh = batStats.reduce((s, x) => s + x.capAh * x.nominalV, 0);
        const totalSocWh = batStats.reduce((s, x) => s + x.socAh * x.nominalV, 0);

        const isFull = avgSocPct >= 0.999;
        const isEmpty = avgSocPct <= 0.001;

        const dcLoadW = (bus.inverters || []).reduce((s, inv) => s + Number(inv.dcLoadW || 0), 0);

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

        if (Math.abs(netBatteryW) > 1e-9) {
            batStats.forEach(({ bid, capAh }) => {
                const portion = capAh / Math.max(1e-6, totalCapAh);
                addBatteryFlow(bid, netBatteryW * portion);
            });
        }

        // Let solar inverters operate if there's either stored energy OR enough solar to cover some DC demand.
        const energyAvailable = (totalSocAh > 0.01) || (solarUsedW > 5);
        (bus.inverters || []).forEach(inv => {
            const invIsTripped = Boolean(inv.isTripped);
            const invStatus = String(inv.status || 'ON');
            const invEnabledForOutput = !invIsTripped && invStatus !== 'OFF' && invStatus !== 'BYPASS';
            const canInvert = energyAvailable && invEnabledForOutput;

            // If there's no energy available, this inverter cannot supply output (next tick it should stop being an AC source).
            if (!canInvert) {
                pushUpdate(inv.invId, {
                    canInvert: false,
                    outputW: 0,
                    outputA: 0,
                    dcInputW: 0,
                    dcInputA: 0,
                    dcLoadW: 0,
                    status: invIsTripped ? 'TRIPPED' : (invStatus === 'BYPASS' ? 'BYPASS' : 'OFF'),
                });
            }
            pushUpdate(inv.invId, {
                canInvert,
                dcLoadW: canInvert ? Number(inv.dcLoadW || 0) : 0,
                // Display + load-attribution helpers (evaluateLoads uses these)
                socWh: totalSocWh,
                socPercent: Math.max(0, Math.min(100, avgSocPct * 100)),
                batteryVoltage: avgBatteryV,
                totalCapacityWh,
                // Simple indicator: battery is charging on this bus (net power into battery)
                isCharging: netBatteryW > 1 && avgSocPct < 0.999,
            });
        });

        // Update MPPT metrics (chargingW/A reflect NET battery charging only, not load supply).
        mpptDetails.forEach(m => {
            const mpptSolarUsedW = solarMaxOutW > 0 ? (solarUsedW * (m.maxOutW / solarMaxOutW)) : 0;
            const batteryChargeWTotal = Math.max(0, netBatteryW);
            const mpptBatteryChargeW = solarUsedW > 0 ? (batteryChargeWTotal * (mpptSolarUsedW / solarUsedW)) : 0;
            const chargingA = avgBatteryV > 0 ? (mpptBatteryChargeW / avgBatteryV) : 0;

            let mpptMode = mode;
            let lastTickReason = '';

            if ((m.pvAvailableW || 0) <= 0) {
                mpptMode = 'NO_PV';
                lastTickReason = m.pvReason || 'NO_PV';
            } else if (mode === 'FULL') {
                lastTickReason = 'BAT_FULL_NO_LOAD';
            } else if (mpptBatteryChargeW <= 0) {
                if (dcLoadW > 5 && mpptSolarUsedW > 1) lastTickReason = 'SOLAR_TO_LOAD';
                else if (dcLoadW > 5) lastTickReason = 'LOAD_NO_SOLAR';
                else lastTickReason = 'ZERO_NET';
            }

            const isCharging =
                mpptBatteryChargeW > 1 &&
                mpptMode !== 'FULL' &&
                !(mpptMode === 'FLOAT' && mpptBatteryChargeW < 5);

            pushUpdate(m.id, {
                pvInputW: Number(m.pvAvailableW || 0),
                inputPowerW: Number(m.pvAvailableW || 0), // legacy/alias used by some UI
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
        pushUpdate(comp.id, { isCharging: false });

        const pending = updatesMap.get(comp.id);
        const flowW = pending?.flowW || 0;
        if (!flowW || !Number.isFinite(flowW) || dtHours <= 0) return;

        const capAh = Number(comp.properties.capacityAh || 100);
        const nominalV = Number(comp.properties.voltage || 12);
        const measuredV = Number(comp.properties.terminalVoltage);
        // Avoid runaway discharge when a previous tick computed an invalid/negative terminalVoltage.
        const baseV = (Number.isFinite(measuredV) && measuredV > 1)
            ? measuredV
            : Math.max(1, (Number.isFinite(nominalV) && nominalV > 0) ? nominalV : 12);

        // Current from power (I = P/V)
        const currentA = flowW / Math.max(1e-6, baseV);
        const dAh = currentA * dtHours;

        const prevAh = Number(comp.properties.socAh ?? capAh);
        const newAh = Math.max(0, Math.min(capAh, prevAh + dAh));

        // Simple voltage estimate: resting curve + internal R
        const socPct = newAh / Math.max(1e-6, capAh);
        const restingV = 11.5 + (1.3 * socPct);
        const rInt = Number(comp.properties.rInternal ?? 0.05);
        const terminalV = Math.max(0, restingV + currentA * rInt);

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
