import React from 'react';
import { useEditorStore } from '../store';
import { getLesson } from '../lessons/lessonEngine';

export const LessonPanel = () => {
  const mode = useEditorStore((state) => state.mode);
  const activeLessonId = useEditorStore((state) => state.activeLessonId);
  const lessonStatus = useEditorStore((state) => state.lessonStatus);
  const nextLesson = useEditorStore((state) => state.nextLesson);
  const prevLesson = useEditorStore((state) => state.prevLesson);

  if (mode !== 'GUIDED') return null;

  const lesson = getLesson(activeLessonId);
  if (!lesson) return null;

  return (
    <div className="absolute top-4 left-72 bg-gray-800 border border-gray-600 rounded-lg p-4 w-96 shadow-lg text-white">
      <div className="flex justify-between items-center mb-2">
         <h2 className="text-lg font-bold text-blue-400">{lesson.title}</h2>
         <span className="text-xs text-gray-400">{lesson.id}</span>
      </div>
      
      <p className="text-sm text-gray-300 mb-4">{lesson.description}</p>
      
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
