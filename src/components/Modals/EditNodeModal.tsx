import React, { useState, useEffect, useMemo } from 'react';
import { NodeData, EdgeData } from '../../utils/types';
import { X, Trash2, Plus, Lock, Unlock, Copy, ExternalLink, ArrowRight, Unplug, Edit2 } from 'lucide-react';
import { useGraph } from '../../context/GraphContext';
import { EditEdgeModal } from './EditEdgeModal';

interface EditNodeModalProps {
    node: NodeData;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedNode: NodeData) => void;
    onDelete: (nodeId: string) => void;
}

export const EditNodeModal: React.FC<EditNodeModalProps> = ({ node, isOpen, onClose, onSave, onDelete }) => {
    const { edges, deleteEdge, nodes, addNode, t } = useGraph();
    
    const [title, setTitle] = useState(node.title);
    const [color, setColor] = useState(node.color);
    const [props, setProps] = useState(node.props || []);
    const [locked, setLocked] = useState(node.locked || false);
    const [activeTab, setActiveTab] = useState<'properties' | 'connections'>('properties');
    const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);

    useEffect(() => {
        setTitle(node.title);
        setColor(node.color);
        setProps(node.props || []);
        setLocked(node.locked || false);
    }, [node]);

    const nodeEdges = useMemo(() => {
        return edges.filter(e => 
            (typeof e.source === 'object' ? (e.source as any).id === node.id : e.source === node.id) || 
            (typeof e.target === 'object' ? (e.target as any).id === node.id : e.target === node.id)
        );
    }, [edges, node.id]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({ ...node, title, color, props, locked });
        onClose();
    };

    const handleDelete = () => {
        if(confirm("Delete this component?")) {
            onDelete(node.id);
            onClose();
        }
    };
    
    const handleDuplicate = () => {
        const newNode: NodeData = {
            ...node,
            id: crypto.randomUUID(),
            title: `${node.title} (Copy)`,
            x: node.x + 50,
            y: node.y + 50,
            locked: false // Don't copy lock state
        };
        addNode(newNode);
        onClose();
    };

    const updateProp = (index: number, field: string, value: string) => {
        const newProps = [...props];
        newProps[index] = { ...newProps[index], [field]: value };
        setProps(newProps);
    };

    const removeProp = (index: number) => {
        setProps(props.filter((_, i) => i !== index));
    };

    const addProp = () => {
        setProps([...props, { name: 'new_prop', type: 'string', color: '#374151' }]);
    };

    // Helper to resolve node title from ID
    const getNodeTitle = (id: string | any) => {
        const resolvedId = typeof id === 'object' ? id.id : id;
        const n = nodes.find(x => x.id === resolvedId);
        return n ? n.title : resolvedId;
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center backdrop-blur-sm">
                <div className="bg-white rounded-xl shadow-2xl w-[450px] max-h-[85vh] flex flex-col animate-scale-in">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-gray-700">{t('edit.title')}</h2>
                            {locked && <Lock size={14} className="text-amber-500" />}
                        </div>
                        
                        <div className="flex gap-1">
                            <button 
                                onClick={() => setLocked(!locked)} 
                                title={locked ? "Unlock" : "Lock"}
                                className={`p-1.5 rounded transition ${locked ? 'bg-amber-100 text-amber-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
                            >
                                {locked ? <Unlock size={18} /> : <Lock size={18} />}
                            </button>
                            <button 
                                onClick={handleDuplicate}
                                title="Duplicate Node"
                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                            >
                                <Copy size={18} />
                            </button>
                            <div className="w-px h-6 bg-gray-200 mx-1 self-center"></div>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-red-50 hover:text-red-500 rounded transition">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-100">
                        <button 
                            onClick={() => setActiveTab('properties')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition ${activeTab === 'properties' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            {t('edit.props')}
                        </button>
                        <button 
                            onClick={() => setActiveTab('connections')}
                            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wide transition flex items-center justify-center gap-2 ${activeTab === 'connections' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            {t('edit.conns')} <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded-full text-[10px]">{nodeEdges.length}</span>
                        </button>
                    </div>
                    
                    {/* Content */}
                    <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                        {activeTab === 'properties' ? (
                            <>
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">{t('edit.name')}</label>
                                    <input 
                                        value={title} 
                                        disabled={locked}
                                        onChange={e => setTitle(e.target.value)} 
                                        className={`w-full text-sm p-2 border rounded outline-none transition ${locked ? 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200' : 'border-gray-300 focus:border-indigo-500'}`}
                                    />
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-1">{t('edit.color')}</label>
                                    <div className="flex gap-2">
                                        <input 
                                            type="color" 
                                            value={color} 
                                            disabled={locked}
                                            onChange={e => setColor(e.target.value)} 
                                            className={`h-8 w-16 rounded border ${locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`} 
                                        />
                                        <span className="text-xs text-gray-500 self-center uppercase font-mono">{color}</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold uppercase text-gray-500 block mb-2">{t('edit.fields')} ({props.length})</label>
                                    <div className="space-y-2">
                                        {props.map((p, i) => (
                                            <div key={i} className="flex gap-2 items-center bg-gray-50 p-1.5 rounded border border-gray-100 group">
                                                {/* Color Picker for Prop */}
                                                <input 
                                                    type="color" 
                                                    value={p.color || '#374151'} 
                                                    disabled={locked}
                                                    onChange={e => updateProp(i, 'color', e.target.value)}
                                                    className="w-4 h-6 border-none bg-transparent cursor-pointer rounded overflow-hidden p-0"
                                                    title="Property Color"
                                                />
                                                
                                                <input 
                                                    value={p.name} 
                                                    disabled={locked}
                                                    onChange={e => updateProp(i, 'name', e.target.value)} 
                                                    placeholder="Name"
                                                    className={`flex-1 text-xs p-1.5 border rounded ${locked ? 'bg-gray-100' : 'bg-white'}`} 
                                                />
                                                <input 
                                                    value={p.type} 
                                                    disabled={locked}
                                                    onChange={e => updateProp(i, 'type', e.target.value)} 
                                                    placeholder="Type"
                                                    className={`w-20 text-xs p-1.5 border rounded text-gray-500 font-mono ${locked ? 'bg-gray-100' : 'bg-white'}`} 
                                                />
                                                {!locked && (
                                                    <button onClick={() => removeProp(i)} className="text-gray-300 hover:text-red-500 transition px-1 opacity-0 group-hover:opacity-100">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {!locked && (
                                        <button onClick={addProp} className="mt-2 text-xs text-indigo-600 flex items-center gap-1 font-semibold hover:bg-indigo-50 p-2 rounded transition-colors w-full justify-center border border-dashed border-indigo-200">
                                            <Plus size={14} /> {t('edit.add')}
                                        </button>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="space-y-3">
                                {nodeEdges.length === 0 ? (
                                    <div className="text-center py-8 text-gray-400 text-xs">No active connections</div>
                                ) : (
                                    nodeEdges.map(edge => {
                                        // Resolve actual objects (or IDs if objects not hydrated)
                                        const sId = typeof edge.source === 'object' ? (edge.source as any).id : edge.source;
                                        const tId = typeof edge.target === 'object' ? (edge.target as any).id : edge.target;
                                        const isSource = sId === node.id;
                                        const otherId = isSource ? tId : sId;
                                        const otherTitle = getNodeTitle(otherId);
                                        
                                        return (
                                            <div key={edge.id} className="bg-white border border-gray-200 rounded p-3 text-xs shadow-sm flex flex-col gap-2">
                                                <div className="flex items-center justify-between pb-2 border-b border-gray-50">
                                                    <div className="flex items-center gap-2 font-medium text-gray-700">
                                                        {isSource ? (
                                                            <>
                                                                <span className="text-indigo-600 font-bold">This</span>
                                                                <ArrowRight size={12} className="text-gray-400" />
                                                                <span>{otherTitle}</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span>{otherTitle}</span>
                                                                <ArrowRight size={12} className="text-gray-400" />
                                                                <span className="text-indigo-600 font-bold">This</span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono text-[10px]">{edge.relationType || '1:N'}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between px-1">
                                                    <div className="flex flex-col gap-1 text-gray-500">
                                                        <div className="flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                                                            <span>{edge.sourceProp || '(Body)'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                                            <span>{edge.targetProp || '(Body)'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={(e) => {
                                                                 const otherNodeId = typeof edge.source === 'object' ? (edge.source as any).id : edge.source === node.id ? (typeof edge.target === 'object' ? (edge.target as any).id : edge.target) : (typeof edge.source === 'object' ? (edge.source as any).id : edge.source);
                                                                 const otherNode = nodes.find(n => n.id === otherNodeId);
                                                                 const isEdgeLocked = locked || (otherNode?.locked);
                                                                 
                                                                 if(isEdgeLocked) return;
                                                                 setEditingEdgeId(edge.id);
                                                            }} 
                                                            disabled={locked || nodes.find(n => n.id === (typeof edge.source === 'object' ? (edge.source as any).id : edge.source === node.id ? (typeof edge.target === 'object' ? (edge.target as any).id : edge.target) : (typeof edge.source === 'object' ? (edge.source as any).id : edge.source)))?.locked}
                                                            className={`p-1.5 rounded border border-gray-200 transition ${(locked || nodes.find(n => n.id === (typeof edge.source === 'object' ? (edge.source as any).id : edge.source === node.id ? (typeof edge.target === 'object' ? (edge.target as any).id : edge.target) : (typeof edge.source === 'object' ? (edge.source as any).id : edge.source)))?.locked) ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50'}`}
                                                            title={locked ? "Locked" : "Edit Connection"}
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => {
                                                                const otherNodeId = typeof edge.source === 'object' ? (edge.source as any).id : edge.source === node.id ? (typeof edge.target === 'object' ? (edge.target as any).id : edge.target) : (typeof edge.source === 'object' ? (edge.source as any).id : edge.source);
                                                                const otherNode = nodes.find(n => n.id === otherNodeId);
                                                                const isEdgeLocked = locked || (otherNode?.locked);

                                                                if(!isEdgeLocked && confirm("Disconnect?")) {
                                                                    deleteEdge(edge.id);
                                                                }
                                                            }}
                                                            disabled={locked || nodes.find(n => n.id === (typeof edge.source === 'object' ? (edge.source as any).id : edge.source === node.id ? (typeof edge.target === 'object' ? (edge.target as any).id : edge.target) : (typeof edge.source === 'object' ? (edge.source as any).id : edge.source)))?.locked}
                                                            className={`p-1.5 rounded border border-gray-200 transition ${(locked || nodes.find(n => n.id === (typeof edge.source === 'object' ? (edge.source as any).id : edge.source === node.id ? (typeof edge.target === 'object' ? (edge.target as any).id : edge.target) : (typeof edge.source === 'object' ? (edge.source as any).id : edge.source)))?.locked) ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50'}`}
                                                            title={locked ? "Locked" : "Disconnect"}
                                                        >
                                                            <Unplug size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50 rounded-b-xl">
                        {!locked && (
                            <button onClick={handleDelete} className="px-4 py-2 text-red-600 text-xs font-bold hover:bg-red-50 rounded-lg">{t('edit.delete')}</button>
                        )}
                        <div className="flex-grow"></div>
                        <button onClick={onClose} className="px-4 py-2 text-gray-500 text-xs font-bold hover:text-gray-700">{t('edit.cancel')}</button>
                        <button onClick={handleSave} className="px-6 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                            {t('edit.save')}
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Nested Modal for Edge Editing */}
            {editingEdgeId && (
                <EditEdgeModal 
                    isOpen={!!editingEdgeId} 
                    edgeId={editingEdgeId} 
                    onClose={() => setEditingEdgeId(null)} 
                />
            )}
        </>
    );
};
