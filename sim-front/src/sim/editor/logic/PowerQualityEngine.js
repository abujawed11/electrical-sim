
// Power Quality Simulation Engine
// Handles random phase outages and voltage sag/brownouts

export const DEFAULT_PQ_CONFIG = {
    enabled: false,
    outageEnabled: false,
    brownoutEnabled: false,
    
    baseVoltage: 230,
    brownoutLowVoltageFloor: 160,
    
    // Outage Parameters
    outageMeanIntervalSec: 60, // Avg time between outage events
    outageMinDurationSec: 5,
    outageMaxDurationSec: 20,
    
    // Sag Parameters
    sagResistance: 0.8, // Ohms (effective source impedance)
    sagSmoothingTau: 1.0, // Voltage smoothing time constant (sec)
    
    // Noise
    noiseAmplitude: 3.0, // Volts
};

export const DEFAULT_PQ_STATE = {
    // Current Voltage Levels (Smoothed)
    voltages: { R: 230, Y: 230, B: 230 },
    
    // Phase ON/OFF Status
    phaseStatus: { R: true, Y: true, B: true },
    
    // Internal State
    nextOutageCheck: 0, // Timestamp
    outageEndTimes: { R: 0, Y: 0, B: 0 }, // Timestamp when phase returns
    
    noiseOffsets: { R: 0, Y: 0, B: 0 },
    noiseTime: 0,
};

/**
 * Updates the Power Quality state for a single tick.
 * 
 * @param {Object} prevState - The previous PQ runtime state
 * @param {Object} config - The configuration object
 * @param {Number} dtSec - Time delta in seconds
 * @param {Number} now - Current timestamp (ms)
 * @param {Object} currents - { R: amps, Y: amps, B: amps }
 * @returns {Object} New PQ runtime state
 */
export const updatePowerQuality = (prevState, config, dtSec, now, currents) => {
    if (!config.enabled) {
        return {
            ...DEFAULT_PQ_STATE,
            voltages: {
                R: config.baseVoltage,
                Y: config.baseVoltage,
                B: config.baseVoltage
            }
        };
    }

    // CRITICAL: Deep copy nested objects to avoid mutation issues
    const newState = {
        ...prevState,
        phaseStatus: { ...prevState.phaseStatus },  // Create new object!
        outageEndTimes: { ...prevState.outageEndTimes },
        voltages: { ...prevState.voltages },
        noiseOffsets: { ...prevState.noiseOffsets }
    };
    
    // 1. Handle Outages
    if (config.outageEnabled) {
        // Check if any active outage has ended
        ['R', 'Y', 'B'].forEach(phase => {
            if (!newState.phaseStatus[phase]) {
                if (now >= newState.outageEndTimes[phase]) {
                    newState.phaseStatus[phase] = true; // Restore
                }
            }
        });

        // Trigger new outage?
        if (now >= newState.nextOutageCheck) {
            console.log('[PQ ENGINE] ⚡ OUTAGE TRIGGERED!');
            console.log('[PQ ENGINE] Current time:', now);
            console.log('[PQ ENGINE] Was scheduled for:', newState.nextOutageCheck);

            // Schedule next check (random interval)
            const interval = randomExp(config.outageMeanIntervalSec) * 1000;
            newState.nextOutageCheck = now + Math.max(5000, interval); // Min 5s between checks

            console.log('[PQ ENGINE] Next outage scheduled in:', interval / 1000, 'seconds');

            // Roll for outage
            // Simple logic: Always trigger an event at 'nextOutageCheck'
            // We can add a "probability of event" if we checked every tick,
            // but here we just schedule the *next event*.

            // Determine how many phases fail
            const r = Math.random();
            let count = 1;
            if (r > 0.95) count = 3;
            else if (r > 0.70) count = 2;

            console.log('[PQ ENGINE] Phase failure count:', count);

            // Determine which phases
            const phases = ['R', 'Y', 'B'];
            // Shuffle
            for (let i = phases.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [phases[i], phases[j]] = [phases[j], phases[i]];
            }
            const targets = phases.slice(0, count);

            // Determine Duration
            const durationSec = clamp(
                randomLogNormal(config.outageMeanIntervalSec / 5), // Heuristic
                config.outageMinDurationSec,
                config.outageMaxDurationSec
            );

            console.log('[PQ ENGINE] Affected phases:', targets);
            console.log('[PQ ENGINE] Duration:', durationSec, 'seconds');

            targets.forEach(p => {
                newState.phaseStatus[p] = false;
                newState.outageEndTimes[p] = now + (durationSec * 1000);
            });

            console.log('[PQ ENGINE] ✅ New phaseStatus object created:', newState.phaseStatus);
            console.log('[PQ ENGINE] ✅ This is a NEW object (not mutated)');
        }
    } else {
        // Reset phases if outage disabled
        newState.phaseStatus = { R: true, Y: true, B: true };
    }

    // 2. Handle Voltage / Brownout
    const phases = ['R', 'Y', 'B'];
    const time = newState.noiseTime + dtSec;
    newState.noiseTime = time;

    phases.forEach((p, idx) => {
        let targetV = config.baseVoltage;

        if (!newState.phaseStatus[p]) {
            targetV = 0;
        } else if (config.brownoutEnabled) {
            // Noise
            // Simple sum of sines with different frequencies
            const noise = 
                Math.sin(time * 0.5 + idx) * (config.noiseAmplitude * 0.6) +
                Math.sin(time * 2.3 + idx * 2) * (config.noiseAmplitude * 0.4);
            
            // Sag (I * R)
            // Clamp current to avoid negative voltage blowout
            const sag = (currents[p] || 0) * config.sagResistance;
            
            targetV = config.baseVoltage + noise - sag;
            
            // Clamp Low
            if (targetV < config.brownoutLowVoltageFloor) targetV = config.brownoutLowVoltageFloor;
        }

        // Smoothing (Exponential Moving Average)
        // V_new = V_old + (V_target - V_old) * alpha
        // alpha = 1 - exp(-dt / tau)
        const alpha = 1 - Math.exp(-dtSec / config.sagSmoothingTau);
        
        // If phase is OFF, drop instantly (or very fast)?
        // Realistically, it drops instantly.
        if (targetV === 0) {
            newState.voltages[p] = 0;
        } else {
            // Check for instant restoration (0 -> 230)
            if (prevState.voltages[p] < 10 && targetV > 100) {
                // Instant restore or fast ramp?
                newState.voltages[p] = targetV; 
            } else {
                newState.voltages[p] = prevState.voltages[p] + (targetV - prevState.voltages[p]) * alpha;
            }
        }
    });

    return newState;
};

// --- Helpers ---

function randomExp(mean) {
    return -Math.log(1 - Math.random()) * mean;
}

function randomLogNormal(mean) {
    // Approx
    return Math.exp(Math.random()) * mean * 0.5; // Very rough
}

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}
