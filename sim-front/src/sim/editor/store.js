import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { PART_REGISTRY } from './parts/partRegistry';
import { evaluateNetwork } from './logic/evaluateNetwork';
import { evaluateFaults } from './logic/evaluateFaults';
import { validateLesson, getLesson } from './lessons/lessonEngine';
import { LESSON_PATH } from './lessons/lessonPathSinglePhase';

const DEFAULT_SIM_STATE = {
  livePhaseSet: new Set(),
  neutralSet: new Set(),
  earthSet: new Set(),
  socketStates: {},
  protectedPhaseSet: new Set(),
  protectedNeutralSet: new Set(),
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
      messages: [], // { id, text, type: 'error'|'info' }
      
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

      // --- Helper to trigger evaluation ---
      _evaluate: () => {
        let { components, wires, mode, activeLessonId } = get();
        
        // 1. Compute Network State (Energization)
        let simState = evaluateNetwork(components, wires);
        
        // 2. Check Faults & Trip Devices
        const trips = evaluateFaults(components, wires, simState);
        
        if (trips.length > 0) {
            // Apply trips
            const newComponents = components.map(c => {
                const trip = trips.find(t => t.id === c.id);
                if (trip) {
                    return { ...c, properties: { ...c.properties, ...trip.updates } };
                }
                return c;
            });

            // Add messages
            const newMessages = trips.map(t => ({ id: nanoid(), text: t.msg, type: 'error' }));
            
            set(state => ({
                components: newComponents,
                messages: [...state.messages, ...newMessages]
            }));

            // Re-evaluate network since topology changed (switches opened)
            simState = evaluateNetwork(newComponents, wires);
            // We update local var for lesson validation below
            components = newComponents;
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
        const idx = LESSON_PATH.findIndex(l => l.id === activeLessonId);
        if (idx < LESSON_PATH.length - 1) {
            get().startLesson(LESSON_PATH[idx + 1].id);
        }
      },

      prevLesson: () => {
        const { activeLessonId } = get();
        const idx = LESSON_PATH.findIndex(l => l.id === activeLessonId);
        if (idx > 0) {
            get().startLesson(LESSON_PATH[idx - 1].id);
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
              messages: []
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

        // Step-2 validation: Block cross-kind wiring (Step-6 relies on Fault Parts to bridge kinds)
        if (fromTerm.kind !== toTerm.kind) {
          console.warn(`Mismatch: ${fromTerm.kind} vs ${toTerm.kind}`);
          get().addMessage(`Cannot connect ${fromTerm.kind} to ${toTerm.kind}. Use a Fault Part if testing faults.`, 'error');
          set({ draftWire: null });
          return;
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
      }),
      onRehydrateStorage: () => (state) => {
          if (state) {
              state._evaluate();
          }
      },
    }
  )
);