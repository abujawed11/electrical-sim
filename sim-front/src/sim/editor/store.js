import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { PART_REGISTRY } from './parts/partRegistry';
import { evaluateNetwork } from './logic/evaluateNetwork';
import { validateLesson, getLesson } from './lessons/lessonEngine';
import { LESSON_PATH } from './lessons/lessonPathSinglePhase';

const DEFAULT_SIM_STATE = {
  livePhaseSet: new Set(),
  neutralSet: new Set(),
  earthSet: new Set(),
  socketStates: {},
};

export const useEditorStore = create((set, get) => ({
  components: [],
  wires: [],
  selectedId: null,
  selectedWireId: null,
  hoveredTerminal: null,
  draftWire: null,
  simulationState: DEFAULT_SIM_STATE,
  
  // Guided Mode State
  mode: 'SANDBOX', // 'SANDBOX' | 'GUIDED'
  activeLessonId: 'L0',
  lessonStatus: { passed: false, checklist: [] },
  allowedParts: null, // null = all allowed

  stage: {
    scale: 1,
    x: 0,
    y: 0,
  },

  // --- Helper to trigger evaluation ---
  _evaluate: () => {
    const { components, wires, mode, activeLessonId } = get();
    const newState = evaluateNetwork(components, wires);
    
    let lessonStatus = { passed: false, checklist: [] };
    if (mode === 'GUIDED') {
        lessonStatus = validateLesson(activeLessonId, components, wires, newState);
    }

    set({ simulationState: newState, lessonStatus });
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
    // Optional: Clear canvas on lesson start? Or keep building?
    // "Guided" implies building sequentially. We keep canvas.
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

  // --- Wire Actions ---

  startWire: (compId, terminalId) => {
    const comp = get().components.find(c => c.id === compId);
    if (!comp) return;

    set({
      draftWire: {
        from: { compId, terminalId },
        toPos: { x: comp.x, y: comp.y }, 
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

  completeWire: (toCompId, toTerminalId) => {
    const { draftWire, components, wires } = get();
    if (!draftWire) return;

    const from = draftWire.from;
    const to = { compId: toCompId, terminalId: toTerminalId };

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
      console.warn(`Mismatch: ${fromTerm.kind} vs ${toTerm.kind}`);
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

}));