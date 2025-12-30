import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { PART_DEFINITIONS as PART_REGISTRY } from './parts/partDefinitions';
import { evaluateNetwork } from './logic/evaluateNetwork';
import { evaluateFaults } from './logic/evaluateFaults';
import { evaluateLoads } from './logic/evaluateLoads';
import { evaluateAutoChangeover } from './logic/evaluateAutoChangeover';
import { validateLesson, getLesson, ALL_LESSONS } from './lessons/lessonEngine';
import { DEFAULT_PQ_CONFIG, DEFAULT_PQ_STATE, updatePowerQuality } from './logic/PowerQualityEngine';

const DEFAULT_SIM_STATE = {
  livePhaseSet: new Set(),
  phaseRSet: new Set(),
  phaseYSet: new Set(),
  phaseBSet: new Set(),
  neutralSet: new Set(),
  earthSet: new Set(),
  socketStates: {},
  protectedPhaseSet: new Set(),
  protectedNeutralSet: new Set(),
  loadData: {}, 
  deviceLoads: {}, 
  phaseCurrents: { R: 0, Y: 0, B: 0 },
  totalSystemPowerW: 0,
};

export const useEditorStore = create(
  persist(
    (set, get) => ({
      components: [],
      wires: [],
      selectedId: null,
      selectedWireId: null,
      hoveredTerminal: null,
      draftWire: null,
      simulationState: DEFAULT_SIM_STATE,
      messages: [], 
      
      mainsVoltage: 230,

      // Power Quality State
      pqConfig: DEFAULT_PQ_CONFIG,
      pqState: DEFAULT_PQ_STATE,

      // Time & Energy Simulation State
      simRunning: true,
      timeScale: 1, // 1x real time
      energyKWh: 0,
      energy3PhaseKWh: 0, // 3-Phase energy meter
      energyByMeterKWh: {},
      energyBy3PMeterKWh: {},
      lastTickMs: Date.now(),
      lastPQReevalMs: 0,

      // Guided Mode State
      mode: 'SANDBOX', 
      activeLessonId: 'L0',
      lessonStatus: { passed: false, checklist: [] },
      allowedParts: null, 
      
      // --- Measurement Tools ---
      activeTool: 'IDLE', // 'IDLE', 'VOLTMETER', 'AMMETER'
      probePoints: [], // [{ type: 'terminal', compId, terminalId, x, y }]
      measurementResult: null, // { type: 'VOLT'|'AMP', val: string, unit: string }

      stage: {
        scale: 1,
        x: 0,
        y: 0,
      },

      setPQConfig: (configUpdate) => {
          set(state => {
              const newConfig = { ...state.pqConfig, ...configUpdate };
              console.log('[DEBUG] setPQConfig called');
              console.log('[DEBUG] Update:', configUpdate);
              console.log('[DEBUG] New pqConfig:', newConfig);
              const nextState = { pqConfig: newConfig };
              if (configUpdate.baseVoltage != null) {
                  nextState.mainsVoltage = Number(configUpdate.baseVoltage);
              }
              return nextState;
          });
      },

      // Manual Phase Control (for testing/debugging)
      setPhaseStatus: (phase, status) => {
          const { pqState } = get();
          const newPhaseStatus = { ...pqState.phaseStatus, [phase]: status };
          const newPQState = { ...pqState, phaseStatus: newPhaseStatus };

          console.log(`[DEBUG] Manual phase control: ${phase} = ${status}`);
          console.log('[DEBUG] New phase status:', newPhaseStatus);

          set({ pqState: newPQState });

          // Force immediate re-evaluation with new state
          get()._evaluateWithPQ(newPQState, null);
      },

      setActiveTool: (tool) => {
          set({ 
              activeTool: tool, 
              probePoints: [], 
              measurementResult: null,
              selectedId: null,
              draftWire: null 
          });
      },

      addProbePoint: (point) => {
          const { activeTool, probePoints, simulationState, mainsVoltage } = get();
          
          if (activeTool === 'VOLTMETER') {
              const newPoints = [...probePoints, point];
              if (newPoints.length === 2) {
                  // Calculate Voltage
                  const getPhasor = (compId, termId) => {
                      const id = `${compId}:${termId}`;
                      const { terminalPhasors, livePhaseSet, neutralSet, earthSet, phaseRSet, phaseYSet, phaseBSet, hvPhaseRSet, hvPhaseYSet, hvPhaseBSet } = simulationState;

                      if (terminalPhasors && terminalPhasors[id]) return terminalPhasors[id];
                      
                      if (neutralSet.has(id) || earthSet.has(id)) return { re: 0, im: 0 };
                      
                      // HV (11kV L-L -> 6350V L-N)
                      const hvMag = 11000 / Math.sqrt(3);
                      if (hvPhaseRSet.has(id)) return { re: hvMag, im: 0 };
                      if (hvPhaseYSet.has(id)) return { re: hvMag * -0.5, im: hvMag * -0.866 };
                      if (hvPhaseBSet.has(id)) return { re: hvMag * -0.5, im: hvMag * 0.866 };

                      // LV
                      const lvMag = mainsVoltage;
                      if (phaseRSet.has(id)) return { re: lvMag, im: 0 };
                      if (phaseYSet.has(id)) return { re: lvMag * -0.5, im: lvMag * -0.866 };
                      if (phaseBSet.has(id)) return { re: lvMag * -0.5, im: lvMag * 0.866 };
                      
                      // Fallback for generic single phase (treated as R)
                      if (livePhaseSet.has(id)) return { re: lvMag, im: 0 };
                      
                      return { re: 0, im: 0 }; // Dead
                  };

                  const p1 = getPhasor(newPoints[0].compId, newPoints[0].terminalId);
                  const p2 = getPhasor(newPoints[1].compId, newPoints[1].terminalId);

                  const diffRe = p1.re - p2.re;
                  const diffIm = p1.im - p2.im;
                  const mag = Math.sqrt(diffRe*diffRe + diffIm*diffIm);
                  
                  set({ 
                      probePoints: newPoints,
                      measurementResult: { 
                          type: 'VOLT', 
                          val: mag.toFixed(1), 
                          unit: 'V' 
                      } 
                  });
              } else {
                  set({ probePoints: newPoints });
              }
          }
      },

      measureCurrent: (compId, wire) => {
          const { simulationState, components, wires } = get();
          let currentA = 0;

          // Check if this is an earth wire - earth should show 0A in normal operation
          if (wire) {
              const fromComp = components.find(c => c.id === wire.from.compId);
              const fromRegistry = PART_REGISTRY[fromComp?.type];
              const fromTerm = fromRegistry?.terminals.find(t => t.id === wire.from.terminalId);

              if (fromTerm?.kind === 'EARTH') {
                  // Earth wires should not carry current in normal operation
                  set({
                      measurementResult: {
                          type: 'AMP',
                          val: '0.00',
                          unit: 'A'
                      }
                  });
                  return;
              }
          }

          // 1. Direct Component Lookup (Fast Path)
          if (compId && simulationState.deviceLoads?.[compId]) {
              currentA = simulationState.deviceLoads[compId].currentA;
          }
          // 2. Intermediate Wire Tracing (Graph Path)
          else if (wire) {
              // Determine the phase of the measurement wire
              const fromComp = components.find(c => c.id === wire.from.compId);
              const fromRegistry = PART_REGISTRY[fromComp?.type];
              const fromTerm = fromRegistry?.terminals.find(t => t.id === wire.from.terminalId);
              const measuredPhase = fromTerm?.kind; // PHASE_R, PHASE_Y, PHASE_B, PHASE, NEUTRAL, etc.

              // Helper: Check if a node is electrically compatible with the measured phase
              const isPhaseCompatible = (nodeId, targetPhase) => {
                  const [compId, termId] = nodeId.split(':');
                  const comp = components.find(c => c.id === compId);
                  const registry = PART_REGISTRY[comp?.type];
                  const term = registry?.terminals.find(t => t.id === termId);

                  if (!term) return false;

                  // Neutral and Earth are universal - can connect to any phase for return path
                  if (term.kind === 'NEUTRAL' || term.kind === 'EARTH') return true;

                  // Generic terminals can connect to anything
                  if (term.kind === 'GENERIC' || targetPhase === 'GENERIC') return true;

                  // For single-phase 'PHASE' kind, it's compatible with phase-specific R/Y/B
                  if (targetPhase === 'PHASE' && (term.kind === 'PHASE_R' || term.kind === 'PHASE_Y' || term.kind === 'PHASE_B')) return true;
                  if (term.kind === 'PHASE' && (targetPhase === 'PHASE_R' || targetPhase === 'PHASE_Y' || targetPhase === 'PHASE_B')) return true;

                  // Otherwise must match exactly
                  return term.kind === targetPhase;
              };

              // Build lightweight graph
              const graph = new Map();
              const addEdge = (u, v) => {
                  if (!graph.has(u)) graph.set(u, []);
                  if (!graph.has(v)) graph.set(v, []);
                  graph.get(u).push(v);
                  graph.get(v).push(u);
              };

              // Add Wires (excluding the clicked wire = CUT)
              wires.forEach(w => {
                  if (w.id === wire.id) return;
                  addEdge(`${w.from.compId}:${w.from.terminalId}`, `${w.to.compId}:${w.to.terminalId}`);
              });

              // Add Internal Connections (matching evaluateLoads logic)
              components.forEach(c => {
                  const isClosed = (c.properties.isOn && !c.properties.isTripped);
                  const type = c.type;

                  if (type === 'MCB' && isClosed) {
                      addEdge(`${c.id}:LIN`, `${c.id}:LOUT`);
                  }
                  else if (type === 'SWITCH' && c.properties.isOn) {
                      addEdge(`${c.id}:IN_L`, `${c.id}:OUT_L`);
                  }
                  else if (type === 'RCCB' || type === 'RCBO') {
                      if (isClosed) {
                          addEdge(`${c.id}:L_IN`, `${c.id}:L_OUT`);
                          addEdge(`${c.id}:N_IN`, `${c.id}:N_OUT`);
                      }
                  }
                  else if (type === 'METER') {
                      addEdge(`${c.id}:IN_L`, `${c.id}:OUT_L`);
                      addEdge(`${c.id}:IN_N`, `${c.id}:OUT_N`);
                  }
                  else if (type === 'INVERTER' && c.properties.enabled && c.properties.isBypassMode) {
                      addEdge(`${c.id}:AC_IN_L`, `${c.id}:AC_OUT_L`);
                  }
                  else if (type === 'CHANGEOVER') {
                      if (c.properties.position === 'MAINS') {
                          addEdge(`${c.id}:A_L`, `${c.id}:OUT_L`);
                      } else if (c.properties.position === 'INVERTER') {
                          addEdge(`${c.id}:B_L`, `${c.id}:OUT_L`);
                      }
                  }
                  else if (type === 'MCB_3P' && isClosed) {
                      addEdge(`${c.id}:IN_R`, `${c.id}:OUT_R`);
                      addEdge(`${c.id}:IN_Y`, `${c.id}:OUT_Y`);
                      addEdge(`${c.id}:IN_B`, `${c.id}:OUT_B`);
                  }
                  else if (type === 'METER_3P') {
                      addEdge(`${c.id}:IN_R`, `${c.id}:OUT_R`);
                      addEdge(`${c.id}:IN_Y`, `${c.id}:OUT_Y`);
                      addEdge(`${c.id}:IN_B`, `${c.id}:OUT_B`);
                  }
                  else if (type === 'ISOLATOR_3P' && c.properties.isOn) {
                      addEdge(`${c.id}:IN_R`, `${c.id}:OUT_R`);
                      addEdge(`${c.id}:IN_Y`, `${c.id}:OUT_Y`);
                      addEdge(`${c.id}:IN_B`, `${c.id}:OUT_B`);
                  }
                  else if (type === 'BUSBAR') {
                      // BUSBAR uses 'IN' as hub
                      const def = PART_REGISTRY[type];
                      if (def) {
                          const hubTerminal = 'IN';
                          def.terminals.forEach(t => {
                              if (t.id !== hubTerminal) {
                                  addEdge(`${c.id}:${hubTerminal}`, `${c.id}:${t.id}`);
                              }
                          });
                      }
                  }
                  else if (type === 'BUSBAR_R' || type === 'BUSBAR_Y' || type === 'BUSBAR_B') {
                      // Chain all terminals together
                      const def = PART_REGISTRY[type];
                      if (def) {
                          for(let i=0; i<def.terminals.length-1; i++) {
                              addEdge(`${c.id}:${def.terminals[i].id}`, `${c.id}:${def.terminals[i+1].id}`);
                          }
                      }
                  }
                  else if (type === 'NEUTRAL_BAR' || type === 'EARTH_BAR') {
                      // Connect all terminals to the first one (Hub)
                      const def = PART_REGISTRY[type];
                      if (def) {
                          const t0 = def.terminals[0].id;
                          for(let i=1; i<def.terminals.length; i++) {
                              addEdge(`${c.id}:${t0}`, `${c.id}:${def.terminals[i].id}`);
                          }
                      }
                  }
                  else if (type === 'JUNCTION_BOX') {
                      const def = PART_REGISTRY[type];
                      if (def) {
                          for(let i=0; i<def.terminals.length-1; i++) {
                              addEdge(`${c.id}:${def.terminals[i].id}`, `${c.id}:${def.terminals[i+1].id}`);
                          }
                      }
                  }
              });

              // BFS to find Source (phase-aware)
              const hasSource = (startNode) => {
                  const q = [startNode];
                  const visited = new Set([startNode]);
                  while(q.length) {
                      const curr = q.shift();
                      const [cId] = curr.split(':');
                      const comp = components.find(c => c.id === cId);
                      // Check for Active Source
                      if (comp) {
                          if (comp.type === 'SUPPLY' && comp.properties.enabled) return true;
                          if (comp.type === 'SUPPLY_3P' && comp.properties.enabled) return true;
                          if (comp.type === 'FEEDER_11KV' && comp.properties.enabled) return true;
                          if (comp.type === 'INVERTER' && comp.properties.enabled && !comp.properties.isBypassMode && comp.properties.socWh > 0) return true;
                          // Transformer Secondary acts as Source for LV side
                          if (comp.type === 'TRANSFORMER_3P') {
                              // If current node is on Secondary side, consider it a source (simplified)
                              if (curr.includes('SEC')) return true;
                          }
                      }
                      // Only traverse to phase-compatible neighbors
                      for(const n of (graph.get(curr)||[])) {
                          if(!visited.has(n) && isPhaseCompatible(n, measuredPhase)) {
                              visited.add(n);
                              q.push(n);
                          }
                      }
                  }
                  return false;
              };

              const u = `${wire.from.compId}:${wire.from.terminalId}`;
              const v = `${wire.to.compId}:${wire.to.terminalId}`;

              const uHasSource = hasSource(u);
              const vHasSource = hasSource(v);

              let downstreamNode = null;
              // If only one side has source, the other is downstream
              if (uHasSource && !vHasSource) downstreamNode = v;
              else if (vHasSource && !uHasSource) downstreamNode = u;
              
              // If both have source (Loop), or neither (Floating), result is ambiguous.
              // For Radial circuits, this covers 99% of cases.
              
              if (downstreamNode) {
                  let I_real_sum = 0;
                  let I_imag_sum = 0;
                  const q = [downstreamNode];
                  const visited = new Set([downstreamNode]);
                  const countedLoads = new Set(); // Ensure we don't double count polyphase loads

                  while(q.length) {
                      const curr = q.shift();
                      const [cId] = curr.split(':');

                      const loadData = simulationState.loadData?.[cId];
                      if (loadData && !countedLoads.has(cId)) {
                          // For 3-phase loads, the stored I_real/I_imag is the total (sum of all 3 phases)
                          // When measuring a single phase wire, we need per-phase current
                          const comp = components.find(c => c.id === cId);
                          const is3PhaseLoad = comp?.type === 'LOAD_3P_BALANCED';

                          let I_real_contribution = loadData.I_real || 0;
                          let I_imag_contribution = loadData.I_imag || 0;

                          if (is3PhaseLoad) {
                              // Divide by 3 to get per-phase current for balanced 3-phase loads
                              I_real_contribution /= 3;
                              I_imag_contribution /= 3;
                          }

                          I_real_sum += I_real_contribution;
                          I_imag_sum += I_imag_contribution;
                          countedLoads.add(cId);
                      }

                      // CRITICAL FIX: Only traverse to phase-compatible neighbors
                      // This prevents counting loads on different phases
                      for(const n of (graph.get(curr)||[])) {
                          if(!visited.has(n) && isPhaseCompatible(n, measuredPhase)) {
                              visited.add(n);
                              q.push(n);
                          }
                      }
                  }
                  currentA = Math.sqrt(I_real_sum**2 + I_imag_sum**2);
              }
          }

          set({ 
              measurementResult: { 
                  type: 'AMP', 
                  val: currentA.toFixed(2), 
                  unit: 'A' 
              } 
          });
      },

      resetTool: () => {
          set({ activeTool: 'IDLE', probePoints: [], measurementResult: null });
      },

      setMainsVoltage: (v) => {
          const vv = Number(v);
          set(state => ({ mainsVoltage: vv, pqConfig: { ...state.pqConfig, baseVoltage: vv } }));
          get()._evaluate();
      },

      // --- Simulation Control Actions ---
      toggleSim: () => {
          set(state => ({ 
              simRunning: !state.simRunning,
              lastTickMs: Date.now(), // Reset tick to prevent jump
              lastPQReevalMs: 0
          }));
      },

      setTimeScale: (scale) => {
          set({ timeScale: Number(scale) });
      },

      resetEnergy: () => {
           set({ energyKWh: 0, energy3PhaseKWh: 0, energyByMeterKWh: {}, energyBy3PMeterKWh: {} });
       },

      tickEnergy: (now) => {
          const { simRunning, lastTickMs, timeScale, simulationState, components, pqConfig, pqState, energyKWh, energy3PhaseKWh, lastPQReevalMs, energyByMeterKWh, energyBy3PMeterKWh } = get();
          if (!simRunning) {
              set({ lastTickMs: now });
              return;
          }

          const dtMs = now - lastTickMs;
          if (dtMs <= 0) return;

          const dtSec = dtMs / 1000;
          const scaledDtSec = dtSec * timeScale;
          const dtHours = scaledDtSec / 3600;

          // Debug logging for PQ (only log every 5 seconds to reduce spam)
          if (pqConfig.enabled && pqConfig.outageEnabled && now % 5000 < 200) {
              console.log('[DEBUG TICK] Time until next outage:', Math.round((pqState.nextOutageCheck - now) / 1000), 'seconds');
          }

          // 1. Update Power Quality
          const newPQState = updatePowerQuality(
              pqState,
              pqConfig,
              scaledDtSec,
              now,
              simulationState.phaseCurrents || { R:0, Y:0, B:0 }
          );

          // Detect meaningful changes to trigger re-eval
          let needReeval = false;

          // Status change (Outage) -> Topology Change -> Re-eval
          if (
              newPQState.phaseStatus.R !== pqState.phaseStatus.R ||
              newPQState.phaseStatus.Y !== pqState.phaseStatus.Y ||
              newPQState.phaseStatus.B !== pqState.phaseStatus.B
          ) {
              console.log('[DEBUG TICK] ⚡ PHASE STATUS CHANGED - TRIGGERING RE-EVAL!');
              console.log('[DEBUG TICK] Old:', pqState.phaseStatus);
              console.log('[DEBUG TICK] New:', newPQState.phaseStatus);
              needReeval = true;
          }

           // Voltage change (Brownout) -> Load Calc Change -> Re-eval
           // Threshold to avoid re-eval on tiny noise
           const vDiff = (p) => Math.abs(newPQState.voltages[p] - pqState.voltages[p]);
           if (vDiff('R') > 0.5 || vDiff('Y') > 0.5 || vDiff('B') > 0.5) {
               needReeval = true;
           }

           // Keep physics + UI feeling "live": voltage changes can be small per frame due to smoothing,
           // so also re-evaluate at a fixed cadence while PQ is enabled.
           const PQ_REEVAL_INTERVAL_MS = 50;
           if (pqConfig.enabled && (now - (lastPQReevalMs || 0)) >= PQ_REEVAL_INTERVAL_MS) {
               needReeval = true;
           }

           const totalMainsPowerW = simulationState.deviceLoads?.['TOTAL_MAINS']?.P || 0;

          // Energy (kWh) = Power (kW) * Time (h)
           const deltaKWh = (totalMainsPowerW / 1000) * dtHours;

          // 3-Phase Energy Calculation
          const totalSystemPowerW = simulationState.totalSystemPowerW || 0;
           const delta3PhaseKWh = (totalSystemPowerW / 1000) * dtHours;

           // Per-meter energy accumulation (based on downstream power attributed in evaluateLoads)
           const nextEnergyByMeterKWh = { ...(energyByMeterKWh || {}) };
           const nextEnergyBy3PMeterKWh = { ...(energyBy3PMeterKWh || {}) };

           components.forEach(c => {
               if (c.type === 'METER') {
                   const pW = Math.max(0, simulationState.deviceLoads?.[c.id]?.P || 0);
                   nextEnergyByMeterKWh[c.id] = (nextEnergyByMeterKWh[c.id] || 0) + ((pW / 1000) * dtHours);
               }
               if (c.type === 'METER_3P') {
                   const pW = Math.max(0, simulationState.deviceLoads?.[c.id]?.P || 0);
                   nextEnergyBy3PMeterKWh[c.id] = (nextEnergyBy3PMeterKWh[c.id] || 0) + ((pW / 1000) * dtHours);
               }
           });

           // Inverter Logic (Drain & Overload) & Auto Changeover Timers
           let componentsChanged = false;

          const newComponents = components.map(c => {
             // 1. Inverter Logic
             if (c.type === 'INVERTER' && c.properties.enabled) {
                 const loadStats = simulationState.deviceLoads?.[c.id];
                 const loadP = loadStats?.P || 0;
                 const loadS = loadStats?.S || 0;

                 let newSoc = c.properties.socWh;
                 let newOverloaded = false;
                 let isCharging = false;
                 let newEnabled = c.properties.enabled;
                 let overloadStartTime = c.properties.overloadStartTime || 0;
                 let isAlarming = c.properties.isAlarming || false;

                 // Check overload
                 if (loadS > c.properties.capacityVA) newOverloaded = true;

                 // Overload Protection Logic
                 if (newOverloaded && c.properties.enabled) {
                     // Start overload timer if not already started
                     if (!c.properties.isOverloaded) {
                         overloadStartTime = now;
                         isAlarming = true;
                         // Add warning message
                         get().addMessage(`⚠️ ${c.properties.label}: OVERLOAD! Load: ${Math.round(loadS)}VA / Capacity: ${c.properties.capacityVA}VA`, 'warning');
                     }

                     // Check if shutdown delay has elapsed
                     const overloadDuration = now - overloadStartTime;
                     const shutdownDelay = c.properties.overloadShutdownDelayMs || 30000;

                     if (overloadDuration >= shutdownDelay) {
                         // Shutdown inverter
                         newEnabled = false;
                         isAlarming = false;
                         needReeval = true;
                         get().addMessage(`🔴 ${c.properties.label}: SHUTDOWN due to prolonged overload!`, 'error');
                     }
                 } else if (!newOverloaded && c.properties.isOverloaded) {
                     // Overload cleared
                     overloadStartTime = 0;
                     isAlarming = false;
                 }

                 // Battery charging/discharging logic (only if enabled)
                 const maxBattery = c.properties.batteryWh || 1200;
                 const chargingPowerW = c.properties.chargingPowerW || 200; // Default 200W charging rate

                 if (newEnabled) {
                     if (c.properties.isBypassMode) {
                         // Bypass mode (mains available) - Charge battery
                         if (newSoc < maxBattery) {
                             newSoc = Math.min(maxBattery, newSoc + (chargingPowerW * dtHours));
                             isCharging = true;
                         }
                     } else {
                         // Inverter mode (no mains) - Discharge battery
                         if (c.properties.socWh > 0 && loadP > 0) {
                             newSoc = Math.max(0, c.properties.socWh - (loadP * dtHours));
                         }
                     }
                 }

                 const socChanged = Math.abs(newSoc - c.properties.socWh) > 0.001;
                 const overloadChanged = newOverloaded !== c.properties.isOverloaded;
                 const chargingChanged = (c.properties.isCharging || false) !== isCharging;
                 const enabledChanged = newEnabled !== c.properties.enabled;
                 const alarmChanged = isAlarming !== (c.properties.isAlarming || false);

                 if (socChanged || overloadChanged || chargingChanged || enabledChanged || alarmChanged) {
                     componentsChanged = true;
                     if (c.properties.socWh > 0 && newSoc === 0) needReeval = true;
                     if (enabledChanged) needReeval = true;
                     return {
                         ...c,
                         properties: {
                             ...c.properties,
                             socWh: newSoc,
                             isOverloaded: newOverloaded,
                             isCharging,
                             enabled: newEnabled,
                             overloadStartTime,
                             isAlarming
                         }
                     };
                 }
             }
             
             // 2. Auto Changeover Timer Logic (Completion only)
             if (c.type === 'CHANGEOVER' && c.properties.mode === 'AUTO' && c.properties.position === 'OFF' && c.properties.targetPosition) {
                  const elapsed = now - (c.properties.transferStartTime || 0);
                  if (elapsed >= (c.properties.transferDelay || 0)) {
                      componentsChanged = true;
                      needReeval = true; // Circuit re-connects
                      return { 
                          ...c, 
                          properties: { 
                              ...c.properties, 
                              position: c.properties.targetPosition, 
                              targetPosition: null, 
                              transferStartTime: 0 
                          } 
                      };
                  }
             }

             return c;
          });

          // State Update
           const newState = {
               energyKWh: energyKWh + deltaKWh,
               energy3PhaseKWh: energy3PhaseKWh + delta3PhaseKWh,
               energyByMeterKWh: nextEnergyByMeterKWh,
               energyBy3PMeterKWh: nextEnergyBy3PMeterKWh,
               lastTickMs: now,
               pqState: newPQState
           };

           if (needReeval) {
               newState.lastPQReevalMs = now;
           }
          
          if (componentsChanged) {
              newState.components = newComponents;
          }

          set(newState);

          if (needReeval) {
              console.log('[DEBUG TICK] 🔄 Calling _evaluateWithPQ with new PQ state...');
              // Force immediate re-evaluation with the NEW PQ state
              // Don't rely on get() which might return stale data due to async set()
              get()._evaluateWithPQ(newPQState, componentsChanged ? newComponents : components);
              console.log('[DEBUG TICK] ✅ Re-evaluation complete!');
          }
      },

      // --- Helper to trigger evaluation with explicit PQ state ---
      _evaluateWithPQ: (pqStateOverride, componentsOverride) => {
        let { components, wires, mode, activeLessonId, mainsVoltage, pqConfig } = get();

        // Use override if provided, otherwise get from store
        const pqState = pqStateOverride || get().pqState;
        components = componentsOverride || components;

        // 1. Compute Network State (Energization)
        // Pass PQ Status to allow/disallow sources ONLY if PQ enabled
        // If disabled, pass null (all sources ON)
        const phaseStatus = pqConfig?.enabled ? pqState?.phaseStatus : null;

        console.log('[DEBUG] _evaluateWithPQ called');
        console.log('[DEBUG] Full pqConfig:', pqConfig);
        console.log('[DEBUG] PQ Enabled:', pqConfig?.enabled);
        console.log('[DEBUG] Phase Status:', phaseStatus);

        const NOMINAL_LV_VOLTAGE_LN = 230;
        const lvBaseVoltageLN = NOMINAL_LV_VOLTAGE_LN;

        const actualVoltages = (pqConfig?.enabled && pqState?.voltages)
            ? pqState.voltages
            : { R: Number(mainsVoltage ?? 230), Y: Number(mainsVoltage ?? 230), B: Number(mainsVoltage ?? 230) };

        const gridMultiplier = {
            R: lvBaseVoltageLN > 0 ? (Number(actualVoltages.R || 0) / lvBaseVoltageLN) : 1,
            Y: lvBaseVoltageLN > 0 ? (Number(actualVoltages.Y || 0) / lvBaseVoltageLN) : 1,
            B: lvBaseVoltageLN > 0 ? (Number(actualVoltages.B || 0) / lvBaseVoltageLN) : 1,
        };

        let simState = evaluateNetwork(components, wires, phaseStatus, { lvBaseVoltageLN, gridMultiplier });
        
        // 2. Compute Loads
        const loadRes = evaluateLoads(components, wires, simState, { terminalVoltageLN: simState.terminalVoltageLN, legacyVoltages: actualVoltages });
        simState.loadData = loadRes.loadData;
        simState.deviceLoads = loadRes.deviceLoads;
        simState.totalSystemPowerW = loadRes.totalSystemPowerW;
        simState.phaseCurrents = loadRes.phaseCurrents; // Save for next tick

        // 3. Check Faults & Trip Devices
        const trips = evaluateFaults(components, wires, simState);
        let networkChanged = false;

        if (trips.length > 0) {
            components = components.map(c => {
                const trip = trips.find(t => t.id === c.id);
                if (trip) {
                    return { ...c, properties: { ...c.properties, ...trip.updates } };
                }
                return c;
            });

            const newMessages = trips.map(t => ({ id: nanoid(), text: t.msg, type: 'error' }));
            set(state => ({ messages: [...state.messages, ...newMessages] }));
            networkChanged = true;
        }

        // 4. Check Auto Changeover Updates (Instant status update)
        const autoUpdates = evaluateAutoChangeover(components, simState);
        if (autoUpdates.length > 0) {
            components = components.map(c => {
                const update = autoUpdates.find(u => u.id === c.id);
                if (update) {
                    return { ...c, properties: { ...c.properties, ...update.updates } };
                }
                return c;
            });
            networkChanged = true;
        }

         if (networkChanged) {
             set({ components }); // Update store with tripped/auto-updated components
             
             // Re-evaluate network since topology/properties changed
             simState = evaluateNetwork(components, wires, phaseStatus, { lvBaseVoltageLN, gridMultiplier });
             const loadRes2 = evaluateLoads(components, wires, simState, { terminalVoltageLN: simState.terminalVoltageLN, legacyVoltages: actualVoltages });
             simState.loadData = loadRes2.loadData;
             simState.deviceLoads = loadRes2.deviceLoads;
             simState.totalSystemPowerW = loadRes2.totalSystemPowerW;
             simState.phaseCurrents = loadRes2.phaseCurrents;
         }

        let lessonStatus = { passed: false, checklist: [] };
        if (mode === 'GUIDED') {
            lessonStatus = validateLesson(activeLessonId, components, wires, simState);
        }

        set({ simulationState: simState, lessonStatus });
      },

      // --- Original evaluate (backward compatibility) ---
      _evaluate: () => {
        get()._evaluateWithPQ(null, null);
      },

      addMessage: (text, type = 'info') => {
          set(state => ({ messages: [...state.messages, { id: nanoid(), text, type }] }));
      },

      dismissMessage: (id) => {
          set(state => ({ messages: state.messages.filter(m => m.id !== id) }));
      },
      
      resetAllTrips: () => {
          set(state => ({
              components: state.components.map(c => {
                  if (c.properties.isTripped) {
                      return { ...c, properties: { ...c.properties, isTripped: false, isOn: true } };
                  }
                  return c;
              }),
              messages: [] 
          }));
          get()._evaluate();
      },

      setMode: (mode) => {
        set({ mode });
        if (mode === 'GUIDED') {
            get().startLesson('L0');
        } else {
            set({ allowedParts: null });
        }
      },

      startLesson: (lessonId) => {
        const lesson = getLesson(lessonId);
        if (!lesson) return;
        set({ 
            activeLessonId: lessonId,
            allowedParts: lesson.allowedParts || null,
            lessonStatus: { passed: false, checklist: lesson.checklist.map(c => ({...c, completed: false})) }
        });
        get()._evaluate();
      },

      nextLesson: () => {
        const { activeLessonId } = get();
        const idx = ALL_LESSONS.findIndex(l => l.id === activeLessonId);
        if (idx < ALL_LESSONS.length - 1) {
            get().startLesson(ALL_LESSONS[idx + 1].id);
        }
      },

      prevLesson: () => {
        const { activeLessonId } = get();
        const idx = ALL_LESSONS.findIndex(l => l.id === activeLessonId);
        if (idx > 0) {
            get().startLesson(ALL_LESSONS[idx - 1].id);
        }
      },

      // --- Component Actions ---

      addComponent: (type) => {
        const { allowedParts, mode } = get();
        if (mode === 'GUIDED' && allowedParts && !allowedParts.includes(type)) {
            alert("This part is not needed for the current lesson.");
            return;
        }

        const registryItem = PART_REGISTRY[type];
        if (!registryItem) return;

        const newComponent = {
          id: nanoid(),
          type,
          x: -get().stage.x / get().stage.scale + 100,
          y: -get().stage.y / get().stage.scale + 100,
          rotation: 0,
          properties: { ...registryItem.defaultProperties },
        };

        set((state) => ({
          components: [...state.components, newComponent],
          selectedId: newComponent.id,
          selectedWireId: null,
        }));
        get()._evaluate();
      },

      updateComponent: (id, updates) => {
        set((state) => ({
          components: state.components.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
        if (updates.properties) {
            get()._evaluate();
        }
      },

      selectComponent: (id) => {
        set({ selectedId: id, selectedWireId: null });
      },

      removeComponent: (id) => {
        set((state) => ({
          components: state.components.filter((c) => c.id !== id),
          selectedId: state.selectedId === id ? null : state.selectedId,
          wires: state.wires.filter(w => w.from.compId !== id && w.to.compId !== id),
        }));
        get()._evaluate();
      },

      updateStage: (stageProps) => {
        set((state) => ({
          stage: { ...state.stage, ...stageProps },
        }));
      },

      clearAll: () => {
          const { mode } = get();
          set({
              components: [],
              wires: [],
              draftWire: null,
              selectedId: null,
              selectedWireId: null,
              hoveredTerminal: null,
              lessonStatus: mode === 'GUIDED'
                ? { passed: false, checklist: get().lessonStatus.checklist.map(c => ({...c, completed: false})) }
                : { passed: false, checklist: [] },
              messages: [],
              energyKWh: 0, // Reset energy too
              energy3PhaseKWh: 0
          });
          get()._evaluate();
      },

      // --- Wire Actions ---

      startWire: (compId, terminalId) => {
        const comp = get().components.find(c => c.id === compId);
        if (!comp) return;

        set({
          draftWire: {
            from: { compId, terminalId },
            toPos: { x: comp.x, y: comp.y }, 
            waypoints: [],
          },
          selectedId: null,
          selectedWireId: null,
        });
      },

      updateDraft: (x, y) => {
        const { draftWire } = get();
        if (!draftWire) return;
        set({
          draftWire: { ...draftWire, toPos: { x, y } }
        });
      },

      addDraftWaypoint: (x, y) => {
        const { draftWire } = get();
        if (!draftWire) return;
        set({
            draftWire: {
                ...draftWire,
                waypoints: [...draftWire.waypoints, { x, y }]
            }
        });
      },

      completeWire: (toCompId, toTerminalId) => {
        const { draftWire, components, wires } = get();
        if (!draftWire) return;

        const from = draftWire.from;
        const to = { compId: toCompId, terminalId: toTerminalId };
        const waypoints = draftWire.waypoints || [];

        if (from.compId === to.compId && from.terminalId === toTerminalId) {
          if (from.terminalId === toTerminalId) {
            set({ draftWire: null });
            return;
          }
        }

        const fromComp = components.find(c => c.id === from.compId);
        const toComp = components.find(c => c.id === to.compId);
        if (!fromComp || !toComp) { set({ draftWire: null }); return; }

        const fromRegistry = PART_REGISTRY[fromComp.type];
        const toRegistry = PART_REGISTRY[toComp.type];

        const fromTerm = fromRegistry.terminals.find(t => t.id === from.terminalId);
        const toTerm = toRegistry.terminals.find(t => t.id === toTerminalId);

        if (!fromTerm || !toTerm) { set({ draftWire: null }); return; }

        // --- Connection Validation Logic ---
        const isHV = (k) => k.startsWith('HV_PHASE');
        const isLV = (k) => (k.startsWith('PHASE') || k === 'NEUTRAL') && !k.startsWith('HV_PHASE');
        const isGeneric = (k) => k === 'GENERIC';

        const fromIsHV = isHV(fromTerm.kind);
        const toIsHV = isHV(toTerm.kind);
        const fromIsLV = isLV(fromTerm.kind);
        const toIsLV = isLV(toTerm.kind);
        const fromIsGen = isGeneric(fromTerm.kind);
        const toIsGen = isGeneric(toTerm.kind);

        // Rule 1: HV Strictness
        // HV can only connect to HV.
        // Cannot connect HV to LV.
        // Cannot connect HV to Generic (Assume Generic is LV rated).
        if (fromIsHV || toIsHV) {
            if (!fromIsHV || !toIsHV) {
                 get().addMessage(`⚠️ DANGER: Cannot connect 11kV High Voltage to Low Voltage/Generic components!`, 'error');
                 set({ draftWire: null });
                 return;
            }
        }

        if (fromTerm.kind !== toTerm.kind) {
          // Allow GENERIC to connect to LV (already blocked for HV above)
          if (fromTerm.kind === 'GENERIC' || toTerm.kind === 'GENERIC') {
              // GENERIC can connect to anything (that is not HV)
          }
          // Allow specific phases (PHASE_R, PHASE_Y, PHASE_B) to connect to generic PHASE
          else if (
              (fromTerm.kind === 'PHASE_R' || fromTerm.kind === 'PHASE_Y' || fromTerm.kind === 'PHASE_B') && toTerm.kind === 'PHASE' ||
              (toTerm.kind === 'PHASE_R' || toTerm.kind === 'PHASE_Y' || toTerm.kind === 'PHASE_B') && fromTerm.kind === 'PHASE'
          ) {
              // Phase-specific to generic phase - allow (e.g., BUSBAR_R to MCB)
          }
          // Allow HV_PHASE_X <-> HV_PHASE_X (Strict Phase Matching for HV? Optional, but good for safety)
          // For now, let's enforce kind equality for HV phases unless we add a Generic HV kind later.
          // Since we established both are HV above, and kind != kind here:
          // e.g. HV_PHASE_R to HV_PHASE_Y -> Short Circuit!
          // We should probably block cross-phase connections generally unless it's a Fault component.
          // But existing logic blocks it via the "else" block below.
          else {
              console.warn(`Mismatch: ${fromTerm.kind} vs ${toTerm.kind}`);
              get().addMessage(`Cannot connect ${fromTerm.kind} to ${toTerm.kind}.`, 'error');
              set({ draftWire: null });
              return;
          }
        }

        const exists = wires.some(w => 
          (w.from.compId === from.compId && w.from.terminalId === from.terminalId && 
           w.to.compId === to.compId && w.to.terminalId === to.terminalId) ||
          (w.from.compId === to.compId && w.from.terminalId === to.terminalId && 
           w.to.compId === from.compId && w.to.terminalId === from.terminalId)
        );

        if (exists) {
          set({ draftWire: null });
          return;
        }

        const newWire = {
          id: nanoid(),
          from,
          to,
          waypoints,
        };

        set((state) => ({
          wires: [...state.wires, newWire],
          draftWire: null,
        }));
        get()._evaluate();
      },

      cancelWire: () => {
        set({ draftWire: null });
      },

      selectWire: (id) => {
        set({ selectedWireId: id, selectedId: null });
      },

      deleteWire: (id) => {
        set((state) => ({
          wires: state.wires.filter(w => w.id !== id),
          selectedWireId: state.selectedWireId === id ? null : state.selectedWireId,
        }));
        get()._evaluate();
      },

      setHoveredTerminal: (info) => {
        set({ hoveredTerminal: info });
      },

    }),
    {
      name: 'electrical-sim-storage', 
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
          components: state.components,
          wires: state.wires,
          mode: state.mode,
          activeLessonId: state.activeLessonId,
          stage: state.stage,
          mainsVoltage: state.mainsVoltage,
          pqConfig: state.pqConfig, // Persist Power Quality settings
          simRunning: state.simRunning,
          timeScale: state.timeScale,
          energyKWh: state.energyKWh,
          energy3PhaseKWh: state.energy3PhaseKWh,
          energyByMeterKWh: state.energyByMeterKWh,
          energyBy3PMeterKWh: state.energyBy3PMeterKWh,
          lastTickMs: state.lastTickMs // Persist tick so we don't jump time on refresh? Actually better to reset to Now on hydrate.
          // We'll reset lastTickMs on hydrate or init to avoid massive jumps.
      }),
      onRehydrateStorage: () => (state) => {
          if (state) {
              state.lastTickMs = Date.now(); // Reset tick to now
              state._evaluate();
          }
      },
    }
  )
);
