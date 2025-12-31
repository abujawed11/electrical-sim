import { COMPONENT_TYPES, TERMINAL_KINDS } from '../types';
import { PART_DEFINITIONS } from '../parts/partDefinitions';

/**
 * Evaluates Solar and DC Energy physics.
 * Handles PV generation, MPPT charging, Battery SOC updates, and Inverter DC draw.
 * 
 * @param {Array} components 
 * @param {Array} wires 
 * @param {Object} deviceLoads - Calculated AC loads { 'invId': { P: 100, ... } }
 * @param {Number} dtHours - Time delta in hours
 * @param {Number} sunIntensity - 0.0 to 1.0
 * @returns {Array} List of component updates [{ id, properties: {...} }]
 */
export const evaluateSolar = (components, wires, deviceLoads, dtHours, sunIntensity = 1.0) => {
    const updates = [];
    const updatesMap = new Map(); // id -> props

    const addUpdate = (id, props) => {
        const existing = updatesMap.get(id) || {};
        updatesMap.set(id, { ...existing, ...props });
    };

    // 1. Build DC Graph
    const dcGraph = new Map();
    const addEdge = (u, v) => {
        if (!dcGraph.has(u)) dcGraph.set(u, []);
        if (!dcGraph.has(v)) dcGraph.set(v, []);
        dcGraph.get(u).push(v);
        dcGraph.get(v).push(u);
    };

    wires.forEach(w => {
        // Only trace DC wires
        // We can inspect terminal kinds, or just trace everything and filter logic later.
        // Better to be specific.
        const fromComp = components.find(c => c.id === w.from.compId);
        const toComp = components.find(c => c.id === w.to.compId);
        if(!fromComp || !toComp) return;

        const fromDef = PART_DEFINITIONS[fromComp.type];
        const toDef = PART_DEFINITIONS[toComp.type];
        const fromTerm = fromDef.terminals.find(t => t.id === w.from.terminalId);
        const toTerm = toDef.terminals.find(t => t.id === w.to.terminalId);

        const isDC = (k) => k === TERMINAL_KINDS.DC_POS || k === TERMINAL_KINDS.DC_NEG || k === TERMINAL_KINDS.GENERIC;
        
        if (fromTerm && toTerm && (isDC(fromTerm.kind) || isDC(toTerm.kind))) {
             addEdge(`${w.from.compId}:${w.from.terminalId}`, `${w.to.compId}:${w.to.terminalId}`);
        }
    });

    // Internal Connections for MCBs
    components.forEach(c => {
        if (c.type === COMPONENT_TYPES.DC_MCB && c.properties.isOn) {
            addEdge(`${c.id}:IN_POS`, `${c.id}:OUT_POS`);
            addEdge(`${c.id}:IN_NEG`, `${c.id}:OUT_NEG`);
        }
    });

    // 2. Solar Generation (PV -> MPPT)
    const mppts = components.filter(c => c.type === COMPONENT_TYPES.SOLAR_CONTROLLER);
    
    mppts.forEach(mppt => {
        // Find connected PVs on PV_POS / PV_NEG
        const pvPowerW = findConnectedGeneration(mppt.id, 'PV_POS', dcGraph, components, sunIntensity);
        
        // Find connected Batteries on BAT_POS / BAT_NEG
        const batteryIds = findConnectedBatteries(mppt.id, 'BAT_POS', dcGraph, components);
        
        // DEBUG: Trace Solar State
        if (batteryIds.length > 0 || pvPowerW > 0) {
             console.log(`[SOLAR] MPPT ${mppt.id}: PV=${Math.round(pvPowerW)}W, BatCount=${batteryIds.length}`);
        } else {
             // console.log(`[SOLAR] MPPT ${mppt.id}: No PV or No Battery`);
        }
        
        let chargingCurrent = 0;
        let isCharging = false;

        if (batteryIds.length > 0 && pvPowerW > 0) {
            // Simple logic: Distribute power to batteries
            // P_charge = P_pv * Efficiency
            const eff = mppt.properties.efficiency || 0.95;
            const totalChargeW = pvPowerW * eff;
            
            // Apply to batteries
            const wPerBat = totalChargeW / batteryIds.length;
            
            batteryIds.forEach(batId => {
                const bat = components.find(c => c.id === batId);
                const voltage = bat.properties.voltage || 12;
                const i_charge = wPerBat / voltage; // Amps
                
                // Rate Limit by MPPT Rating? 
                // totalCurrent = totalChargeW / voltage. 
                // clamp(totalCurrent, rating)
                
                // Update Battery (Accumulate changes, processed in step 4)
                addBatteryFlow(batId, wPerBat, updatesMap);
            });

            chargingCurrent = totalChargeW / 12; // approx display
            isCharging = true;
        }

        addUpdate(mppt.id, { isCharging, inputPowerW: pvPowerW });
    });

    // 3. Inverter Load (Battery -> Inverter)
    const inverters = components.filter(c => c.type === COMPONENT_TYPES.SOLAR_INVERTER && c.properties.enabled);
    
    inverters.forEach(inv => {
        const loadP = deviceLoads[inv.id]?.P || 0;
        const loadS = deviceLoads[inv.id]?.S || 0;
        
        // Find connected batteries on BAT_POS
        const batteryIds = findConnectedBatteries(inv.id, 'BAT_POS', dcGraph, components);
        
        let hasBattery = batteryIds.length > 0;
        let totalBatCapacity = 0;
        let totalBatSoc = 0;
        let avgVoltage = 0;

        if (hasBattery) {
            let voltSum = 0;
            batteryIds.forEach(bid => {
                const bat = components.find(c => c.id === bid);
                totalBatCapacity += bat.properties.capacityAh * bat.properties.voltage; // Wh
                totalBatSoc += (bat.properties.socAh / bat.properties.capacityAh) * (bat.properties.capacityAh * bat.properties.voltage); // Wh approx
                voltSum += bat.properties.voltage;
            });
            avgVoltage = voltSum / batteryIds.length;
        }

        // Discharge Logic
        // Inverter consumes DC Power = AC Load / Efficiency
        const efficiency = 0.9; 
        const dcPowerDraw = (loadP > 0) ? (loadP / efficiency) : 0;
        
        // Mains Charging Logic (Grid Charging)
        let dcChargingDraw = 0;
        if (inv.properties.isBypassMode && inv.properties.enabled) {
            // If bypass (mains available), we might charge the battery
            // Charging Rate
            const chargeRateW = inv.properties.chargingPowerW || 500;
            // Only charge if not full
            if (hasBattery && totalBatSoc < totalBatCapacity * 0.98) {
                dcChargingDraw = -chargeRateW; // Negative draw = Charging
            }
        }

        const netDcPower = dcPowerDraw + dcChargingDraw; // Positive = Draining, Negative = Charging

        if (hasBattery) {
            // Apply to external batteries
            const wPerBat = netDcPower / batteryIds.length;
            batteryIds.forEach(bid => {
                addBatteryFlow(bid, -wPerBat, updatesMap); // Flow IN is positive in addBatteryFlow logic, so invert
            });
            
            // Update Inverter Display props
            addUpdate(inv.id, { 
                socWh: totalBatSoc, // For display
                batteryVoltage: avgVoltage
            });
        } else {
            // No Battery -> Inverter shuts down or shows error if not in Bypass?
            // If no battery, it can't invert. 
            addUpdate(inv.id, {
                socWh: 0,
                batteryVoltage: 0
            });
        }

        // Handle Overload
        const capacityVA = inv.properties.capacityVA || 2000;
        const isOverloaded = loadS > capacityVA;
        let isAlarming = inv.properties.isAlarming || false;
        let overloadStartTime = inv.properties.overloadStartTime || 0;
        let newEnabled = inv.properties.enabled;

        if (isOverloaded) {
             if (!inv.properties.isOverloaded) {
                 overloadStartTime = Date.now();
                 isAlarming = true;
             }
             // Shutdown check
             const duration = Date.now() - overloadStartTime;
             if (duration > (inv.properties.overloadShutdownDelayMs || 30000)) {
                 newEnabled = false;
                 isAlarming = false;
             }
        } else {
            overloadStartTime = 0;
            isAlarming = false;
        }

        addUpdate(inv.id, { isOverloaded, isAlarming, overloadStartTime, enabled: newEnabled });
    });

    // 4. Finalize Battery States
    // updatesMap entries for batteries contain 'flowW' (Net Flow Watts, + = Charging, - = Discharging)
    updatesMap.forEach((ups, id) => {
        const comp = components.find(c => c.id === id);
        if (comp && comp.type === COMPONENT_TYPES.BATTERY) {
            const flowW = ups.flowW || 0;
            const voltage = comp.properties.voltage || 12;
            
            // Convert Power Flow to Ah Flow
            // I = P / V
            const currentA = flowW / voltage; 
            const deltaAh = currentA * dtHours;

            const newSocAh = Math.max(0, Math.min(comp.properties.capacityAh, comp.properties.socAh + deltaAh));
            
            // Simple Voltage Curve
            // 0% = 11.5V, 100% = 12.8V (Resting)
            // + I * R_internal (0.02 Ohm)
            const socPct = newSocAh / comp.properties.capacityAh;
            const restingV = 11.5 + (1.3 * socPct);
            const rInt = 0.05; // 50 mOhm
            const dynamicV = restingV + (currentA * rInt);

            updatesMap.set(id, { 
                ...ups, 
                socAh: newSocAh,
                terminalVoltage: dynamicV // could be used for display
            });
            delete ups.flowW; // cleanup
        }
    });

    // Convert Map to List
    const result = [];
    updatesMap.forEach((v, k) => result.push({ id: k, properties: v }));
    return result;
};

// --- Helpers ---

function addBatteryFlow(id, watts, map) {
    const prev = map.get(id) || {};
    const flow = prev.flowW || 0;
    map.set(id, { ...prev, flowW: flow + watts });
}

function findConnectedGeneration(startCompId, terminalId, graph, components, sunIntensity) {
    // DFS to find SOLAR_PANELs
    let totalW = 0;
    const visited = new Set();
    const stack = [`${startCompId}:${terminalId}`];
    
    while(stack.length > 0) {
        const curr = stack.pop();
        if (visited.has(curr)) continue;
        visited.add(curr);
        
        const [cId] = curr.split(':');
        const comp = components.find(c => c.id === cId);
        
        if (comp && comp.type === COMPONENT_TYPES.SOLAR_PANEL && comp.properties.enabled) {
            const p = (comp.properties.powerW || 0) * sunIntensity;
            totalW += p;
            // console.log(`[SOLAR] Found Panel ${cId}: ${p}W`);
        }
        
        // Traverse Neighbors
        const neighbors = graph.get(curr) || [];
        neighbors.forEach(n => stack.push(n));
    }
    return totalW;
}

function findConnectedBatteries(startCompId, terminalId, graph, components) {
    const batteryIds = new Set();
    const visited = new Set();
    const stack = [`${startCompId}:${terminalId}`];
    
    while(stack.length > 0) {
        const curr = stack.pop();
        if (visited.has(curr)) continue;
        visited.add(curr);
        
        const [cId] = curr.split(':');
        const comp = components.find(c => c.id === cId);
        
        if (comp && comp.type === COMPONENT_TYPES.BATTERY) {
            batteryIds.add(cId);
        }
        
        const neighbors = graph.get(curr) || [];
        neighbors.forEach(n => stack.push(n));
    }
    return Array.from(batteryIds);
}
