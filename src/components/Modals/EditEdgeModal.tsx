import React, { useState, useMemo } from 'react';
import { useGraph } from '../../context/GraphContext';
import { useToast } from '../../context/ToastContext';
import { X, Trash2, ArrowRight } from 'lucide-react';
import { EdgeData, NodeProperty } from '../../utils/types';
import { Button } from '../Common/Button';

interface EditEdgeModalProps {
    isOpen: boolean;
    onClose: () => void;
    edgeId: string | null;
}

export const EditEdgeModal: React.FC<EditEdgeModalProps> = ({ isOpen, onClose, edgeId }) => {
    const { edges, nodes, updateEdge, deleteEdge, t } = useGraph();
    const { showToast } = useToast();
    
    const initialEdge = edges.find(e => e.id === edgeId);

    const [selectedEdge] = useState<EdgeData | null>(initialEdge || null);
    const [label, setLabel] = useState(initialEdge?.label || '');
    const [color, setColor] = useState(initialEdge?.strokeColor || initialEdge?.color || '#9CA3AF');
    const [strokeWidth, setStrokeWidth] = useState(initialEdge?.strokeWidth || 2);
    const [strokeType, setStrokeType] = useState<'solid'|'dashed'|'dotted'>(initialEdge?.strokeType || 'solid');
    const [relationType, setRelationType] = useState<'1:1'|'1:n'>(initialEdge?.relationType || '1:n');
    const [sourceProp, setSourceProp] = useState(initialEdge?.sourceProp || '');
    const [targetProp, setTargetProp] = useState(initialEdge?.targetProp || '');

    const getEdgeId = (nodeId: unknown): string | undefined => {
        if (typeof nodeId === 'object' && nodeId !== null && 'id' in (nodeId as Record<string, unknown>)) {
            return (nodeId as { id: string }).id;
        }
        return nodeId as string | undefined;
    };
    const sourceNode = useMemo(() => nodes.find(n => n.id === getEdgeId(initialEdge?.source)) || null, [nodes, initialEdge]);
    const targetNode = useMemo(() => nodes.find(n => n.id === getEdgeId(initialEdge?.target)) || null, [nodes, initialEdge]);
    
    // Auto-update target property on relation change based on user request ("if user chose one to many second prop should automatically changed to none")
    const handleRelationChange = (newType: '1:1' | '1:n') => {
        setRelationType(newType);
        if (newType === '1:n' && targetProp) {
            // Optional: User requested "changed to none". Assuming clearing it.
            // Commenting out for now unless strictly enforced, as 1:N often HAS a target prop (FK).
            // But user said: "if user chose one to many second prop should automatically changed to none or something"
            // I will clear it to satisfy the user request explicitly.
            setTargetProp(''); 
        }
    };

    if (!isOpen || !selectedEdge) return null;

    const handleSave = async () => {
        if (!selectedEdge) return;
        
        await updateEdge({
            ...selectedEdge,
            label,
            strokeColor: color, // Use strokeColor consistently
            color: color,  // Keep for legacy if needed
            strokeWidth,
            strokeType,
            relationType,
            sourceProp,
            targetProp
        });
        showToast(t('edit.edge.toast.updated'), 'success');
        onClose();
    };

    const handleDelete = async () => {
        if (window.confirm(t('edit.edge.delete'))) {
            await deleteEdge(selectedEdge.id);
            showToast(t('edit.edge.toast.deleted'), 'info');
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-scale-in border border-gray-200">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        {t('edit.edge.title')}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-200 rounded">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Node Info - Detailed Header */}
                    <div className="flex items-center justify-between py-3 px-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
                         <div className="flex flex-col items-start w-[40%]">
                             <div className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">{t('edit.edge.source')}</div>
                             <div className="font-bold text-gray-800 truncate w-full text-sm" title={sourceNode?.title}>
                                 {sourceNode?.title}
                             </div>
                             <div className="text-[10px] text-indigo-600 font-mono mt-0.5 truncate w-full">
                                {sourceProp || t('edit.edge.body')}
                             </div>
                         </div>
                         
                         <div className="flex flex-col items-center justify-center w-[20%] text-indigo-300">
                             <ArrowRight size={20} />
                         </div>

                         <div className="flex flex-col items-end w-[40%] text-right">
                             <div className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">{t('edit.edge.target')}</div>
                             <div className="font-bold text-gray-800 truncate w-full text-sm" title={targetNode?.title}>
                                 {targetNode?.title}
                             </div>
                             <div className="text-[10px] text-indigo-600 font-mono mt-0.5 truncate w-full">
                                {targetProp || t('edit.edge.body')}
                             </div>
                         </div>
                    </div>

                    {/* Properties Rewiring */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 opacity-75">{t('edit.edge.sourceLink')}</label>
                            <select 
                                value={sourceProp} 
                                onChange={(e) => setSourceProp(e.target.value)}
                                className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none transition"
                            >
                                <option value="">{t('edit.edge.nodeBody')}</option>
                                {sourceNode?.props?.map((p: NodeProperty) => (
                                    <option key={p.name} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 opacity-75">{t('edit.edge.targetLink')}</label>
                            <select 
                                value={targetProp} 
                                onChange={(e) => setTargetProp(e.target.value)}
                                className="w-full p-2.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none transition"
                            >
                                <option value="">{t('edit.edge.nodeBody')}</option>
                                {targetNode?.props?.map((p: NodeProperty) => (
                                    <option key={p.name} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Dependency Type */}
                    <div>
                         <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 opacity-75">{t('edit.edge.relType')}</label>
                         <div className="flex items-center gap-3">
                            <label className={`flex-1 p-2.5 border rounded-lg cursor-pointer text-center text-xs transition font-medium ${relationType === '1:1' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                                <input 
                                    type="radio" 
                                    name="relType" 
                                    className="hidden"
                                    checked={relationType === '1:1'} 
                                    onChange={() => handleRelationChange('1:1')} 
                                />
                                One to One (1:1)
                            </label>
                            <label className={`flex-1 p-2.5 border rounded-lg cursor-pointer text-center text-xs transition font-medium ${relationType === '1:n' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}>
                                <input 
                                    type="radio" 
                                    name="relType" 
                                    className="hidden"
                                    checked={relationType === '1:n'} 
                                    onChange={() => handleRelationChange('1:n')} 
                                />
                                One to Many (1:N)
                            </label>
                         </div>
                    </div>

                    {/* Label */}
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 opacity-75">{t('edit.edge.label')}</label>
                        <input 
                            value={label} 
                            onChange={(e) => setLabel(e.target.value)}
                            placeholder={t('edit.edge.ph.label')}
                            className="w-full p-2.5 text-xs border border-gray-200 rounded-lg focus:border-indigo-500 outline-none transition"
                        />
                    </div>

                    {/* Styling */}
                    <div className="grid grid-cols-3 gap-3">
                         <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 opacity-75">{t('edit.edge.color')}</label>
                            <div className="flex gap-2 items-center">
                                <input 
                                    type="color" 
                                    value={color} 
                                    onChange={(e) => setColor(e.target.value)}
                                    className="w-8 h-8 rounded border cursor-pointer p-0.5 bg-white"
                                />
                                <span className="text-[10px] font-mono text-gray-400">{color}</span>
                            </div>
                         </div>
                         <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 opacity-75">{t('edit.edge.width')}</label>
                            <input 
                                type="number" 
                                min="1" max="10"
                                value={strokeWidth}
                                onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
                                className="w-full p-2.5 text-xs border border-gray-200 rounded-lg focus:border-indigo-500 outline-none"
                            />
                         </div>
                         <div>
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5 opacity-75">{t('edit.edge.style')}</label>
                            <select 
                                value={strokeType}
                                onChange={(e) => setStrokeType(e.target.value as 'solid' | 'dashed' | 'dotted')}
                                className="w-full p-2.5 text-xs text-center border border-gray-200 rounded-lg focus:border-indigo-500 outline-none bg-white"
                            >
                                <option value="solid">{t('edit.edge.style.solid')}</option>
                                <option value="dashed">{t('edit.edge.style.dashed')}</option>
                                <option value="dotted">{t('edit.edge.style.dotted')}</option>
                            </select>
                         </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                    <Button 
                        variant="danger" 
                        size="sm" 
                        onClick={handleDelete}
                        icon={<Trash2 size={14} />}
                    >
                        {t('edit.delete')}
                    </Button>
                    <div className="flex gap-2">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={onClose}
                        >
                            {t('edit.cancel')}
                        </Button>
                        <Button 
                            variant="primary" 
                            size="sm" 
                            onClick={handleSave}
                        >
                            {t('edit.save')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
