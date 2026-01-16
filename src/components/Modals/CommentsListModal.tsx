import React, { useState, useRef, useEffect } from 'react';
import { useGraph } from '../../context/GraphContext';
import { X, CheckCircle, Circle, MessageSquare, ChevronRight, GripVertical } from 'lucide-react';

interface CommentsListModalProps {
    onClose: () => void;
}

export const CommentsListModal: React.FC<CommentsListModalProps> = ({ onClose }) => {
    const { comments, updateComment, activeCommentId, setActiveCommentId, t } = useGraph();
    const [filter, setFilter] = useState<'unresolved' | 'resolved'>('unresolved');
    const [search, setSearch] = useState('');
    
    // Drag Logic
    const [position, setPosition] = useState({ x: window.innerWidth - 350, y: 80 });
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

    const sortedComments = [...comments].sort((a, b) => b.createdAt - a.createdAt);
    const filteredComments = sortedComments.filter(c => {
         // Filter by Tab
         const matchesTab = filter === 'unresolved' ? !c.isResolved : c.isResolved;
         // Filter by Search
         const matchesSearch = c.content.toLowerCase().includes(search.toLowerCase()) || 
                               c.author.name.toLowerCase().includes(search.toLowerCase());
         return matchesTab && matchesSearch;
    });

    return (
        <div 
            className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden w-80 max-h-[600px] dark:bg-slate-800 dark:border-slate-700"
            style={{ left: position.x, top: position.y }}
        >
            {/* Header */}
            <div 
                className="bg-gray-50 p-3 border-b border-gray-100 flex justify-between items-center cursor-move select-none dark:bg-slate-900 dark:border-slate-700"
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center gap-2 text-gray-700 font-bold text-sm dark:text-gray-200">
                    <GripVertical size={16} className="text-gray-400 dark:text-gray-500" />
                    <MessageSquare size={16} />
                    <span>{t('list.comm.title')} ({comments.filter(c => !c.isResolved).length})</span>
                </div>
                <button 
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-200 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-slate-700"
                    onMouseDown={(e) => e.stopPropagation()} // Prevent drag start
                >
                    <X size={16} />
                </button>
            </div>

            {/* Search */}
            <div className="p-2 border-b border-gray-100 dark:border-slate-700">
                <input 
                    type="text" 
                    placeholder={t('list.comm.search')} 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-md px-2 py-1 text-xs outline-none focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200"
                />
            </div>

            {/* Filters */}
            <div className="flex p-2 gap-2 border-b border-gray-100 dark:border-slate-700">
                <button 
                    className={`flex-1 py-1 px-2 text-xs font-medium rounded-md transition-colors ${filter === 'unresolved' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-700'}`}
                    onClick={() => setFilter('unresolved')}
                >
                    {t('list.comm.unresolved')}
                </button>
                <button 
                    className={`flex-1 py-1 px-2 text-xs font-medium rounded-md transition-colors ${filter === 'resolved' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-700'}`}
                    onClick={() => setFilter('resolved')}
                >
                    {t('list.comm.resolved')}
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50/30 dark:bg-slate-900/30">
                {filteredComments.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                        {t('list.comm.empty')}
                    </div>
                ) : (
                    filteredComments.map(c => (
                        <div 
                            key={c.id} 
                            className={`bg-white p-3 rounded-lg border shadow-sm transition-all hover:border-indigo-200 cursor-pointer group dark:bg-slate-800 dark:border-slate-700 dark:hover:border-indigo-500/30 ${c.isResolved ? 'opacity-60 grayscale' : ''}`}
                            onClick={() => setActiveCommentId(c.id)}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2">
                                    <div 
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                                        style={{ background: c.author.color }}
                                    >
                                        {c.author.name[0]}
                                    </div>
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{c.author.name}</span>
                                    {c.targetType && (
                                        <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded uppercase dark:bg-slate-700 dark:text-gray-400">
                                            {c.targetType}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        updateComment({ ...c, isResolved: !c.isResolved });
                                    }}
                                    className={`p-1 rounded-full transition-colors ${c.isResolved ? 'text-green-500 bg-green-50 dark:bg-green-900/30' : 'text-gray-300 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/30'}`}
                                    title={c.isResolved ? "Mark as unresolved" : "Resolve"}
                                >
                                    {c.isResolved ? <CheckCircle size={14} /> : <Circle size={14} />}
                                </button>
                            </div>
                            
                            <div className={`text-xs text-gray-600 line-clamp-2 dark:text-gray-300 ${c.isResolved ? 'line-through' : ''}`}>
                                {c.content}
                            </div>
                            
                            {c.replies && c.replies.length > 0 && (
                                <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                                    <MessageSquare size={10} />
                                    <span>{c.replies.length} replies</span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
