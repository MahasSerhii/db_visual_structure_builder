import React, { useState, useEffect } from 'react';
import { useGraph } from '../../../context/GraphContext';
import { Info, FolderOpen, User, Link, Database, RefreshCw, ChevronDown, ChevronRight, Activity } from 'lucide-react';


export const ConnectTab: React.FC = () => {
    const { nodes, addEdge, t, savedProjects, config, currentRoomId, setCurrentRoomId, setGraphData, refreshData } = useGraph();
    const [source, setSource] = useState('');
    const [target, setTarget] = useState('');
    const [sourceProp, setSourceProp] = useState('');
    const [targetProp, setTargetProp] = useState('');
    const [label, setLabel] = useState('');
    
    // Accordion State
    const [isProjectsOpen, setIsProjectsOpen] = useState(true);

    const handleOpenProject = (project: any) => {
        // Optimistic switch
        setCurrentRoomId(project.id);
        // Socket in GraphContext deals with connection
    };


    const isConnected = (id: string) => id === currentRoomId;

    const [sourcePropsList, setSourcePropsList] = useState<{name: string}[]>([]);
    const [targetPropsList, setTargetPropsList] = useState<{name: string}[]>([]);

    useEffect(() => {
        const node = nodes.find(n => n.id === source);
        setSourcePropsList(node?.props || []);
        setSourceProp('');
    }, [source, nodes]);

    useEffect(() => {
        const node = nodes.find(n => n.id === target);
        setTargetPropsList(node?.props || []);
        setTargetProp('');
    }, [target, nodes]);

    const handleConnect = () => {
        if (!source || !target || source === target) return;
        addEdge({
            id: 'edge_' + Date.now(),
            source,
            target,
            sourceProp: sourceProp || undefined,
            targetProp: targetProp || undefined,
            label,
            createdAt: new Date().toISOString()
        } as any);
        // Reset
        setLabel('');
        setSource('');
        setTarget('');
    };

    return (
        <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('connect.title')}</h3>
            
            {/* SAVED PROJECTS SECTION */}
            {savedProjects.length > 0 && (
                <div className="border border-indigo-100 dark:border-indigo-900 rounded-xl overflow-hidden mb-4">
                    <button 
                        onClick={() => setIsProjectsOpen(!isProjectsOpen)}
                        className="w-full flex items-center justify-between p-3 bg-indigo-50/50 dark:bg-slate-800 hover:bg-indigo-50 transition-colors"
                    >
                        <div className="flex items-center gap-2">
                             <FolderOpen size={16} className="text-indigo-600 dark:text-indigo-400" />
                             <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{t('connect.shared')}</span>
                             <span className="bg-indigo-200 text-indigo-800 text-[9px] font-bold px-1.5 rounded-full">{savedProjects.length}</span>
                        </div>
                        {isProjectsOpen ? <ChevronDown size={14} className="text-gray-400"/> : <ChevronRight size={14} className="text-gray-400"/>}
                    </button>
                    
                    {isProjectsOpen && (
                        <div className="bg-white dark:bg-slate-900 border-t border-indigo-50 dark:border-slate-800">
                            {savedProjects.map((p) => (
                                <div key={p.id} className={`p-3 border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between group ${isConnected(p.id) ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}>
                                     <div className="min-w-0">
                                        <div className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">{p.name}</div>
                                        <div className="text-[10px] text-gray-400 flex items-center gap-1">
                                            <User size={10}/> {p.author}
                                        </div>
                                     </div>
                                     {isConnected(p.id) ? (
                                         <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                             <Activity size={10} /> Active
                                         </span>
                                     ) : (
                                         <button 
                                            onClick={() => handleOpenProject(p)}
                                            className="text-[10px] font-bold text-indigo-600 border border-indigo-200 px-2 py-1 rounded-md hover:bg-indigo-600 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                         >
                                             Open
                                         </button>
                                     )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="bg-indigo-50 p-2 rounded border border-indigo-100 flex items-start gap-2 dark:bg-indigo-900/30 dark:border-indigo-900">
                <Info size={14} className="text-indigo-600 mt-0.5 dark:text-indigo-400" />
                <p className="text-[10px] text-indigo-700 dark:text-indigo-300">
                    <strong>{t('connect.tip.title')}</strong> {t('connect.tip.desc')}
                </p>
            </div>

            <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1 dark:text-gray-300">{t('connect.lbl.source')}</label>
                <select value={source} onChange={e => setSource(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:border-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200">
                    <option value="">{t('connect.sel.source')}</option>
                    {nodes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
                </select>
            </div>

            <div className={`transition-all duration-300 ${source ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                <label className="text-xs font-semibold text-gray-400 block mb-1 dark:text-gray-500">{t('connect.lbl.sourceProp')}</label>
                <select value={sourceProp} onChange={e => setSourceProp(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg bg-white text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300">
                    <option value="">{t('connect.sel.prop')}</option>
                    {sourcePropsList.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
            </div>

            <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1 dark:text-gray-300">{t('connect.lbl.target')}</label>
                <select value={target} onChange={e => setTarget(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:border-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200">
                    <option value="">{t('connect.sel.target')}</option>
                    {nodes.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
                </select>
            </div>

            <div className={`transition-all duration-300 ${target ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden'}`}>
                <label className="text-xs font-semibold text-gray-400 block mb-1 dark:text-gray-500">{t('connect.lbl.targetProp')}</label>
                <select value={targetProp} onChange={e => setTargetProp(e.target.value)} className="w-full p-2 border border-gray-200 rounded-lg bg-white text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-gray-300">
                    <option value="">{t('connect.sel.prop')}</option>
                    {targetPropsList.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
            </div>

            <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1 dark:text-gray-300">{t('connect.lbl.label')}</label>
                <input value={label} onChange={e => setLabel(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:border-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200" placeholder={t('connect.ph.label')} />
            </div>

            <button disabled={!source || !target} onClick={handleConnect} className="w-full bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl shadow-lg transition-all text-sm dark:disabled:bg-slate-500">
                {t('connect.btn.create')}
            </button>
        </div>
    );
};
