import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useGraph } from '../../context/GraphContext';
import { X, GripVertical, Search, Box, ArrowRight, Layers } from 'lucide-react';
import { NodeData } from '../../utils/types';

interface ComponentsListModalProps {
    onClose: () => void;
    onNodeSelect?: (node: NodeData) => void;
}

export const ComponentsListModal: React.FC<ComponentsListModalProps> = ({ onClose, onNodeSelect }) => {
    const { nodes, edges, t } = useGraph();
    const [search, setSearch] = useState('');
    
    // Drag Logic
    const [position, setPosition] = useState({ x: window.innerWidth - 350, y: 150 });
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef<{ startX: number, startY: number, startLeft: number, startTop: number } | null>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startLeft: position.x,
            startTop: position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !dragRef.current) return;
            const dx = e.clientX - dragRef.current.startX;
            const dy = e.clientY - dragRef.current.startY;
            setPosition({
                x: dragRef.current.startLeft + dx,
                y: dragRef.current.startTop + dy
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            dragRef.current = null;
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // Search & Dependency Logic
    const filteredResults = useMemo(() => {
        if (!search.trim()) return nodes;

        const lowerSearch = search.toLowerCase();
        
        // 1. Find directly matching nodes
        const directMatches = nodes.filter(n => n.title.toLowerCase().includes(lowerSearch));
        
        // OR return just matches for now? User said "show item that you search for and all depended components"
        return directMatches;
    }, [nodes, search]);

    const getDependencies = (nodeId: string) => {
        const deps_outgoing = edges.filter(e => (typeof e.source === 'object' ? (e.source as any).id : e.source) === nodeId);
        const deps_incoming = edges.filter(e => (typeof e.target === 'object' ? (e.target as any).id : e.target) === nodeId);
        return { outgoing: deps_outgoing, incoming: deps_incoming };
    };

    return (
        <div 
            className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden w-80 max-h-[600px] animate-fade-in dark:bg-slate-800 dark:border-slate-700"
            style={{ left: position.x, top: position.y }}
        >
            {/* Header */}
            <div 
                className="bg-gray-50 p-3 border-b border-gray-100 flex justify-between items-center cursor-move select-none dark:bg-slate-900 dark:border-slate-700"
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center gap-2 text-gray-700 font-bold text-sm dark:text-gray-200">
                    <GripVertical size={16} className="text-gray-400 dark:text-gray-500" />
                    <Box size={16} className="text-indigo-600 dark:text-indigo-400"/>
                    <span>{t('list.comp.title')} ({nodes.length})</span>
                </div>
                <button 
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-slate-700"
                    onMouseDown={(e) => e.stopPropagation()} 
                >
                    <X size={16} />
                </button>
            </div>

            {/* Search */}
            <div className="p-2 border-b border-gray-100 relative dark:border-slate-700">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                <input 
                    type="text" 
                    placeholder={t('list.comp.search')} 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-md pl-8 pr-2 py-1.5 text-xs outline-none focus:border-indigo-500 dark:bg-slate-900 dark:border-slate-600 dark:text-gray-200"
                />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50/30 custom-scrollbar dark:bg-slate-900/30">
                {filteredResults.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs dark:text-gray-500">
                        {t('list.comp.empty')} "{search}"
                    </div>
                ) : (
                    filteredResults.map(node => {
                        const { outgoing, incoming } = getDependencies(node.id);
                        const hasDeps = outgoing.length > 0 || incoming.length > 0;

                        return (
                            <div 
                                key={node.id} 
                                className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden group dark:bg-slate-800 dark:border-slate-700"
                            >
                                {/* Node Item */}
                                <div 
                                    className="p-2 flex items-center justify-between cursor-pointer hover:bg-indigo-50 transition-colors dark:hover:bg-indigo-900/30"
                                    onClick={() => onNodeSelect && onNodeSelect(node)}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full ring-1 ring-black/10 dark:ring-white/20" style={{background: node.color}} />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{node.title}</span>
                                    </div>
                                    {hasDeps && (
                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded flex items-center gap-1 dark:bg-slate-700 dark:text-gray-400">
                                            <Layers size={10} /> {outgoing.length + incoming.length}
                                        </span>
                                    )}
                                </div>

                                {/* Dependencies Preview (Only shown when searching) */}
                                {search && hasDeps && (
                                    <div className="border-t border-gray-100 bg-gray-50/50 p-2 text-xs space-y-1 dark:border-slate-700 dark:bg-slate-900/50">
                                        {outgoing.map(e => {
                                            const targetId = typeof e.target === 'object' ? (e.target as any).id : e.target;
                                            const targetNode = nodes.find(n => n.id === targetId);
                                            return (
                                                <div key={e.id} className="flex items-center gap-1 text-gray-500 pl-2 border-l-2 border-indigo-200 ml-1 dark:text-gray-400 dark:border-indigo-700">
                                                    <ArrowRight size={10} />
                                                    <span>{t('list.comp.to')}: <strong>{targetNode?.title || targetId}</strong></span>
                                                    {e.label && <span className="italic text-[10px] text-gray-400">({e.label})</span>}
                                                </div>
                                            )
                                        })}
                                         {incoming.map(e => {
                                            const sourceId = typeof e.source === 'object' ? (e.source as any).id : e.source;
                                            const sourceNode = nodes.find(n => n.id === sourceId);
                                            return (
                                                <div key={e.id} className="flex items-center gap-1 text-gray-500 pl-2 border-l-2 border-orange-200 ml-1">
                                                    <ArrowRight size={10} className="rotate-180" />
                                                    <span>{t('list.comp.from')}: <strong>{sourceNode?.title || sourceId}</strong></span>
                                                    {e.label && <span className="italic text-[10px] text-gray-400">({e.label})</span>}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
