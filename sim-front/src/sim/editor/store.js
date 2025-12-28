import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { PART_REGISTRY } from './parts/partRegistry';

export const useEditorStore = create((set, get) => ({
  components: [],
  selectedId: null,
  stage: {
    scale: 1,
    x: 0,
    y: 0,
  },

  // Actions
  addComponent: (type) => {
    const registryItem = PART_REGISTRY[type];
    if (!registryItem) return;

    const newComponent = {
      id: nanoid(),
      type,
      x: -get().stage.x / get().stage.scale + 100, // Place near center-ish of view
      y: -get().stage.y / get().stage.scale + 100,
      rotation: 0,
      properties: { ...registryItem.defaultProperties },
    };

    set((state) => ({
      components: [...state.components, newComponent],
      selectedId: newComponent.id,
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
    set({ selectedId: id });
  },

  removeComponent: (id) => {
    set((state) => ({
      components: state.components.filter((c) => c.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    }));
  },

  updateStage: (stageProps) => {
    set((state) => ({
      stage: { ...state.stage, ...stageProps },
    }));
  },
}));
