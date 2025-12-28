import { LESSON_PATH } from './lessonPathSinglePhase';

export const validateLesson = (lessonId, components, wires, simulationState) => {
  const lesson = LESSON_PATH.find(l => l.id === lessonId);
  if (!lesson) return { passed: false, checklist: [] };

  // 1. Run basic topology validation
  let passed = false;
  if (lesson.customCheck) {
      passed = lesson.customCheck(simulationState, components);
  } else if (lesson.validate) {
      passed = lesson.validate(components, wires);
  } else {
      passed = true; // Auto-pass if no logic
  }

  // 2. Compute specific checklist items (mocking per-item status for now based on global pass)
  // Ideally, validate returns specific checklist status. 
  // For this prototype, if validate() returns true, all items are checked.
  // We can improve this later by making validate return an object of checked IDs.
  
  const checklist = lesson.checklist.map(item => ({
      ...item,
      completed: passed // Simple all-or-nothing for now
  }));

  // Special handling for L6 (Lamp) to check lit state specifically
  if (lessonId === 'L6') {
      // Find a lamp
      // Check if its L is in livePhaseSet and N is in neutralSet
      const lamps = components.filter(c => c.type === 'LAMP');
      const isLit = lamps.some(l => 
          simulationState.livePhaseSet.has(`${l.id}:L`) && 
          simulationState.neutralSet.has(`${l.id}:N`)
      );
      passed = isLit;
      checklist.forEach(i => i.completed = isLit);
  }

  return { passed, checklist };
};

export const getLesson = (id) => LESSON_PATH.find(l => l.id === id);
