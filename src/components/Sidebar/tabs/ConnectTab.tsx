import React, { useState, useEffect } from 'react';
import { useGraph } from '../../../context/GraphContext';
import { Info } from 'lucide-react';

export const ConnectTab: React.FC = () => {
    const { nodes, addEdge, t } = useGraph();
    const [source, setSource] = useState('');
    const [target, setTarget] = useState('');
    const [sourceProp, setSourceProp] = useState('');
    const [targetProp, setTargetProp] = useState('');
    const [label, setLabel] = useState('');

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
