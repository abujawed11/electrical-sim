import React, { useState, useEffect, useRef } from 'react';
import { useEditorStore } from '../store';
import { getLesson, ALL_LESSONS } from '../lessons/lessonEngine';

export const LessonPanel = () => {
  const mode = useEditorStore((state) => state.mode);
  const activeLessonId = useEditorStore((state) => state.activeLessonId);
  const lessonStatus = useEditorStore((state) => state.lessonStatus);
  const nextLesson = useEditorStore((state) => state.nextLesson);
  const prevLesson = useEditorStore((state) => state.prevLesson);
  const startLesson = useEditorStore((state) => state.startLesson);

  const [showLessonMenu, setShowLessonMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowLessonMenu(false);
      }
    };

    if (showLessonMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showLessonMenu]);

  if (mode !== 'GUIDED') return null;

  const lesson = getLesson(activeLessonId);
  if (!lesson) return null;

  // Group lessons by type
  const singlePhase = ALL_LESSONS.filter(l => l.id.startsWith('L'));
  const threePhase = ALL_LESSONS.filter(l => l.id.startsWith('T'));

  return (
    <div className="absolute top-4 left-72 bg-gray-800 border border-gray-600 rounded-lg p-4 w-96 shadow-lg text-white">
      <div className="flex justify-between items-center mb-2">
         <h2 className="text-lg font-bold text-blue-400">{lesson.title}</h2>
         <div className="flex items-center gap-2">
           <span className="text-xs text-gray-400">{lesson.id}</span>
           <button
             onClick={() => setShowLessonMenu(!showLessonMenu)}
             className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
             title="Jump to lesson"
           >
             📚 Menu
           </button>
         </div>
      </div>

      {/* Lesson Menu Dropdown */}
      {showLessonMenu && (
        <div ref={menuRef} className="absolute top-12 right-4 bg-gray-900 border border-gray-600 rounded-lg p-3 w-80 shadow-xl z-50 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold text-gray-200">Jump to Lesson</h3>
            <button
              onClick={() => setShowLessonMenu(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Single-Phase Lessons */}
          <div className="mb-4">
            <h4 className="text-xs font-bold text-blue-400 mb-2">Single-Phase Path</h4>
            <div className="space-y-1">
              {singlePhase.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    startLesson(l.id);
                    setShowLessonMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-xs ${
                    l.id === activeLessonId
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  <span className="font-bold">{l.id}</span> - {l.title}
                </button>
              ))}
            </div>
          </div>

          {/* 3-Phase Lessons */}
          {threePhase.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-yellow-400 mb-2">3-Phase Path</h4>
              <div className="space-y-1">
                {threePhase.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => {
                      startLesson(l.id);
                      setShowLessonMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded text-xs ${
                      l.id === activeLessonId
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    <span className="font-bold">{l.id}</span> - {l.title}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      <p className="text-sm text-gray-300 mb-4 whitespace-pre-line">{lesson.description}</p>
      
      <div className="bg-gray-900 rounded p-3 mb-4 space-y-2">
         <h3 className="text-xs font-bold uppercase text-gray-500 mb-1">Objectives</h3>
         {lessonStatus.checklist.map((item) => (
             <div key={item.id} className="flex items-center text-sm">
                 <div className={`w-4 h-4 mr-2 rounded border flex items-center justify-center ${
                     item.completed ? 'bg-green-600 border-green-500' : 'bg-gray-800 border-gray-600'
                 }`}>
                     {item.completed && <span className="text-xs">✓</span>}
                 </div>
                 <span className={item.completed ? 'text-gray-400 line-through' : 'text-gray-200'}>
                     {item.label}
                 </span>
             </div>
         ))}
      </div>

      <div className="flex justify-between mt-2">
         <button 
             onClick={prevLesson}
             className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm disabled:opacity-50"
             disabled={activeLessonId === 'L0'}
         >
             Previous
         </button>
         <button 
             onClick={nextLesson}
             className={`px-3 py-1 rounded text-sm font-bold ${
                 lessonStatus.passed 
                 ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                 : 'bg-gray-700 text-gray-500 cursor-not-allowed'
             }`}
             disabled={!lessonStatus.passed}
         >
             Next Lesson
         </button>
      </div>
    </div>
  );
};
