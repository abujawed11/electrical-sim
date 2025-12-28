import React, { useRef } from 'react';
import { Stage, Layer } from 'react-konva';
import { useEditorStore } from '../store';
import { Grid } from '../drawing/Grid';
import { PART_REGISTRY } from '../parts/partRegistry';
import { WiresLayer } from './WiresLayer';
import { DraftWire } from './DraftWire';

export const CanvasStage = () => {
  const stageRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });
  const { 
    components, 
    updateComponent, 
    selectComponent, 
    updateStage, 
    selectedId,
    updateDraft,
    cancelWire,
    selectWire,
    addDraftWaypoint,
    draftWire
  } = useEditorStore();

  React.useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        cancelWire();
        selectComponent(null);
        selectWire(null);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Optional: Trigger delete logic if implemented generally
        // But for now Esc is the main requirement
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelWire, selectComponent, selectWire]);

  const handleWheel = (e) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const scaleBy = 1.1;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    
    // Clamp zoom
    if (newScale < 0.1 || newScale > 5) return;

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    stage.scale({ x: newScale, y: newScale });
    stage.position(newPos);
    
    updateStage({ scale: newScale, x: newPos.x, y: newPos.y });
  };

  const handleDragEnd = (e) => {
    // Determine if we dragged the stage or a component
    if (e.target === e.target.getStage()) {
      updateStage({
        x: e.target.x(),
        y: e.target.y(),
      });
    }
  };

  const handleStageClick = (e) => {
    // If clicked on empty stage
    if (e.target === e.target.getStage()) {
      if (draftWire) {
        // Add waypoint if drafting
        const stage = stageRef.current;
        const pointer = stage.getPointerPosition();
        const transform = stage.getAbsoluteTransform().copy().invert();
        const pos = transform.point(pointer);
        addDraftWaypoint(pos.x, pos.y);
      } else {
        // Else deselect
        selectComponent(null);
        selectWire(null);
      }
    }
  };

  const handleMouseMove = () => {
    const stage = stageRef.current;
    if (!stage) return;
    
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const transform = stage.getAbsoluteTransform().copy().invert();
    const pos = transform.point(pointer);
    
    updateDraft(pos.x, pos.y);
  };

  return (
    <div ref={containerRef} className="flex-1 bg-gray-900 overflow-hidden h-full relative">
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        draggable
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onMouseMove={handleMouseMove}
        className="cursor-crosshair"
      >
        <Layer>
          <Grid />
          <WiresLayer />
          
          {components.map((comp) => {
            const registryItem = PART_REGISTRY[comp.type];
            if (!registryItem) return null;
            const Component = registryItem.component;

            return (
              <Component
                key={comp.id}
                {...comp}
                isSelected={selectedId === comp.id}
                onSelect={(e) => {
                  e.cancelBubble = true;
                  selectComponent(comp.id);
                }}
                onDragEnd={(e) => {
                  updateComponent(comp.id, {
                    x: e.target.x(),
                    y: e.target.y(),
                  });
                }}
              />
            );
          })}
          
          <DraftWire />
        </Layer>
      </Stage>
    </div>
  );
};
