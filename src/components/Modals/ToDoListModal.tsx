import React, { useState } from 'react';
import { useGraph } from '../../context/GraphContext';
import { X, Plus, Trash2, CheckSquare, Square, Check, ChevronRight, ChevronDown } from 'lucide-react';

interface SubTask {
    id: string;
    text: string;
    completed: boolean;
}

interface Category {
    id: string;
    title: string;
    completed: boolean;
    expanded: boolean;
    subTasks: SubTask[];
}

interface ToDoListModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DEFAULT_GOALS: Category[] = [
    {
        id: 'phase-1',
        title: '🚀 Phase 1: The "Visual Engine" (Core)',
        completed: false,
        expanded: true,
        subTasks: [
            { id: 'p1-1', text: 'Canvas Rendering: A zoomable, draggable workspace for tables.', completed: false },
            { id: 'p1-2', text: 'Hybrid View: Split-screen mode (Text Editor on left, Diagram on right).', completed: false },
            { id: 'p1-3', text: 'Relation Logic: Automatic line drawing (foreign key connections) between tables.', completed: false },
            { id: 'p1-4', text: 'The "ID Standardizer": A setting to automatically format primary keys.', completed: false },
        ]
    },
    {
        id: 'phase-2',
        title: '🧠 Phase 2: Intelligence (The Differentiators)',
        completed: false,
        expanded: false,
        subTasks: [
            { id: 'p2-1', text: 'SQL/DBML Importer: Allow users to paste code to generate a diagram for free.', completed: false },
            { id: 'p2-2', text: 'AI "Architect" Assistant: A prompt box to generate table suggestions based on user descriptions.', completed: false },
            { id: 'p2-3', text: 'Naming Convention Linter: A tool that flags columns not following project rules.', completed: false },
        ]
    },
    {
        id: 'phase-3',
        title: '🌍 Phase 3: Export & DevOps',
        completed: false,
        expanded: false,
        subTasks: [
            { id: 'p3-1', text: 'One-Click SQL Export: Support for PostgreSQL, MySQL, and SQL Server.', completed: false },
            { id: 'p3-2', text: 'Migration Generator: Create "Alter Table" scripts when a user moves a column in the UI.', completed: false },
            { id: 'p3-3', text: 'SVG/PNG Export: High-resolution image downloads for documentation.', completed: false },
        ]
    },
    {
        id: 'phase-4',
        title: '🤝 Phase 4: Collaboration',
        completed: false,
        expanded: false,
        subTasks: [
            { id: 'p4-1', text: 'Real-time Sync: Allow multiple users to move tables simultaneously.', completed: false },
            { id: 'p4-2', text: 'Public/Private Toggle: Allow free users to have at least 3 private projects.', completed: false },
        ]
    }
];

export const ToDoListModal: React.FC<ToDoListModalProps> = ({ isOpen, onClose }) => {
    const { t } = useGraph();
    const [categories, setCategories] = useState<Category[]>(() => {
        const saved = localStorage.getItem('todo_list');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Check if it's the old flat format (Validation: Array of objects without subTasks)
                if (Array.isArray(parsed) && parsed.length > 0 && !parsed[0].subTasks) {
                        // Migrate V1 -> V2
                    const legacyCategory: Category = {
                        id: 'legacy-' + Date.now(),
                        title: t('todo.legacy'),
                        completed: false,
                        expanded: true,
                        subTasks: parsed.map((task: { id: string; text: string; completed: boolean }) => ({
                            id: task.id,
                            text: task.text,
                            completed: task.completed
                        }))
                    };
                    // Initialize with defaults AND legacy items
                    // We check uniqueness of defaults by ID logic if needed, but here we just prepend defaults.
                    return [...DEFAULT_GOALS, legacyCategory];
                } else if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed as Category[];
                } else {
                    return DEFAULT_GOALS;
                }
            } catch (e) {
                console.error("Failed to parse todo list", e);
                return DEFAULT_GOALS;
            }
        }
        return DEFAULT_GOALS;
    });

    const [newCategoryTitle, setNewCategoryTitle] = useState('');
    const [subTaskInputs, setSubTaskInputs] = useState<Record<string, string>>({});


    const saveCategories = (newCats: Category[]) => {
        setCategories(newCats);
        localStorage.setItem('todo_list', JSON.stringify(newCats));
    };

    const toggleCategory = (catId: string) => {
        const newCats = categories.map(cat => {
            if (cat.id === catId) {
                const newCompleted = !cat.completed;
                return {
                    ...cat,
                    completed: newCompleted,
                    subTasks: cat.subTasks.map(sub => ({ ...sub, completed: newCompleted }))
                };
            }
            return cat;
        });
        saveCategories(newCats);
    };

    const toggleSubTask = (catId: string, subId: string) => {
        const newCats = categories.map(cat => {
            if (cat.id === catId) {
                const newSubTasks = cat.subTasks.map(sub => 
                    sub.id === subId ? { ...sub, completed: !sub.completed } : sub
                );
                // Check if all subtasks are completed
                const allCompleted = newSubTasks.length > 0 && newSubTasks.every(s => s.completed);
                return {
                    ...cat,
                    subTasks: newSubTasks,
                    completed: allCompleted
                };
            }
            return cat;
        });
        saveCategories(newCats);
    };

    const toggleExpand = (catId: string) => {
         const newCats = categories.map(cat => 
             cat.id === catId ? { ...cat, expanded: !cat.expanded } : cat
         );
         saveCategories(newCats); 
    };

    const handleAddCategory = () => {
        if (!newCategoryTitle.trim()) return;
        const newCat: Category = {
            id: 'cat-' + Date.now(),
            title: newCategoryTitle.trim(),
            completed: false,
            expanded: true,
            subTasks: []
        };
        saveCategories([...categories, newCat]);
        setNewCategoryTitle('');
    };

    const handleAddSubTask = (catId: string) => {
        const text = subTaskInputs[catId];
        if (!text?.trim()) return;
        
        const newCats = categories.map(cat => {
            if (cat.id === catId) {
                 const newSub: SubTask = {
                     id: 'sub-' + Date.now(),
                     text: text.trim(),
                     completed: false,
                 };
                 // If adding a new unchecked task, the category becomes incomplete
                 return {
                     ...cat,
                     completed: false,
                     subTasks: [...cat.subTasks, newSub]
                 };
            }
            return cat;
        });
        saveCategories(newCats);
        setSubTaskInputs({ ...subTaskInputs, [catId]: '' });
    };

    const deleteCategory = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if(confirm(t('todo.confirmDelete'))) {
            saveCategories(categories.filter(c => c.id !== id));
        }
    };

    const deleteSubTask = (catId: string, subId: string) => {
        const newCats = categories.map(cat => {
            if (cat.id === catId) {
                const newSubTasks = cat.subTasks.filter(s => s.id !== subId);
                const allCompleted = newSubTasks.length > 0 && newSubTasks.every(s => s.completed);
                return { ...cat, subTasks: newSubTasks, completed: newSubTasks.length === 0 ? false : allCompleted };
            }
            return cat;
        });
        saveCategories(newCats);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] border border-gray-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
                
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <CheckSquare size={20} />
                        <h2 className="font-bold text-lg">{t('todo.title')}</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-400 transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                    {categories.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                            <p className="text-sm">{t('todo.empty')}</p>
                            <p className="text-xs mt-1">{t('todo.emptyDesc')}</p>
                        </div>
                    ) : (
                        categories.map(cat => (
                            <div key={cat.id} className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800/50 transition-all">
                                {/* Category Header */}
                                <div 
                                    className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition ${cat.completed ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}
                                    onClick={() => toggleExpand(cat.id)}
                                >
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); toggleCategory(cat.id); }}
                                        className={`shrink-0 transition-colors ${cat.completed ? 'text-green-500' : 'text-gray-300 dark:text-gray-600 hover:text-indigo-500'}`}
                                    >
                                        {cat.completed ? <CheckSquare size={22} className="fill-green-50 text-green-600 dark:fill-green-900/20 dark:text-green-500" /> : <Square size={22} />}
                                    </button>
                                    
                                    <span className={`font-bold text-sm flex-grow select-none ${cat.completed ? 'text-gray-500 line-through dark:text-gray-500' : 'text-gray-800 dark:text-gray-200'}`}>
                                        {cat.title}
                                    </span>

                                    <div className="flex items-center gap-1">
                                         <button 
                                            onClick={(e) => deleteCategory(cat.id, e)}
                                            className="p-1.5 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        {cat.expanded ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
                                    </div>
                                </div>

                                {/* Subtasks */}
                                {cat.expanded && (
                                    <div className="bg-gray-50/50 dark:bg-black/20 border-t border-gray-100 dark:border-slate-700 p-2 pl-4">
                                        <ul className="space-y-1 mb-2">
                                            {cat.subTasks.map(sub => (
                                                <li key={sub.id} className="flex items-start gap-3 p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700/50 group transition">
                                                    <button 
                                                        onClick={() => toggleSubTask(cat.id, sub.id)}
                                                        className={`mt-0.5 shrink-0 transition-colors ${sub.completed ? 'text-green-500' : 'text-gray-300 dark:text-gray-600 hover:text-indigo-500'}`}
                                                    >
                                                        {sub.completed ? <Check size={16} strokeWidth={3} /> : <Square size={16} />}
                                                    </button>
                                                    <span className={`text-xs flex-grow pt-0.5 leading-relaxed ${sub.completed ? 'text-gray-400 line-through dark:text-gray-600' : 'text-gray-600 dark:text-gray-300'}`}>
                                                        {sub.text}
                                                    </span>
                                                    <button 
                                                        onClick={() => deleteSubTask(cat.id, sub.id)}
                                                        className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-0.5"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                        
                                        {/* Add Subtask Input */}
                                        <div className="flex gap-2 pl-8 pr-2 mt-2 opacity-60 hover:opacity-100 transition-opacity focus-within:opacity-100">
                                            <input
                                                type="text"
                                                value={subTaskInputs[cat.id] || ''}
                                                onChange={(e) => setSubTaskInputs({ ...subTaskInputs, [cat.id]: e.target.value })}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAddSubTask(cat.id)}
                                                placeholder={t('todo.addSub')}
                                                className="flex-grow w-full bg-transparent border-b border-gray-200 dark:border-slate-600 text-xs py-1 px-1 outline-none focus:border-indigo-400 dark:text-gray-300 placeholder:text-gray-400"
                                            />
                                            <button 
                                                onClick={() => handleAddSubTask(cat.id)}
                                                disabled={!subTaskInputs[cat.id]?.trim()}
                                                className="text-indigo-500 hover:text-indigo-700 disabled:opacity-30"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer: Add Category */}
                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-700">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newCategoryTitle}
                            onChange={(e) => setNewCategoryTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                            placeholder={t('todo.addMain')}
                            className="flex-grow px-3 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                        />
                        <button
                            onClick={handleAddCategory}
                            disabled={!newCategoryTitle.trim()}
                            className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                        >
                            <Plus size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
