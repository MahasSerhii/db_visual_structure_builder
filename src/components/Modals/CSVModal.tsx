import React, { useState } from 'react';
import { useGraph } from '../../context/GraphContext';
import { useToast } from '../../context/ToastContext';
import { X, Download, Upload, FileSpreadsheet, FileText } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { NodeData, EdgeData, Comment } from '../../utils/types';
import { dbOp } from '../../utils/indexedDB';
// import { uploadFullGraphToBackend } from '../../utils/api';
import { graphApi } from '../../api/graph';
import * as XLSX from 'xlsx';


interface CSVModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CSVModal: React.FC<CSVModalProps> = ({ isOpen, onClose }) => {
    const { nodes, edges, refreshData, isReadOnly, t, isLiveMode, currentProjectId  } = useGraph();

    const { showToast } = useToast();
    const [importFile, setImportFile] = useState<File | null>(null);
    const [activeTab, setActiveTab] = useState<'csv' | 'excel'>('csv');

    if (!isOpen) return null;

    const exportToExcel = () => {
         const wb = XLSX.utils.book_new();
         
         // Nodes Sheet
         const nodesData = nodes.map(n => ({
             id: n.id,
             title: n.title,
             description: n.description,
             color: n.color,
             x: n.x,
             y: n.y,
             docLink: n.docLink,
             props: JSON.stringify(n.props || [])
         }));
         const wsNodes = XLSX.utils.json_to_sheet(nodesData);
         XLSX.utils.book_append_sheet(wb, wsNodes, "Components");

         // Edges Sheet
         const edgesData = edges.map(e => ({
             id: e.id,
             source: typeof e.source === 'object' ? (e.source as NodeData).id : e.source,
             target: typeof e.target === 'object' ? (e.target as NodeData).id : e.target,
             label: e.label,
             sourceProp: e.sourceProp,
             targetProp: e.targetProp
         }));
         const wsEdges = XLSX.utils.json_to_sheet(edgesData);
         XLSX.utils.book_append_sheet(wb, wsEdges, "Connections");

         XLSX.writeFile(wb, `graph_data_${new Date().getTime()}.xlsx`);
         showToast(t('csv.toast.exportSuccess'), "success");
    };

    const handleDownloadCSV = () => {
        // Headers
        const headers = ["rowType", "id", "title", "description", "color", "x", "y", "docLink", "props", "source", "target", "label", "sourceProp", "targetProp"];
        let csvContent = headers.join(",") + "\n";

        // Nodes
        nodes.forEach(n => {
            const propsJson = JSON.stringify(n.props || []).replace(/"/g, '""');
            const row = [
                "component",
                n.id,
                `"${(n.title || "").replace(/"/g, '""')}"`,
                `"${(n.description || "").replace(/"/g, '""')}"`,
                n.color,
                Math.round(n.x),
                Math.round(n.y),
                `"${n.docLink || ""}"`,
                `"${propsJson}"`,
                "", "", "", "", ""
            ];
            csvContent += row.join(",") + "\n";
        });

        // Edges
        edges.forEach(e => {
            const sId = typeof e.source === 'object' ? (e.source as NodeData).id : e.source;
            const tId = typeof e.target === 'object' ? (e.target as NodeData).id : e.target;
            const row = [
                "connection",
                e.id,
                "", "", "", "", "", "", "",
                sId,
                tId,
                `"${(e.label || "").replace(/"/g, '""')}"`,
                e.sourceProp || "",
                e.targetProp || ""
            ];
            csvContent += row.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `combined_graph_data_${new Date().getTime()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const updateGraph = async (newNodes: NodeData[], newEdges: EdgeData[]) => {
        // Bulk Replace Logic
        await dbOp('nodes', 'readwrite', 'clear');
        await dbOp('edges', 'readwrite', 'clear');

        for (const node of newNodes) {
            await dbOp('nodes', 'readwrite', 'put', node);
        }
        for (const edge of newEdges) {
            await dbOp('edges', 'readwrite', 'put', edge);
        }

        // Force UI update even if in Live Mode (local reflection)
        await refreshData(true);

        // If in Live Mode, push to remote
        if (isLiveMode) {
            try {
                if (!currentProjectId) {
                      return  console.error("Room id is not exists");
                  }
                 // Push everything including potentially empty comments if not imported
                 // Ideally we should preserve comments or ask user. 
                 // Current logic wipes DB so comments are wiped too.
                 // We should probably check if CSV includes comments? 
                 // The current CSV implementation does NOT include comments in export/import.
                 // So we must be careful not to wipe remote comments if we want to keep them.
                 // BUT, user asked to replace graph. 
                 // Since CSV doesn't support comments, we'll sync empty comments or preserve local ones?
                 // The code above wipes local 'nodes' and 'edges'. It does NOT wipe 'comments' explicitly in the code I see above 
                 // (lines 173-174 only clear nodes/edges).
                 // So comments persist locallly?
                 
                 // Wait, I should check lines 173-174 again.
                 // Yes:
                 // await dbOp('nodes', 'readwrite', 'clear');
                 // await dbOp('edges', 'readwrite', 'clear');
                 
                 // So comments remain in IndexedDB!
                 
                 // Retrieve comments to push
                 const currentComments = await dbOp('comments', 'readonly', 'getAll') as Comment[];
                 if (currentProjectId) {
                     await graphApi.syncGraph(currentProjectId, {
                        nodes: newNodes,
                        edges: newEdges,
                        comments: currentComments
                     }, true);
                 }
                 showToast(t('csv.toast.success') + " (Synced to Live)", "success");
             } catch(e) {
                 console.error("CSV Sync Failed", e);
                 showToast("Imported locally but Sync failed", "warning");
             }
        } else {
             showToast(t('csv.toast.success'), "success");
        }
        
        onClose();
    };

    const handleProcessImport = () => {
        if (!importFile) {
            showToast(t('csv.toast.selectFile'), "error");
            return;
        }

        // Live Mode Warning
        if (isLiveMode) {
            if (!confirm(t('csv.confirm.liveOverwrite'))) {
                return;
            }
        } else {
            // CSV logic with confirmation
            if (nodes.length > 0 && !confirm(t('csv.confirm.overwrite'))) {
                return;
            }
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            if (!text) return;
            
            try {
                const lines = text.split('\n').filter(l => l.trim());
                if (lines.length < 1) return;

                const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
                const newNodes: NodeData[] = [];
                const newEdges: EdgeData[] = [];

                for (let i = 1; i < lines.length; i++) {
                     // Regex to split by comma, ignoring commas inside quotes
                     const row = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => {
                        let c = cell.trim();
                        if(c.startsWith('"') && c.endsWith('"')) c = c.substring(1, c.length-1);
                        return c.replace(/""/g, '"'); 
                    });

                    const obj: Record<string, string | null | undefined> = {};
                    headers.forEach((h, index) => {
                        if (index < row.length) {
                            obj[h] = row[index] === 'null' ? null : (row[index] === 'undefined' ? undefined : row[index]);
                        }
                    });

                    if (obj['rowType'] === 'component') {
                        // Props parsing
                        let props = [];
                        try {
                            const pData = obj['props'];
                            if (pData) props = JSON.parse(pData);
                        } catch (err) {
                             console.error("Props parsing error", err);
                        }

                        newNodes.push({
                            id: obj['id'] || uuidv4(),
                            title: obj['title'] || 'Untitled',
                            description: obj['description'] || '',
                            color: obj['color'] || '#6366F1',
                            x: parseFloat(obj['x'] || '0'),
                            y: parseFloat(obj['y'] || '0'),
                            docLink: obj['docLink'] || undefined,
                            props: props,
                            createdAt: new Date().toISOString()
                        });
                    } else if (obj['rowType'] === 'connection') {
                        newEdges.push({
                            id: obj['id'] || uuidv4(),
                            source: obj['source'] || '',
                            target: obj['target'] || '',
                            label: obj['label'] || undefined,
                            sourceProp: obj['sourceProp'] || undefined,
                            targetProp: obj['targetProp'] || undefined
                        });
                    }
                }
                
                await updateGraph(newNodes, newEdges);

            } catch (err) {
                console.error(err);
                showToast(t('csv.toast.failcsv'), "error");
            }
        };
        reader.readAsText(importFile);
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-2xl shadow-2xl p-6 flex flex-col max-h-[90vh] overflow-y-auto relative dark:bg-slate-900 dark:border-slate-800">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{t('csv.title')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl dark:hover:text-gray-200">
                        <X size={24} />
                    </button>
                </div>
                
                {/* Format Toggles */}
                <div className="flex p-1 bg-gray-100 rounded-lg mb-6 w-fit mx-auto dark:bg-slate-800">
                    <button 
                        onClick={() => setActiveTab('csv')}
                        className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition ${activeTab === 'csv' ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-indigo-300' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        <FileText size={16} /> CSV
                    </button>
                    <button 
                        onClick={() => setActiveTab('excel')}
                         className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition ${activeTab === 'excel' ? 'bg-white text-green-600 shadow-sm dark:bg-slate-700 dark:text-green-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                    >
                        <FileSpreadsheet size={16} /> Excel
                    </button>
                </div>

                {/* Export Section */}
                <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200 dark:bg-slate-800 dark:border-slate-700">
                    <h3 className="font-bold text-gray-800 mb-2 dark:text-gray-200">{t('csv.export.title')}</h3>
                    <p className="text-xs text-gray-500 mb-4 dark:text-gray-400">{t('csv.export.desc')}</p>
                    <button 
                        onClick={activeTab === 'csv' ? handleDownloadCSV : exportToExcel} 
                        className={`w-full bg-white border hover:bg-gray-50 font-bold py-3 rounded-lg transition shadow-sm flex justify-center items-center gap-2 dark:bg-slate-700 dark:border-slate-600 dark:hover:bg-slate-600 ${activeTab === 'csv' ? 'text-indigo-600 border-gray-300 dark:text-indigo-300' : 'text-green-600 border-green-200 dark:text-green-400'}`}
                    >
                        <Download size={16} />
                        <span>{activeTab === 'csv' ? t('csv.export.btnCsv') : t('csv.export.btnExcel')}</span>
                    </button>
                </div>

                {/* Import Section (Conditioned on ReadOnly) */}
                {!isReadOnly ? (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
                    <h3 className="font-bold text-emerald-800 mb-2 dark:text-emerald-300">{t('csv.import.title')}</h3>
                    <p className="text-xs text-emerald-700 mb-4 dark:text-emerald-400">{t('csv.import.desc')}</p>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1 dark:text-gray-400">{t('csv.import.uploadLabel')} ({activeTab.toUpperCase()})</label>
                            <input 
                                type="file" 
                                accept={activeTab === 'csv' ? ".csv" : ".xlsx, .xls"}
                                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200 dark:file:bg-emerald-900 dark:file:text-emerald-300" 
                            />
                        </div>
                        
                        <button onClick={handleProcessImport} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition shadow dark:shadow-none flex justify-center items-center gap-2">
                            <Upload size={16} />
                            {t('csv.import.processBtn')}
                        </button>
                    </div>
                </div>
                ) : (
                    <div className="p-4 bg-gray-100 rounded-xl border border-gray-200 text-center dark:bg-slate-800 dark:border-slate-700">
                        <h3 className="font-bold text-gray-500 mb-1 dark:text-gray-400">{t('csv.import.disabledTitle')}</h3>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{t('csv.import.disabledDesc')}</p>
                    </div>
                )}

            </div>
        </div>
    );
};
