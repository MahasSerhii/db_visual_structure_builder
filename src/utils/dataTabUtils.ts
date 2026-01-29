import { dbOp } from './indexedDB';
import { NodeData, EdgeData, Comment } from './types';

export const downloadJSON = (nodes: NodeData[], edges: EdgeData[], comments: Comment[]) => {
    const data = { 
        nodes, 
        edges, 
        comments,
        meta: { graphName: 'dashboard' },
        exportedAt: new Date().toISOString() 
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `graph_backup_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

export const processImportFile = (
    file: File, 
    refreshData: () => Promise<void>
): Promise<{ success: boolean; message: string }> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
             try {
                 const data = JSON.parse(e.target?.result as string);
                 if (data.nodes && Array.isArray(data.nodes) && data.edges && Array.isArray(data.edges)) {
                     // Clear DB
                     await dbOp('nodes', 'readwrite', 'clear');
                     await dbOp('edges', 'readwrite', 'clear');
                     await dbOp('comments', 'readwrite', 'clear');
                     
                     // Insert Nodes
                     for (const n of data.nodes) {
                         await dbOp('nodes', 'readwrite', 'put', n);
                     }
                     // Insert Edges
                     for (const ed of data.edges) {
                         await dbOp('edges', 'readwrite', 'put', ed);
                     }
                     // Insert Comments
                     if (data.comments && Array.isArray(data.comments)) {
                         for (const c of data.comments) {
                             await dbOp('comments', 'readwrite', 'put', c);
                         }
                     }
                     
                     await refreshData();
                     resolve({ success: true, message: "Graph restored successfully!" });
                 } else {
                     resolve({ success: false, message: "Invalid File Format: Missing nodes or edges array." });
                 }
             } catch {
                 resolve({ success: false, message: "Invalid JSON File" });
             }
        };
        reader.readAsText(file);
    });
};

export const wipeDatabase = async () => {
    try {
        await dbOp('nodes', 'readwrite', 'clear');
        await dbOp('edges', 'readwrite', 'clear');
        await dbOp('comments', 'readwrite', 'clear');
    } catch { console.error("DB Wipe Failed"); }
};
