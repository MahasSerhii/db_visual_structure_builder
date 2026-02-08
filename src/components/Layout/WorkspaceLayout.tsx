import React from 'react';
import { useWorkspace, TabData } from '../../context/WorkspaceContext';
import { Plus, X } from 'lucide-react';
// We will import GraphProvider and ProjectSession here directly to Render
import { GraphProvider } from '../../context/GraphContext';
import { ProjectSession } from './Session'; 

import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableTabProps {
  tab: TabData;
  isActive: boolean;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
}

const SortableTab: React.FC<SortableTabProps> = ({ tab, isActive, onActivate, onClose }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const displayTitle = tab.title !== 'New Tab' ? tab.title : (tab.projectId ? tab.projectId : 'New Tab');

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onActivate(tab.id)}
      title={displayTitle}
      className={`
        group flex items-center gap-2 px-3 py-1.5 text-xs rounded-t-md cursor-pointer min-w-[100px] max-w-[200px] flex-1 shrink relative border-t border-x transition-all select-none
        ${tab.hasAlert ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 animate-twitch z-20 font-bold' : ''}
        ${isActive && !tab.hasAlert
            ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-bold border-gray-300 dark:border-slate-700 border-b-white dark:border-b-slate-800 mb-[-1px] z-10' 
            : ( !isActive && !tab.hasAlert ? 'bg-gray-100 dark:bg-slate-950 text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-50 dark:hover:bg-slate-900' : '')
        }
      `}
    >
      {/* Status Dot */}
      <div className={`w-2 h-2 shrink-0 rounded-full ${
        tab.hasAlert 
            ? 'bg-red-500 animate-pulse'
            : tab.isLive 
                ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.4)]'
                : tab.projectId 
                    ? 'bg-indigo-400 dark:bg-indigo-500' 
                    : 'bg-gray-300 dark:bg-gray-600'
      }`} />
      
      <span className="truncate flex-1">{displayTitle} {tab.hasAlert && '(Deleted!)'}</span>
      
      <button 
        onClick={(e) => { 
            e.stopPropagation(); 
            // Prevent drag start on button click if needed, but dnd-kit usually handles buttons well inside activators
            onClose(tab.id); 
        }}
        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-100 hover:text-red-500 rounded text-gray-400 transition-opacity shrink-0"
       // Use pointerDown to stop propagation so it doesn't start drag
       onPointerDown={(e) => e.stopPropagation()}
      >
        <X size={12} />
      </button>
    </div>
  );
};

export const WorkspaceLayout: React.FC = () => {
    const { tabs, activeTabId, addTab, closeTab, setActiveTabId, reorderTabs } = useWorkspace();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // 5px movement required before drag starts, prevents accidental drags on click
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = tabs.findIndex((t) => t.id === active.id);
            const newIndex = tabs.findIndex((t) => t.id === over?.id);
            
            if (oldIndex !== -1 && newIndex !== -1) {
                reorderTabs(arrayMove(tabs, oldIndex, newIndex));
            }
        }
    };

    return (
        <div className="flex flex-col h-screen w-screen bg-gray-100 dark:bg-black overflow-hidden">
            {/* Tab Bar */}
            <div className="flex items-center h-9 bg-gray-200 dark:bg-slate-900 border-b border-gray-300 dark:border-slate-800 px-2 gap-1 select-none overflow-x-auto no-scrollbar w-full">
                
                <DndContext 
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext 
                        items={tabs.map(t => t.id)}
                        strategy={horizontalListSortingStrategy}
                    >
                        {tabs.map(tab => (
                            <SortableTab 
                                key={tab.id}
                                tab={tab}
                                isActive={activeTabId === tab.id}
                                onActivate={setActiveTabId}
                                onClose={closeTab}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
                
                <button 
                    onClick={() => addTab()}
                    className="p-1 hover:bg-gray-300 dark:hover:bg-slate-800 rounded text-gray-500 transition ml-1 shrink-0"
                    title="New Tab"
                >
                    <Plus size={14} />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative bg-white dark:bg-slate-900">
                {tabs.map(tab => (
                    <div 
                        key={tab.id} 
                        className="absolute inset-0 w-full h-full"
                        style={{ 
                            display: tab.id === activeTabId ? 'block' : 'none',
                            // visibility: tab.id === activeTabId ? 'visible' : 'hidden' 
                        }}
                    >
                        {/* 
                            We wrap EACH tab in its own GraphProvider.
                            This ensures separate state (nodes, socket connection) for each room.
                        */}
                        <GraphProvider initialProjectId={tab.projectId || undefined} tabId={tab.id}>
                            <ProjectSession tabId={tab.id} />
                        </GraphProvider>
                    </div>
                ))}
            </div>
        </div>
    );
};
 
