import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { PART_REGISTRY } from './parts/partRegistry';

export const useEditorStore = create((set, get) => ({
  components: [],
  wires: [],
  selectedId: null, // can be component ID or wire ID (if we mix namespaces or just careful)
  selectedWireId: null, // Let's keep separate for safety, or use a derived selector.
                        // But Step-1 used selectedId for components. 
                        // Let's use `selectedId` for components and `selectedWireId` for wires, 
                        // and ensure they are mutually exclusive in UI logic if needed.
                        // Actually, better: separate them. When selecting component, clear wire sel.
  
  hoveredTerminal: null, // { compId, terminalId }
  draftWire: null,       // { from: { compId, terminalId }, toPos: { x, y } }

  stage: {
    scale: 1,
    x: 0,
    y: 0,
  },

  // --- Component Actions ---

  addComponent: (type) => {
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
  },

  updateComponent: (id, updates) => {
    set((state) => ({
      components: state.components.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  },

  selectComponent: (id) => {
    set({ selectedId: id, selectedWireId: null });
  },

  removeComponent: (id) => {
    set((state) => ({
      components: state.components.filter((c) => c.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      // Also remove connected wires
      wires: state.wires.filter(w => w.from.compId !== id && w.to.compId !== id),
    }));
  },

  updateStage: (stageProps) => {
    set((state) => ({
      stage: { ...state.stage, ...stageProps },
    }));
  },

  // --- Wire Actions ---

  startWire: (compId, terminalId) => {
    // Calculate start pos for draft line? 
    // Actually the UI can derive it, but storing the source is key.
    // Also, we need to know where the mouse is. The caller usually provides initial pos or we wait for move.
    // Let's just set the source.
    const comp = get().components.find(c => c.id === compId);
    if (!comp) return;

    set({
      draftWire: {
        from: { compId, terminalId },
        toPos: { x: comp.x, y: comp.y }, // Initial placeholder
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

    // 1. No self-connection
    if (from.compId === to.compId && from.terminalId === toTerminalId) {
      // connecting to same terminal? Definitely no.
      // connecting to different terminal on same comp? Usually no for simple wiring, but physically possible.
      // Prompt says: "Block connecting a terminal to itself". 
      // Let's block same component for now to be safe, unless valid use case exists.
      // Actually, connecting L_IN to L_OUT on same MCB is a short circuit or bypass? 
      // Let's block same terminal.
      if (from.terminalId === toTerminalId) {
        set({ draftWire: null });
        return;
      }
    }

    // 2. Resolve Kinds
    const fromComp = components.find(c => c.id === from.compId);
    const toComp = components.find(c => c.id === to.compId);
    if (!fromComp || !toComp) { set({ draftWire: null }); return; }

    const fromRegistry = PART_REGISTRY[fromComp.type];
    const toRegistry = PART_REGISTRY[toComp.type];

    const fromTerm = fromRegistry.terminals.find(t => t.id === from.terminalId);
    const toTerm = toRegistry.terminals.find(t => t.id === toTerminalId);

    if (!fromTerm || !toTerm) { set({ draftWire: null }); return; }

    // 3. Validate Kind Match
    if (fromTerm.kind !== toTerm.kind) {
      console.warn(`Mismatch: ${fromTerm.kind} vs ${toTerm.kind}`);
      // TODO: Visual feedback? For now just cancel.
      set({ draftWire: null });
      return;
    }

    // 4. Check Duplicates
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

    // 5. Create Wire
    const newWire = {
      id: nanoid(),
      from,
      to,
    };

    set((state) => ({
      wires: [...state.wires, newWire],
      draftWire: null,
    }));
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
  },

  setHoveredTerminal: (info) => {
    // info: { compId, terminalId } or null
    set({ hoveredTerminal: info });
  },

}));