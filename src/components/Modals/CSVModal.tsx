import React, { useState } from 'react';
import { useGraph } from '../../context/GraphContext';
import { useToast } from '../../context/ToastContext';
import { X, Download, Upload } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { NodeData, EdgeData } from '../../utils/types';
import { dbOp } from '../../utils/indexedDB';

interface CSVModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CSVModal: React.FC<CSVModalProps> = ({ isOpen, onClose }) => {
    const { nodes, edges, refreshData } = useGraph();
    const { showToast } = useToast();
    const [importFile, setImportFile] = useState<File | null>(null);

    if (!isOpen) return null;

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
            const sId = typeof e.source === 'object' ? (e.source as any).id : e.source;
            const tId = typeof e.target === 'object' ? (e.target as any).id : e.target;
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

    const handleProcessImport = () => {
        if (!importFile) {
            showToast("Please select a file.", "error");
            return;
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

                    const obj: any = {};
                    headers.forEach((h, index) => {
                        if (index < row.length) {
                            obj[h] = row[index] === 'null' ? null : (row[index] === 'undefined' ? undefined : row[index]);
                        }
                    });

                    if (obj.rowType === 'component') {
                        // Props parsing
                        let props = [];
                        try {
                            if (obj.props) props = JSON.parse(obj.props);
                        } catch (err) {
                             console.error("Props parsing error", err);
                        }

                        newNodes.push({
                            id: obj.id || uuidv4(),
                            title: obj.title || 'Untitled',
                            description: obj.description || '',
                            color: obj.color || '#6366F1',
                            x: parseFloat(obj.x) || 0,
                            y: parseFloat(obj.y) || 0,
                            docLink: obj.docLink,
                            props: props,
                            createdAt: new Date().toISOString()
                        });
                    } else if (obj.rowType === 'connection') {
                        newEdges.push({
                            id: obj.id || uuidv4(),
                            source: obj.source,
                            target: obj.target,
                            label: obj.label,
                            sourceProp: obj.sourceProp,
                            targetProp: obj.targetProp
                        });
                    }
                }
                
                // Bulk Replace Logic
                await dbOp('nodes', 'readwrite', 'clear');
                await dbOp('edges', 'readwrite', 'clear');

                for (const node of newNodes) {
                    await dbOp('nodes', 'readwrite', 'put', node);
                }
                for (const edge of newEdges) {
                    await dbOp('edges', 'readwrite', 'put', edge);
                }

                await refreshData();
                showToast(`Imported ${newNodes.length} nodes and ${newEdges.length} edges!`, "success");
                onClose();

            } catch (err) {
                console.error(err);
                showToast("Failed to parse or import CSV.", "error");
            }
        };
        reader.readAsText(importFile);
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-2xl shadow-2xl p-6 flex flex-col max-h-[90vh] overflow-y-auto relative">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-indigo-600">CSV Data Manager</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
                        <X size={24} />
                    </button>
                </div>

                {/* Export Section */}
                <div className="mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <h3 className="font-bold text-gray-800 mb-2">1. Export to Single File</h3>
                    <p className="text-xs text-gray-500 mb-4">Download your entire graph (components & connections) in one CSV file.</p>
                    <button onClick={handleDownloadCSV} className="w-full bg-white border border-gray-300 hover:bg-indigo-50 text-indigo-600 font-bold py-3 rounded-lg transition shadow-sm flex justify-center items-center gap-2">
                        <Download size={16} />
                        <span>Download Combined Data.csv</span>
                    </button>
                </div>

                {/* Import Section */}
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <h3 className="font-bold text-emerald-800 mb-2">2. Import Single File</h3>
                    <p className="text-xs text-emerald-700 mb-4">Upload a combined CSV file to update the graph. <br /><strong>Note:</strong> Uploading will replace the current graph data.</p>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Upload Data File</label>
                            <input 
                                type="file" 
                                accept=".csv"
                                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-100 file:text-emerald-700 hover:file:bg-emerald-200" 
                            />
                        </div>
                        
                        <button onClick={handleProcessImport} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition shadow dark:shadow-none flex justify-center items-center gap-2">
                            <Upload size={16} />
                            Process File & Update Graph
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
