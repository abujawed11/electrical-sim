import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { PART_DEFINITIONS as PART_REGISTRY } from './parts/partDefinitions';
import { evaluateNetwork } from './logic/evaluateNetwork';
import { evaluateFaults } from './logic/evaluateFaults';
import { evaluateLoads } from './logic/evaluateLoads';
import { evaluateAutoChangeover } from './logic/evaluateAutoChangeover';
import { validateLesson, getLesson, ALL_LESSONS } from './lessons/lessonEngine';

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

      // Time & Energy Simulation State
      simRunning: true,
      timeScale: 1, // 1x real time
      energyKWh: 0,
      energy3PhaseKWh: 0, // 3-Phase energy meter
      lastTickMs: Date.now(),

      // Guided Mode State
      mode: 'SANDBOX', 
      activeLessonId: 'L0',
      lessonStatus: { passed: false, checklist: [] },
      allowedParts: null, 

      stage: {
        scale: 1,
        x: 0,
        y: 0,
      },

      setMainsVoltage: (v) => {
          set({ mainsVoltage: Number(v) });
          get()._evaluate();
      },

      // --- Simulation Control Actions ---
      toggleSim: () => {
          set(state => ({ 
              simRunning: !state.simRunning,
              lastTickMs: Date.now() // Reset tick to prevent jump
          }));
      },

      setTimeScale: (scale) => {
          set({ timeScale: Number(scale) });
      },

      resetEnergy: () => {
          set({ energyKWh: 0, energy3PhaseKWh: 0 });
      },

      tickEnergy: (now) => {
          const { simRunning, lastTickMs, timeScale, simulationState, components } = get();
          if (!simRunning) {
              // Just update lastTick to now so we don't accumulate paused time later
              set({ lastTickMs: now });
              return;
          }

          const dtMs = now - lastTickMs;
          if (dtMs <= 0) return; // Should not happen but safety check

          const dtSec = dtMs / 1000;
          const scaledDtSec = dtSec * timeScale;
          const dtHours = scaledDtSec / 3600;

          const totalMainsPowerW = simulationState.deviceLoads?.['TOTAL_MAINS']?.P || 0;

          // Energy (kWh) = Power (kW) * Time (h)
          const deltaKWh = (totalMainsPowerW / 1000) * dtHours;

          // 3-Phase Energy Calculation
          // Calculate total power from all loads (3-phase system includes all phases)
          const totalSystemPowerW = simulationState.totalSystemPowerW || 0;
          const delta3PhaseKWh = (totalSystemPowerW / 1000) * dtHours;

          // Inverter Logic (Drain & Overload) & Auto Changeover Timers
          let componentsChanged = false;
          let needReeval = false;

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

          if (componentsChanged) {
              set(state => ({
                  energyKWh: state.energyKWh + deltaKWh,
                  energy3PhaseKWh: state.energy3PhaseKWh + delta3PhaseKWh,
                  lastTickMs: now,
                  components: newComponents
              }));
              if (needReeval) {
                  get()._evaluate();
              }
          } else {
              set(state => ({
                  energyKWh: state.energyKWh + deltaKWh,
                  energy3PhaseKWh: state.energy3PhaseKWh + delta3PhaseKWh,
                  lastTickMs: now
              }));
          }
      },

      // --- Helper to trigger evaluation ---
      _evaluate: () => {
        let { components, wires, mode, activeLessonId, mainsVoltage } = get();
        
        // 1. Compute Network State (Energization)
        let simState = evaluateNetwork(components, wires);
        
        // 2. Compute Loads
        const loadRes = evaluateLoads(components, wires, simState, mainsVoltage);
        simState.loadData = loadRes.loadData;
        simState.deviceLoads = loadRes.deviceLoads;
        simState.totalSystemPowerW = loadRes.totalSystemPowerW;

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
            simState = evaluateNetwork(components, wires);
            const loadRes2 = evaluateLoads(components, wires, simState, mainsVoltage);
            simState.loadData = loadRes2.loadData;
            simState.deviceLoads = loadRes2.deviceLoads;
            simState.totalSystemPowerW = loadRes2.totalSystemPowerW;
        }

        let lessonStatus = { passed: false, checklist: [] };
        if (mode === 'GUIDED') {
            lessonStatus = validateLesson(activeLessonId, components, wires, simState);
        }

        set({ simulationState: simState, lessonStatus });
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

        if (fromTerm.kind !== toTerm.kind) {
          // Allow GENERIC to connect to anything
          if (fromTerm.kind === 'GENERIC' || toTerm.kind === 'GENERIC') {
              // GENERIC can connect to anything - allow
          }
          // Allow specific phases (PHASE_R, PHASE_Y, PHASE_B) to connect to generic PHASE
          else if (
              (fromTerm.kind === 'PHASE_R' || fromTerm.kind === 'PHASE_Y' || fromTerm.kind === 'PHASE_B') && toTerm.kind === 'PHASE' ||
              (toTerm.kind === 'PHASE_R' || toTerm.kind === 'PHASE_Y' || toTerm.kind === 'PHASE_B') && fromTerm.kind === 'PHASE'
          ) {
              // Phase-specific to generic phase - allow (e.g., BUSBAR_R to MCB)
          }
          else {
              console.warn(`Mismatch: ${fromTerm.kind} vs ${toTerm.kind}`);
              get().addMessage(`Cannot connect ${fromTerm.kind} to ${toTerm.kind}. Use a Junction Box or Fault Part if needed.`, 'error');
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
          simRunning: state.simRunning,
          timeScale: state.timeScale,
          energyKWh: state.energyKWh,
          energy3PhaseKWh: state.energy3PhaseKWh,
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