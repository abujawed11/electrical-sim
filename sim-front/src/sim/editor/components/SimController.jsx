import { useEffect, useRef } from 'react';
import { useEditorStore } from '../store';

export const SimController = () => {
  const tickEnergy = useEditorStore((state) => state.tickEnergy);
  const simRunning = useEditorStore((state) => state.simRunning);
  
  const reqRef = useRef();

  useEffect(() => {
    const loop = () => {
      tickEnergy(Date.now());
      reqRef.current = requestAnimationFrame(loop);
    };

    if (simRunning) {
      reqRef.current = requestAnimationFrame(loop);
    }

    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [simRunning, tickEnergy]);

  return null; // Logic only
};
