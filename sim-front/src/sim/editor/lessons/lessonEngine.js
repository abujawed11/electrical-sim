import { LESSON_PATH as SINGLE_PHASE_PATH } from './lessonPathSinglePhase';
import { LESSON_PATH_THREE_PHASE } from './lessonPathThreePhase';

export const ALL_LESSONS = [...SINGLE_PHASE_PATH, ...LESSON_PATH_THREE_PHASE];

export const validateLesson = (lessonId, components, wires, simulationState) => {
  const lesson = ALL_LESSONS.find(l => l.id === lessonId);
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

  return { passed, checklist };
};

export const getLesson = (id) => ALL_LESSONS.find(l => l.id === id);
