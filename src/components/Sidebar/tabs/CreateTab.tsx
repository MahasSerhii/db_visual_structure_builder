import React, { useState, useEffect } from 'react';
import { useGraph } from '../../../context/GraphContext';
import { useToast } from '../../../context/ToastContext';
import { Trash2, Plus, FileJson, AlertCircle, Database, Layers, ChevronDown, ChevronUp } from 'lucide-react';

export const CreateTab: React.FC = () => {
    const { addNode, config, t } = useGraph();
    const { showToast } = useToast();
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [color, setColor] = useState(config.defaultColors.componentBg || '#6366F1');
    const [props, setProps] = useState<{name: string, type: string, color: string}[]>([]);
    
    // Update local state if config changes (e.g. if user just came from Settings)
    useEffect(() => {
        if (!title && !desc && props.length === 0) {
             // Only auto-update color if form is empty/uncouched, or user might be annoyed
             setColor(config.defaultColors.componentBg || '#6366F1');
        }
    }, [config.defaultColors.componentBg]);
    
    // JSON Import State
    const [jsonInput, setJsonInput] = useState('');
    const [showJsonImport, setShowJsonImport] = useState(false);
    const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);

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
        if (!title.trim()) return;
        addNode({
            id: crypto.randomUUID(),
            title,
            description: desc,
            color,
            x: 100 + Math.random() * 50,
            y: 100 + Math.random() * 50,
            props,
            createdAt: new Date().toISOString()
        } as any);
        // Reset form
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
        <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('modal.create.title')}</h3>
            <input 
                value={title} onChange={e => setTitle(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100" 
                placeholder={t('lbl.title')} 
            />
            <textarea 
                value={desc} onChange={e => setDesc(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2 text-sm h-16 resize-none focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-gray-100" 
                placeholder={t('lbl.desc')}
            />
            <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200 dark:bg-slate-700 dark:border-slate-600">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">{t('lbl.color')}</label>
                <input type="color" value={color} onChange={e => setColor(e.target.value)} className="h-6 w-10 cursor-pointer border-0 p-0" />
            </div>

            {/* Properties Section */}
            <div className="border border-gray-200 p-3 rounded-lg bg-gray-50 dark:bg-slate-800 dark:border-slate-700">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('lbl.props')}</label>
                    <button 
                        onClick={() => setShowJsonImport(!showJsonImport)} 
                        className="text-[10px] text-indigo-600 flex items-center gap-1 hover:underline dark:text-indigo-400"
                    >
                        <FileJson size={10} /> {t('lbl.importJson')}
                    </button>
                </div>

                {showJsonImport && (
                    <div className="mb-3 p-2 bg-white rounded border border-indigo-100 shadow-sm animate-fade-in space-y-3 dark:bg-slate-900 dark:border-indigo-900">
                        <textarea 
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                            className="w-full text-xs font-mono p-2 border border-gray-200 rounded mb-2 h-20 focus:outline-none focus:border-indigo-400 dark:bg-slate-800 dark:border-slate-600 dark:text-gray-200"
                            placeholder='{"id": 1, "name": "John"}'
                        />
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleJsonImport('types')}
                                className="flex-1 bg-indigo-50 text-indigo-700 text-xs font-bold py-1.5 rounded hover:bg-indigo-100 transition-colors border border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-800"
                            >
                                {t('lbl.detectTypes')}
                            </button>
                            <button 
                                onClick={() => handleJsonImport('values')}
                                className="flex-1 bg-green-50 text-green-700 text-xs font-bold py-1.5 rounded hover:bg-green-100 transition-colors border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
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
                                placeholder={t('lbl.name')}
                                className="w-1/3 p-1.5 text-xs border border-gray-300 rounded focus:border-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" 
                            />
                            <input 
                                value={p.type} 
                                onChange={(e) => updateProp(i, 'type', e.target.value)}
                                placeholder={t('lbl.type')}
                                className="w-1/3 p-1.5 text-xs border border-gray-300 rounded focus:border-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" 
                            />
                             <input 
                                type="color" 
                                value={p.color} 
                                onChange={(e) => updateProp(i, 'color', e.target.value)}
                                className="w-6 h-7 p-0 border border-gray-300 rounded cursor-pointer dark:border-slate-600" 
                            />
                            <button onClick={() => removeProp(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    {props.length === 0 && !showJsonImport && (
                        <div className="text-center py-4 text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded dark:border-slate-700 dark:text-gray-500">
                            No properties added
                        </div>
                    )}
                </div>

                <button onClick={addProp} className="w-full flex items-center justify-center gap-2 py-1.5 border border-dashed border-gray-300 text-gray-500 rounded hover:bg-white hover:border-indigo-300 hover:text-indigo-600 text-xs font-medium transition-all dark:border-slate-600 dark:text-gray-400 dark:hover:bg-slate-700">
                    <Plus size={12} /> {t('lbl.addProp')}
                </button>
            </div>

            <button 
                onClick={handleCreate} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-indigo-200 transition-all text-sm flex justify-center items-center gap-2 dark:shadow-none"
            >
                {t('modal.create.btn')}
            </button>
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
                 <button 
                    onClick={() => setIsBulkImportOpen(!isBulkImportOpen)}
                    className="w-full flex justify-between items-center text-[10px] font-bold text-slate-500 mb-2 uppercase hover:text-indigo-600 transition-colors dark:text-slate-400"
                 >
                    <div className="flex items-center gap-2">
                        <Database size={12} /> {t('lbl.bulkImport')}
                    </div>
                    {isBulkImportOpen ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                 </button>
                 
                 {isBulkImportOpen && (
                     <div className="p-3 bg-slate-50 rounded border border-slate-200 shadow-sm animate-fade-in dark:bg-slate-800 dark:border-slate-700">
                         <p className="text-[9px] text-slate-400 mb-2 leading-tight">Create multiple components (one per file). Filename = Component Name.</p>
                         <div className="flex gap-2">
                            <label className="flex-1 cursor-pointer bg-white border border-dashed border-indigo-300 rounded p-2 text-center hover:bg-indigo-50 transition-colors flex flex-col items-center justify-center gap-1 group dark:bg-slate-900 dark:border-indigo-700 dark:hover:bg-slate-800">
                                <FileJson size={16} className="text-indigo-400 group-hover:text-indigo-600" />
                                <span className="text-[10px] text-indigo-600 font-bold block dark:text-indigo-400">{t('lbl.detectTypes')}</span>
                                <input type="file" multiple className="hidden" accept=".json" onChange={(e) => handleBulkImport(e, 'types')} />
                            </label>
                            <label className="flex-1 cursor-pointer bg-white border border-dashed border-green-300 rounded p-2 text-center hover:bg-green-50 transition-colors flex flex-col items-center justify-center gap-1 group dark:bg-slate-900 dark:border-green-700 dark:hover:bg-slate-800">
                                 <Layers size={16} className="text-green-400 group-hover:text-green-600" />
                                <span className="text-[10px] text-green-600 font-bold block dark:text-green-400">{t('lbl.useValues')}</span>
                                <input type="file" multiple className="hidden" accept=".json" onChange={(e) => handleBulkImport(e, 'values')} />
                            </label>
                         </div>
                     </div>
                 )}
            </div>
        </div>
    );
};