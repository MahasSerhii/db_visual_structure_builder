import React, { useState, useRef, useEffect } from 'react';
import { useGraph } from '../../context/GraphContext';
import { useToast } from '../../context/ToastContext';
import { X, GripVertical, Plus, FileJson, Database, Layers, ChevronDown, ChevronUp, Trash2, PenTool } from 'lucide-react';

interface CreateNodeModalProps {
    onClose: () => void;
}

export const CreateNodeModal: React.FC<CreateNodeModalProps> = ({ onClose }) => {
    const { addNode, config, t } = useGraph();
    const { showToast } = useToast();
    
    // Form State
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [color, setColor] = useState(config.defaultColors.componentBg || '#6366F1');
    const [props, setProps] = useState<{name: string, type: string, color: string}[]>([]);
    
    // JSON Import State
    const [jsonInput, setJsonInput] = useState('');
    const [showJsonImport, setShowJsonImport] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

    // Draggable Logic
    const [position, setPosition] = useState({ x: window.innerWidth - 350, y: 100 });
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

    // Initial Color Sync
    useEffect(() => {
        if (!title && !desc && props.length === 0) {
             setColor(config.defaultColors.componentBg || '#6366F1');
        }
    }, [config.defaultColors.componentBg]);

    const extractPropsFromData = (data: any, mode: 'types' | 'values') => {
        const extractedProps: {name: string, type: string, color: string}[] = [];
        let count = 0;
        const entries = Object.entries(data);
        
        for (const [key, value] of entries) {
            if (count >= 50) break;
            
            let type = 'string';
            if (mode === 'types') {
                if (Array.isArray(value)) type = 'array';
                else if (value === null) type = 'null';
                else if (typeof value === 'number') type = 'number';
                else if (typeof value === 'boolean') type = 'boolean';
                else if (typeof value === 'object') type = 'object';
            } else {
                type = String(value);
            }

            extractedProps.push({
                name: key,
                type: type,
                color: '#000000'
            });
            count++;
        }
        return extractedProps;
    };

    const handleCreate = () => {
        if (!title.trim()) {
            showToast("Title is required", "error");
            return;
        }
        addNode({
            id: crypto.randomUUID(),
            title,
            description: desc,
            color,
            x: window.innerWidth / 2 + (Math.random() - 0.5) * 100, // Center-ish
            y: window.innerHeight / 2 + (Math.random() - 0.5) * 100,
            props,
            createdAt: new Date().toISOString()
        } as any);
        
        showToast("Component Created", "success");
        // Reset form or close? Usually keep open for multiple creates if floating, but user might expect close. 
        // Sidebar stays open. Let's start with resetting form.
        setTitle('');
        setDesc('');
        setProps([]);
        setColor(config.defaultColors.componentBg || '#6366F1');
    };

    const addProp = () => {
        setProps([...props, { name: '', type: 'string', color: config.defaultColors.propertyText || '#000000' }]);
    };

    const removeProp = (index: number) => {
        setProps(props.filter((_, i) => i !== index));
    };

    const updateProp = (index: number, field: keyof typeof props[0], value: string) => {
        const newProps = [...props];
        newProps[index] = { ...newProps[index], [field]: value };
        setProps(newProps);
    };

    const handleJsonImport = (mode: 'types' | 'values', dataObj?: any) => {
        let data = dataObj;
        
        if (!data) {
             if (!jsonInput.trim()) return;
             try {
                data = JSON.parse(jsonInput);
             } catch(e) {
                 showToast('JSON Parse Error', 'error');
                 return;
             }
        }

        try {
            if (typeof data !== 'object' || data === null || Array.isArray(data)) {
                showToast('Invalid JSON object', 'error');
                return;
            }

            const newProps = extractPropsFromData(data, mode);
            
            setProps(prev => [...prev, ...newProps]);
            setJsonInput('');
            setShowJsonImport(false);
            showToast(`Imported ${newProps.length} properties via ${mode}`, 'success');
        } catch (e) {
            showToast('Processing Error', 'error');
        }
    };

    const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>, mode: 'types' | 'values') => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const text = ev.target?.result as string;
                    const json = JSON.parse(text);
                    
                    if (typeof json !== 'object' || json === null || Array.isArray(json)) {
                        console.warn(`Skipping ${file.name}: Not an object`);
                        return;
                    }
                    
                    const extractedProps = extractPropsFromData(json, mode);
                    
                    const newNode = {
                        id: crypto.randomUUID(),
                        title: file.name.replace(/\.json$/i, ''),
                        description: `Imported from ${file.name}`,
                        color: '#6366F1',
                        x: 100 + Math.random() * 150,
                        y: 100 + Math.random() * 150,
                        props: extractedProps,
                        createdAt: new Date().toISOString()
                    };
                    
                    addNode(newNode as any);

                } catch (err) {
                    console.error(err);
                    showToast(`Failed to parse ${file.name}`, 'error');
                }
            };
            reader.readAsText(file);
        });
        
        showToast(`Processing ${files.length} files...`, 'info');
        e.target.value = '';
    };

    return (
        <div 
            className="fixed z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden w-80 max-h-[700px] animate-fade-in"
            style={{ left: position.x, top: position.y }}
        >
            {/* Header */}
            <div 
                className="bg-gray-50 dark:bg-slate-900 p-3 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center cursor-move select-none"
                onMouseDown={handleMouseDown}
            >
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-200 font-bold text-sm">
                    <GripVertical size={16} className="text-gray-400" />
                    <PenTool size={16} className="text-indigo-600 dark:text-indigo-400"/>
                    <span>{t('modal.create.title')}</span>
                </div>
                <button 
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700"
                    onMouseDown={(e) => e.stopPropagation()} 
                >
                    <X size={16} />
                </button>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                
                <input 
                    value={title} onChange={e => setTitle(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" 
                    placeholder={t('lbl.title')} 
                    autoFocus
                />
                
                <textarea 
                    value={desc} onChange={e => setDesc(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm h-16 resize-none focus:ring-2 focus:ring-indigo-500 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500" 
                    placeholder={t('lbl.desc')} 
                />
                
                <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-700 p-2 rounded-lg border border-gray-200 dark:border-slate-600">
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">{t('lbl.color')}</label>
                    <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-6 w-10 cursor-pointer border-0 p-0 bg-transparent" />
                </div>

                {/* Properties Section */}
                <div className="border border-gray-200 dark:border-slate-700 p-3 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('lbl.props')}</label>
                        <button 
                            onClick={() => setShowJsonImport(!showJsonImport)} 
                            className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline"
                        >
                            <FileJson size={10} /> {t('lbl.importJson')}
                        </button>
                    </div>

                    {showJsonImport && (
                        <div className="mb-3 p-2 bg-white dark:bg-slate-900 rounded border border-indigo-100 dark:border-indigo-900 shadow-sm animate-fade-in space-y-3">
                            <textarea 
                                value={jsonInput}
                                onChange={(e) => setJsonInput(e.target.value)}
                                className="w-full text-xs font-mono p-2 border border-gray-200 dark:border-slate-700 rounded mb-2 h-20 focus:outline-none focus:border-indigo-400 bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-gray-200"
                                placeholder='{"id": 1, "name": "John"}'
                            />
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleJsonImport('types')}
                                    className="flex-1 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold py-1.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors border border-indigo-200 dark:border-indigo-800"
                                >
                                    {t('lbl.detectTypes')}
                                </button>
                                <button 
                                    onClick={() => handleJsonImport('values')}
                                    className="flex-1 bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-xs font-bold py-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/60 transition-colors border border-green-200 dark:border-green-800"
                                >
                                    {t('lbl.useValues')}
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2 mb-3">
                        {props.map((p, i) => (
                            <div key={i} className="flex gap-1 items-center animate-slide-in">
                                <input 
                                    value={p.name} 
                                    onChange={(e) => updateProp(i, 'name', e.target.value)}
                                    placeholder="Name" 
                                    className="w-1/3 p-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded focus:border-indigo-500 outline-none bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200" 
                                />
                                <input 
                                    value={p.type} 
                                    onChange={(e) => updateProp(i, 'type', e.target.value)}
                                    placeholder="Type" 
                                    className="w-1/3 p-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded focus:border-indigo-500 outline-none bg-white dark:bg-slate-700 text-gray-800 dark:text-gray-200" 
                                />
                                <input 
                                    type="color" 
                                    value={p.color} 
                                    onChange={(e) => updateProp(i, 'color', e.target.value)}
                                    className="w-6 h-7 p-0 border border-gray-300 dark:border-slate-600 rounded cursor-pointer bg-transparent" 
                                />
                                <button onClick={() => removeProp(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button onClick={addProp} className="w-full flex items-center justify-center gap-2 py-1.5 border border-dashed border-gray-300 dark:border-slate-600 text-gray-500 dark:text-gray-400 rounded hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-300 hover:text-indigo-600 text-xs font-medium transition-all">
                        <Plus size={12} /> Add Property
                    </button>
                </div>

                <div className="pt-2">
                    <button 
                        onClick={handleCreate} 
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all text-sm flex justify-center items-center gap-2"
                    >
                        {t('modal.create.btn')}
                    </button>
                </div>
                
                <div className="pt-2 border-t border-gray-200 dark:border-slate-700">
                     <button 
                        onClick={() => setIsBulkImportOpen(!isBulkImportOpen)}
                        className="w-full flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                     >
                        <div className="flex items-center gap-2">
                            <Database size={12} /> {t('lbl.bulkImport')}
                        </div>
                        {isBulkImportOpen ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                     </button>
                     
                     {isBulkImportOpen && (
                         <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 shadow-sm animate-fade-in">
                             <p className="text-[9px] text-slate-400 mb-2 leading-tight">Create multiple components (one per file). Filename = Component Name.</p>
                             <div className="flex gap-2">
                                <label className="flex-1 cursor-pointer bg-white dark:bg-slate-800 border border-dashed border-indigo-300 dark:border-indigo-700 rounded p-2 text-center hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors flex flex-col items-center justify-center gap-1 group">
                                    <FileJson size={16} className="text-indigo-400 group-hover:text-indigo-600" />
                                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block">{t('lbl.detectTypes')}</span>
                                    <input type="file" multiple className="hidden" accept=".json" onChange={(e) => handleBulkImport(e, 'types')} />
                                </label>
                                <label className="flex-1 cursor-pointer bg-white dark:bg-slate-800 border border-dashed border-green-300 dark:border-green-700 rounded p-2 text-center hover:bg-green-50 dark:hover:bg-slate-700 transition-colors flex flex-col items-center justify-center gap-1 group">
                                     <Layers size={16} className="text-green-400 group-hover:text-green-600" />
                                    <span className="text-[10px] text-green-600 dark:text-green-400 font-bold block">{t('lbl.useValues')}</span>
                                    <input type="file" multiple className="hidden" accept=".json" onChange={(e) => handleBulkImport(e, 'values')} />
                                </label>
                             </div>
                         </div>
                     )}
                </div>
            </div>
        </div>
    );
};
