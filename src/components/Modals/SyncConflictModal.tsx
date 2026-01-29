import React, { useState, useMemo  } from 'react';
import { NodeData, EdgeData, AppSettings, Comment } from '../../utils/types';
import { ChevronRight, ArrowLeftRight, Trash2, Edit2, ChevronDown, Check, ArrowRight, ArrowLeft } from 'lucide-react';

interface SyncConflictModalProps {
    isOpen: boolean;
    onClose: () => void;
    localData: { nodes: NodeData[], edges: EdgeData[], comments: Comment[], config?: AppSettings };
    remoteData: { nodes: NodeData[], edges: EdgeData[], comments: Comment[], config?: AppSettings };
    onResolve: (action: 'push_local' | 'pull_remote' | 'merge', mergedData?: { nodes: NodeData[], edges: EdgeData[], comments: Comment[] }) => void;
}

const normalizeNode = (n: NodeData) => {
    return {
        id: n.id,
        x: Math.round(n.x), // Round to ignore sub-pixel diffs
        y: Math.round(n.y),
        title: n.title || undefined,
        description: n.description || undefined,
        color: n.color || undefined,
        props: n.props || []
    };
};

export const SyncConflictModal: React.FC<SyncConflictModalProps> = ({ 
    isOpen, localData, remoteData, onResolve
}) => {
    
    // Diff Calculation
    const { allIds, nodeStatus, conflictIds } = useMemo(() => {
        if (!isOpen) return { allIds: [], nodeStatus: new Map(), conflictIds: [] };

        console.log("SyncConflictModal Calculation:", { 
            localCount: localData.nodes.length, 
            remoteCount: remoteData.nodes.length,
            localIds: localData.nodes.map(n => n.id),
            remoteIds: remoteData.nodes.map(n => n.id)
        });

        const localMap = new Map(localData.nodes.map(n => [n.id, n]));
        const remoteMap = new Map(remoteData.nodes.map(n => [n.id, n]));
        
        const all = Array.from(new Set([...localData.nodes.map(n=>n.id), ...remoteData.nodes.map(n=>n.id)]));
        const status = new Map<string, 'local_only' | 'remote_only' | 'conflict' | 'identical'>();
        const conflicts: string[] = [];

        all.forEach(id => {
            const l = localMap.get(id);
            const r = remoteMap.get(id);

            if (l && !r) status.set(id, 'local_only');
            else if (!l && r) {
                status.set(id, 'remote_only');
                console.log(`Node ${id} is REMOTE_ONLY (Missing Locally)`);
            }
            else if (l && r) {
                 const lNorm = normalizeNode(l);
                 const rNorm = normalizeNode(r);
                 
                 const isDiff = JSON.stringify(lNorm) !== JSON.stringify(rNorm);
                 if (isDiff) {
                     status.set(id, 'conflict');
                     conflicts.push(id);
                 } else {
                     status.set(id, 'identical');
                 }
            }
        });

        return { allIds: all, nodeStatus: status, conflictIds: conflicts };
    }, [localData, remoteData, isOpen]);

    // State to track merged decisions
    // Map<NodeId, NodeData | null> -> null means deleted/excluded
    const [mergedNodes, setMergedNodes] = useState<Map<string, NodeData | null>>(() => {
         const initialMap = new Map<string, NodeData | null>();
         // logic duplicated need to be wary if allIds not available but it is
         // Wait, useMemo runs on render. Hook init runs once. 
         // If we rely on allIds being populated by useMemo in the same pass, it works because we lifted useMemo.
         // Effectively this runs logic once.
         
         // However, creating 'allIds' logic again might be safer if useMemo returns undefined on first pass (it doesn't).
         // Actually, let's just use the logic directly or reuse the collection if possible.
         // Since we can't easily reuse the exact 'allIds' array from the const declaration inside the useState initializer if they are in the same scope block?
         // Yes we can, 'allIds' is in scope.
         
         if (!allIds) return initialMap; // Safety
         allIds.forEach(id => {
            const l = localData.nodes.find(n => n.id === id);
            if (l) initialMap.set(id, l);
            else {
                const r = remoteData.nodes.find(n => n.id === id);
                if (r) initialMap.set(id, r); 
            }
        });
        return initialMap;
    });

    const [openAccordions, setOpenAccordions] = useState<Set<string>>(() => new Set(conflictIds));

    const toggleAccordion = (id: string) => {
        const newSet = new Set(openAccordions);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setOpenAccordions(newSet);
    };

    const resolveNode = (id: string, version: 'local' | 'remote' | null) => {
        const newMap = new Map(mergedNodes);
        if (version === 'local') {
             const n = localData.nodes.find(x => x.id === id);
             newMap.set(id, n || null);
        } else if (version === 'remote') {
             const n = remoteData.nodes.find(x => x.id === id);
             newMap.set(id, n || null);
        } else {
            newMap.set(id, null); // Delete
        }
        setMergedNodes(newMap);
    };

    const updateMergedProp = <K extends keyof NodeData>(id: string, prop: K, value: NodeData[K]) => {
        const current = mergedNodes.get(id);
        if (!current) return;
        
        const updated = { ...current, [prop]: value };
        const newMap = new Map(mergedNodes);
        newMap.set(id, updated);
        setMergedNodes(newMap);
    };

    const handleMergeSubmit = () => {
        // Construct final data
        const finalNodes = Array.from(mergedNodes.values()).filter(n => n !== null) as NodeData[];
        // For Edges and Comments, we reuse the Simple Strategy for now or just take Local? 
        // User asked specifically for Node Conflict UI.
        // Let's assume edges need to be filtered to validity.
        
        // Naive Edge merge: Union or Local? Let's keep 'All Local Edges' for now as Edges depend on nodes.
        // Actually, if we accepted Remote nodes, we might need Remote edges.
        // Let's include ALL edges that connect valid nodes.
        
        const validNodeIds = new Set(finalNodes.map(n => n.id));
        const allEdges = [...localData.edges, ...remoteData.edges];
        // Deduplicate edges by ID
        const uniqueEdges = Array.from(new Map(allEdges.map(e => [e.id, e])).values());
        
        const finalEdges = uniqueEdges.filter(e => {
             const s = typeof e.source === 'object' ? (e.source as {id: string}).id : e.source;
             const t = typeof e.target === 'object' ? (e.target as {id: string}).id : e.target;
             return validNodeIds.has(s) && validNodeIds.has(t);
        });

        // Comments: Union
        const allComments = [...localData.comments, ...remoteData.comments];
        const finalComments = Array.from(new Map(allComments.map(c => [c.id, c])).values());

        onResolve('merge', { nodes: finalNodes, edges: finalEdges, comments: finalComments });
    };

    if (!isOpen) return null;

    // Filter to only show relevant items (conflicts + diffs)
    const itemsToShow = allIds.filter(id => nodeStatus.get(id) !== 'identical');
    console.log("Items to Show:", itemsToShow, "Statuses:", itemsToShow.map(id => nodeStatus.get(id)));

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
            <div className="bg-white dark:bg-slate-800 w-full max-w-5xl rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col h-[90vh]">
                
                {/* Header */}
                <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <ArrowLeftRight className="text-amber-500" />
                            Resolve Sync Conflicts
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Review differences between your Local Workspace and Live Room. Merge carefully.
                        </p>
                    </div>
                    <div className="flex gap-3">
                         <button onClick={() => onResolve('push_local', undefined)} className="text-xs font-bold text-gray-400 hover:text-indigo-600 px-3 py-2 border border-transparent hover:border-indigo-100 rounded transition">
                             Force Push Local
                         </button>
                         <button onClick={() => onResolve('pull_remote', undefined)} className="text-xs font-bold text-gray-400 hover:text-indigo-600 px-3 py-2 border border-transparent hover:border-indigo-100 rounded transition">
                             Discard Local
                         </button>
                         <button 
                            onClick={handleMergeSubmit}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition transform hover:scale-105"
                        >
                            <Check size={18} /> Finish Merge
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto bg-gray-100/50 dark:bg-slate-900/50 p-6 space-y-4">
                    {itemsToShow.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <Check size={48} className="mx-auto text-green-500 mb-4"/>
                            <p>No conflicts found! You can merge safely.</p>
                        </div>
                    ) : (
                        itemsToShow.map(id => {
                            const status = nodeStatus.get(id);
                            const localNode = localData.nodes.find(n => n.id === id);
                            const remoteNode = remoteData.nodes.find(n => n.id === id);
                            const mergedNode = mergedNodes.get(id);
                            const isOpen = openAccordions.has(id);

                            return (
                                <div key={id} className={`bg-white dark:bg-slate-800 rounded-lg border shadow-sm transition-all duration-200 ${isOpen ? 'ring-2 ring-indigo-500/20 border-indigo-200 dark:border-indigo-800' : 'border-gray-200 dark:border-slate-700'}`}>
                                    <button 
                                        onClick={() => toggleAccordion(id)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            {isOpen ? <ChevronDown size={18} className="text-gray-400"/> : <ChevronRight size={18} className="text-gray-400"/>}
                                            
                                            <div className="text-left">
                                                <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                                    {localNode?.title || remoteNode?.title || id}
                                                    {status === 'conflict' && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-100 text-amber-700 tracking-wide">Conflict</span>}
                                                    {status === 'local_only' && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-green-100 text-green-700 tracking-wide">New Local</span>}
                                                    {status === 'remote_only' && <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-blue-100 text-blue-700 tracking-wide">Server Only</span>}
                                                </h3>
                                                <div className="text-xs text-gray-400 font-mono mt-0.5">{id}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {/* Resolution Badge */}
                                             {!mergedNode && <span className="text-xs font-bold text-red-500 flex items-center gap-1"><Trash2 size={12}/> Will Delete</span>}
                                             {mergedNode && <span className="text-xs font-bold text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                 {JSON.stringify(mergedNode) === JSON.stringify(localNode) ? 'Keeping Local' : (JSON.stringify(mergedNode) === JSON.stringify(remoteNode) ? 'Restoring Remote' : 'Merged')}
                                             </span>}
                                        </div>
                                    </button>

                                    {isOpen && (
                                        <div className="border-t border-gray-100 dark:border-slate-700 p-0 overflow-hidden">
                                             <div className="grid grid-cols-[1fr,auto,1fr] divide-x divide-gray-100 dark:divide-slate-700">
                                                 
                                                 {/* Local Column */}
                                                 <div className="p-4 bg-gray-50/50 dark:bg-slate-800/50">
                                                     <div className="flex justify-between items-center mb-4">
                                                         <h4 className="text-xs font-bold uppercase text-gray-500">Local Version</h4>
                                                         {localNode && (
                                                            <button 
                                                                onClick={() => resolveNode(id, 'local')}
                                                                className="text-xs bg-white border border-gray-200 hover:border-indigo-300 px-2 py-1 rounded shadow-sm text-gray-600 hover:text-indigo-600 flex items-center gap-1"
                                                            >
                                                                Use All <ArrowRight size={12}/>
                                                            </button>
                                                         )}
                                                     </div>
                                                     {localNode ? (
                                                         <NodePropsView node={localNode} />
                                                     ) : (
                                                         <div className="text-center py-8 text-gray-400 italic text-sm border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center gap-3">
                                                             <span>Deleted Locally (or New on Server)</span>
                                                             
                                                             <div className="flex flex-col gap-2 w-full px-4">
                                                                <button 
                                                                    onClick={() => resolveNode(id, 'remote')}
                                                                    className="flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md text-xs font-bold hover:bg-blue-100 transition w-full"
                                                                >
                                                                    <ArrowLeft size={14}/> Restore from Remote
                                                                </button>
                                                                <button 
                                                                    onClick={() => resolveNode(id, null)}
                                                                    className="flex items-center justify-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-md text-xs font-bold hover:bg-red-100 transition w-full"
                                                                >
                                                                    <Trash2 size={14}/> Confirm Deletion
                                                                </button>
                                                             </div>
                                                         </div>
                                                     )}
                                                 </div>

                                                 {/* Merge Controls Column */}
                                                 <div className="p-2 flex flex-col justify-center gap-2 bg-white dark:bg-slate-800 z-10 w-16">
                                                     {/* Property Mergers can go here, or simple global toggles */}
                                                 </div>

                                                 {/* Remote Column */}
                                                 <div className="p-4 bg-blue-50/30 dark:bg-blue-900/10">
                                                      <div className="flex justify-between items-center mb-4">
                                                         <h4 className="text-xs font-bold uppercase text-blue-500">Live Version</h4>
                                                         {remoteNode && (
                                                             <button 
                                                                onClick={() => resolveNode(id, 'remote')}
                                                                className="text-xs bg-white border border-blue-200 hover:border-blue-400 px-2 py-1 rounded shadow-sm text-blue-600 flex items-center gap-1"
                                                            >
                                                                <ArrowLeft size={12}/> Use All
                                                            </button>
                                                         )}
                                                     </div>
                                                     {remoteNode ? (
                                                         <NodePropsView node={remoteNode} />
                                                     ) : (
                                                          <div className="text-center py-8 text-gray-400 italic text-sm border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center gap-3">
                                                             <span>Missing on Remote</span>
                                                             <div className="flex flex-col gap-2 w-full px-4">
                                                                <button 
                                                                    onClick={() => resolveNode(id, 'local')}
                                                                    className="flex items-center justify-center gap-2 px-3 py-1.5 bg-green-50 text-green-600 rounded-md text-xs font-bold hover:bg-green-100 transition w-full"
                                                                >
                                                                    Push Local to Remote <ArrowRight size={14}/>
                                                                </button>
                                                                <button 
                                                                    onClick={() => resolveNode(id, null)}
                                                                    className="flex items-center justify-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-md text-xs font-bold hover:bg-red-100 transition w-full"
                                                                >
                                                                    <Trash2 size={14}/> Remove from Local
                                                                </button>
                                                             </div>
                                                         </div>
                                                     )}
                                                 </div>
                                             </div>
                                             
                                             {/* Merge Detail Area if Conflict */}
                                             {status === 'conflict' && localNode && remoteNode && (
                                                 <div className="p-4 bg-amber-50/50 border-t border-amber-100 dark:bg-amber-900/10 dark:border-amber-900/30">
                                                     <h4 className="text-xs font-bold uppercase text-amber-600 mb-3 flex items-center gap-2">
                                                         <Edit2 size={12}/> Manual Merge
                                                     </h4>
                                                     
                                                     <div className="grid grid-cols-2 gap-4">
                                                         {/* Title Merge */}
                                                         {localNode.title !== remoteNode.title && (
                                                             <div className="col-span-2 flex items-center gap-4 bg-white p-2 rounded border border-amber-100">
                                                                 <span className="text-xs font-bold w-16 text-gray-500">Title</span>
                                                                 <button onClick={() => updateMergedProp(id, 'title', localNode.title)} className={`flex-1 text-left px-3 py-1.5 rounded border text-sm ${mergedNode?.title === localNode.title ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-transparent hover:bg-gray-50'}`}>
                                                                     {localNode.title}
                                                                 </button>
                                                                 <button onClick={() => updateMergedProp(id, 'title', remoteNode.title)} className={`flex-1 text-left px-3 py-1.5 rounded border text-sm ${mergedNode?.title === remoteNode.title ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-transparent hover:bg-gray-50'}`}>
                                                                     {remoteNode.title}
                                                                 </button>
                                                             </div>
                                                         )}
                                                         
                                                         {/* Color Merge */}
                                                         {localNode.color !== remoteNode.color && (
                                                             <div className="col-span-2 flex items-center gap-4 bg-white p-2 rounded border border-amber-100">
                                                                 <span className="text-xs font-bold w-16 text-gray-500">Color</span>
                                                                 <button onClick={() => updateMergedProp(id, 'color', localNode.color)} className={`flex-1 text-left px-3 py-1.5 rounded border text-sm flex items-center gap-2 ${mergedNode?.color === localNode.color ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-transparent hover:bg-gray-50'}`}>
                                                                     <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: localNode.color }}></span> {localNode.color}
                                                                 </button>
                                                                 <button onClick={() => updateMergedProp(id, 'color', remoteNode.color)} className={`flex-1 text-left px-3 py-1.5 rounded border text-sm flex items-center gap-2 ${mergedNode?.color === remoteNode.color ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-transparent hover:bg-gray-50'}`}>
                                                                     <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: remoteNode.color }}></span> {remoteNode.color}
                                                                 </button>
                                                             </div>
                                                         )}
                                                         
                                                          {/* Props Merge (Simple All-Swap for now) */}
                                                          {JSON.stringify(localNode.props) !== JSON.stringify(remoteNode.props) && (
                                                              <div className="col-span-2 flex items-center gap-4 bg-white p-2 rounded border border-amber-100">
                                                                  <span className="text-xs font-bold w-16 text-gray-500">Props</span>
                                                                  <button onClick={() => updateMergedProp(id, 'props', localNode.props)} className={`flex-1 text-left px-3 py-1.5 rounded border text-sm ${JSON.stringify(mergedNode?.props) === JSON.stringify(localNode.props) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-transparent hover:bg-gray-50'}`}>
                                                                      Keep Local Props ({localNode.props?.length || 0})
                                                                  </button>
                                                                  <button onClick={() => updateMergedProp(id, 'props', remoteNode.props)} className={`flex-1 text-left px-3 py-1.5 rounded border text-sm ${JSON.stringify(mergedNode?.props) === JSON.stringify(remoteNode.props) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'border-transparent hover:bg-gray-50'}`}>
                                                                      Use Remote Props ({remoteNode.props?.length || 0})
                                                                  </button>
                                                              </div>
                                                          )}
                                                     </div>
                                                 </div>
                                             )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

const NodePropsView = ({ node }: { node: NodeData }) => (
    <div className="space-y-3 pointer-events-none opacity-90">
        <div>
            <div className="text-[10px] font-bold uppercase text-gray-400">Coordinates</div>
            <div className="font-mono text-xs text-gray-500">X: {Math.round(node.x)}, Y: {Math.round(node.y)}</div>
        </div>
        <div>
            <div className="text-[10px] font-bold uppercase text-gray-400">Title</div>
            <div className="font-bold text-gray-800 text-sm">{node.title || <span className='text-gray-300 italic'>Untitled</span>}</div>
        </div>
        {node.description && (
             <div>
                <div className="text-[10px] font-bold uppercase text-gray-400">Description</div>
                <div className="text-xs text-gray-600 truncate">{node.description}</div>
            </div>
        )}
        <div>
            <div className="text-[10px] font-bold uppercase text-gray-400">Color</div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: node.color }}></div>
                <span className="text-xs font-mono text-gray-600">{node.color}</span>
            </div>
        </div>
        <div>
            <div className="text-[10px] font-bold uppercase text-gray-400 mb-1">Properties</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
                {(node.props || []).map((p, i) => (
                   <div key={i} className="text-xs flex gap-2 border-b border-gray-50 pb-1">
                       <span className="font-mono text-indigo-600 w-1/3 truncate">{p.name}</span>
                       <span className="font-mono text-gray-500 truncate">{p.type}</span>
                   </div> 
                ))}
                {(!node.props || node.props.length === 0) && <span className="text-xs text-gray-400 italic">No properties</span>}
            </div>
        </div>
    </div>
);
