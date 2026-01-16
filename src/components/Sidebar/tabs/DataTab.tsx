import React, { useState, useEffect, useRef } from 'react';
import { useGraph } from '../../../context/GraphContext';
import { useToast } from '../../../context/ToastContext';
import { Download, Upload, Database, FileSpreadsheet, PlayCircle, Unplug, Link as LinkIcon, Trash, History, Crown, User, ToggleLeft, ToggleRight, Radio, ChevronDown, ChevronUp } from 'lucide-react';
import { initFirebase, connectToRoom, disconnectRoom, subscribeToUsers } from '../../../utils/firebase';
import { CSVModal } from '../../Modals/CSVModal';
import { HistoryModal } from '../../Modals/HistoryModal';
import { ConfirmationModal } from '../../Modals/ConfirmationModal';
import { dbOp } from '../../../utils/indexedDB';

export const DataTab: React.FC = () => {
    const { config, nodes, edges, comments, refreshData, isLiveMode, setLiveMode, setGraphData, currentRoomId, setCurrentRoomId, t } = useGraph();
    const { showToast } = useToast();
    const [firebaseConfig, setFirebaseConfig] = useState('');
    // Initialize Local RoomID from Context if we are in Live Mode
    const [roomId, setRoomId] = useState(isLiveMode && currentRoomId ? currentRoomId : '');
    const [isFirebaseReady, setIsFirebaseReady] = useState(false);
    const [isConnected, setIsConnected] = useState(isLiveMode && !!currentRoomId);
    const [isCSVModalOpen, setCSVModalOpen] = useState(false);
    const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
    const [connectedUsers, setConnectedUsers] = useState<any[]>([]);
    const [isUsersListOpen, setIsUsersListOpen] = useState(false);
    // Initialize ClientMode derived from URL to prevent UI flicker
    const [isClientMode, setIsClientMode] = useState(() => {
        const p = new URLSearchParams(window.location.search);
        return !!p.get('config') && !!p.get('room');
    });
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [configError, setConfigError] = useState<string | null>(null);
    const hasShownErrorToast = useRef(false);

    // Initial Load of Config
    useEffect(() => {
        const storedConfig = localStorage.getItem('fb_config_str');
        if(storedConfig) {
            setFirebaseConfig(storedConfig);
            setRememberMe(true);
            // Auto Init if stored
            try {
                const fbConfig = new Function("return " + storedConfig)();
                if (initFirebase(fbConfig)) {
                     setIsFirebaseReady(true);
                     showToast("Restored Firebase Connection", 'info');
                }
            } catch(e) { /* ignore */ }
        }
    }, []);

    // Handle Magic Link Auto-Connect
    useEffect(() => {
        // Auto-connect mechanism once setup is complete
        if(isFirebaseReady && roomId && isClientMode && !isConnected && !isConnecting) {
             handleConnect();
             return;
        }

        const params = new URLSearchParams(window.location.search);
        const configParam = params.get('config');
        const roomParam = params.get('room');

        // Initial Parsing Logic (Only run if params exist and we haven't set up yet)
        if (configParam && roomParam && !isFirebaseReady) {
            let success = false;
            let targetRoomId = roomParam;

            // 1. Try to Decode Config
            try {
                const decodedConfig = atob(configParam.trim());
                // Use Function constructor for lenient parsing (handles unquoted keys etc)
                const parsed = new Function("return " + decodedConfig)();
                setFirebaseConfig(decodedConfig);
                if (initFirebase(parsed)) success = true;
            } catch (e) {
                // Heuristic Fallback
                try {
                     // Also lenient parse for direct param
                     const directParse = new Function("return " + configParam)();
                     if(initFirebase(directParse)) {
                         setFirebaseConfig(configParam);
                         success = true;
                     }
                } catch(e2) { /* ignore */ }
            }

            // 2. Try to Decode Room ID safely
            try {
                const decodedRoom = atob(roomParam);
                // Validation: Only accept if it decodes to printable ASCII characters
                // ASCII 32-126 are printable. This prevents garbage interpretation of legacy plain text.
                if (/^[\x20-\x7E]+$/.test(decodedRoom)) {
                     targetRoomId = decodedRoom;
                }
            } catch(e) {
                // Not base64, keep original
                targetRoomId = roomParam;
            }

            if (success) {
                 setIsFirebaseReady(true);
                 setIsClientMode(true); 
                 setConfigError(null);
                 setRoomId(targetRoomId);
                 // Note: handleConnect will be triggered by the effect re-running due to state updates
            } else {
                 const msg = "Invalid Invite Link - Check Config";
                 setConfigError(msg);
                 if (!hasShownErrorToast.current) {
                     showToast(msg, "error");
                     hasShownErrorToast.current = true;
                 }
            }
        } else if (roomParam && !roomId) {
             setRoomId(roomParam);
        }
    }, [isFirebaseReady, roomId, isClientMode, isConnected, isConnecting]); 

    // Auto-toggle "connected" visual and resume state on re-mount
    useEffect(() => {
        // If we are live and have a room ID in context, sync local state
        if (isLiveMode && currentRoomId) {
            setIsConnected(true);
            // If RoomID was not set (e.g. state reset on unmount), restore it
            if (!roomId) setRoomId(currentRoomId);
            
            // Re-subscribe to users since local listeners are lost on unmount
            subscribeToUsers(currentRoomId, (users) => {
                 if (users) {
                     const list = Object.entries(users).map(([k, v]: [string, any]) => ({...v, id: k}));
                     setConnectedUsers(list);
                 }
            });
        }
    }, [isLiveMode, currentRoomId]); // Check specifically on mount or mode change

    const handleInitFirebase = () => {
        if (!firebaseConfig.trim()) {
            showToast("Please provide Firebase JSON!", 'error');
            return;
        }
        try {
             // Use Function constructor to parse loose JSON/JS Objects
             const fbConfig = new Function("return " + firebaseConfig)();
             
             if (initFirebase(fbConfig)) {
                 setIsFirebaseReady(true);
                 if (rememberMe) {
                    localStorage.setItem('fb_config_str', firebaseConfig);
                 } else {
                    localStorage.removeItem('fb_config_str');
                 }
                 setConfigError(null);
                 showToast("Firebase Initialized. Enter Room ID.", 'success');
             } else {
                 showToast("Firebase failed to initialize.", 'error');
             }
        } catch (e) {
            console.error(e);
            showToast("Invalid JSON Config", 'error');
        }
    };

    const handleConnect = () => {
        if (!roomId) {
            showToast("Room ID is missing", "error");
            return;
        }
        
        setIsConnecting(true);

        // Identity Management for Host vs Client (Guest)
        // If Client Mode, use sessionStorage to avoid collision with Host on same browser
        let userId = isClientMode 
            ? sessionStorage.getItem('client_uid') 
            : localStorage.getItem('my_user_id');

        if (!userId) {
            userId = (isClientMode ? 'guest_' : 'user_') + Math.random().toString(36).substr(2, 9);
            if (isClientMode) {
                sessionStorage.setItem('client_uid', userId);
            } else {
                localStorage.setItem('my_user_id', userId);
            }
        }

        const userObj = {
            id: userId,
            name: (config.userProfile.name || (isClientMode ? 'Guest' : 'Host')) + (isClientMode ? ' (Guest)' : ' (Host)'),
            color: config.userProfile.color,
            lastActive: Date.now()
        };

        try {
            connectToRoom(roomId, userObj, (data) => {
                console.log("Remote Data Received");
                 if (data) {
                     const nList = data.nodes ? (Array.isArray(data.nodes) ? data.nodes : Object.values(data.nodes)) : [];
                     const eList = data.edges ? (Array.isArray(data.edges) ? data.edges : Object.values(data.edges)) : [];
                     const cList = data.comments ? (Array.isArray(data.comments) ? data.comments : Object.values(data.comments)) : [];
                     
                     // Update Context
                     setGraphData(nList, eList, cList);
                 }
            });
            
            subscribeToUsers(roomId, (users) => {
                 if (users) {
                     const list = Object.entries(users).map(([k, v]: [string, any]) => ({...v, id: k}));
                     setConnectedUsers(list);
                 }
            });

            setIsConnected(true);
            setLiveMode(true); 
            setCurrentRoomId(roomId); 
            showToast("Connected to Live Room!", 'success');
        } catch (e) {
            console.error(e);
            showToast("Connection Failed", 'error');
        } finally {
            setIsConnecting(false);
        }
    };

    // Need to handle graph updates from inside the callback.
    // The previous edit didn't include setGraphData in destructuring.
    // I will fix destructuring in next tool call.

    const handleDisconnect = async () => {
        disconnectRoom(); // Firebase disconnect
        setIsConnected(false);
        setLiveMode(false); 
        setCurrentRoomId(null);
        
        // Strict Wipe: Clear all local storage & DB data for EVERYONE (Host & Client)
        // User Requirement: "remove all db data from browser that app saved for this db connection"
        localStorage.removeItem('fb_config_str'); 
        // We keep 'my_user_id' for identity continuity unless strictly client mode reqs? 
        // User said "logout user from current db connection", usually ID persists, but local data wipes.
        
        // Wipe IndexedDB
        await dbOp('nodes', 'readwrite', 'clear');
        await dbOp('edges', 'readwrite', 'clear');
        await dbOp('comments', 'readwrite', 'clear'); // Clear comments too!
        refreshData(); 
        setFirebaseConfig('');
        setRememberMe(false);

        if (isClientMode) {
             localStorage.clear(); // Hard Wipe for Clients
             window.location.href = window.location.origin + window.location.pathname;
        } else {
             // Host Logic
             setRoomId('');
             setIsFirebaseReady(false); // Force re-entry of config if desired, or at least disconnect visual
             showToast("Disconnected & Local Data Cleared", "info");
        }
    };

    const handleDeleteDB = () => {
        setIsDeleteConfirmOpen(true);
    };

    const confirmDeleteDB = async () => {
         // Wipe Local & Disconnect
             await dbOp('nodes', 'readwrite', 'clear');
             await dbOp('edges', 'readwrite', 'clear');
             await dbOp('comments', 'readwrite', 'clear');
             refreshData();
             handleDisconnect();
             showToast("Database & Local Data Wiped", "error");
    };
    
    const handleCopyMagicLink = () => {
        if (!firebaseConfig || !roomId) {
            showToast("Init Firebase & Room ID first", "error");
            return;
        }
        // Do NOT remove spaces from JSON to ensure valid syntax for unquoted keys if present
        const cleanConfig = firebaseConfig.trim();
        const encodedConfig = btoa(cleanConfig);
        // Encrypt Room ID as well
        const encodedRoomId = btoa(roomId);
        const url = `${window.location.origin}${window.location.pathname}?room=${encodedRoomId}&config=${encodedConfig}`;
        
        navigator.clipboard.writeText(url);
        showToast("Magic Link Copied to Clipboard!", "success");
    };

    const toggleLiveMode = () => {
        if (!isConnected) {
            showToast("Connect to a room first", "error");
            return;
        }
        setLiveMode(!isLiveMode);
        showToast(isLiveMode ? "Switched to Local View" : "Switched to Live View", "info");
    };

    const exportJSON = () => {
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

    const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
             try {
                 const data = JSON.parse(e.target?.result as string);
                 if (data.nodes && Array.isArray(data.nodes) && data.edges && Array.isArray(data.edges)) {
                     if(confirm("This will overwrite your current graph. Continue?")) {
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
                         alert("Graph restored successfully!");
                     }
                 } else {
                     alert("Invalid File Format: Missing nodes or edges array.");
                 }
             } catch (e) {
                 console.error(e);
                 alert("Invalid JSON File");
             }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('data.collab')}</h3>
            
            <div className="p-4 bg-white rounded-lg border border-indigo-200 shadow-sm space-y-3 dark:bg-indigo-900/10 dark:border-indigo-800">
                 <div className="text-xs font-bold text-gray-700 flex justify-between items-center dark:text-indigo-200">
                     <span>{t('data.live')}</span>
                     <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : (isFirebaseReady ? 'bg-yellow-400' : 'bg-gray-300')}`} title={isConnected ? "Connected" : "Disconnected"}></span>
                 </div>

                 {!isFirebaseReady ? (
                     <div id="fb-config-section">
                        {configError && (
                             <div className="mb-2 p-2 bg-red-50 text-red-600 text-[10px] rounded border border-red-100 font-medium dark:bg-red-900/30 dark:text-red-300 dark:border-red-900">
                                 {configError}
                             </div>
                        )}
                        {!isClientMode ? (
                            <>
                                <textarea 
                                    value={firebaseConfig}
                                    onChange={(e) => setFirebaseConfig(e.target.value)}
                                    rows={3} 
                                    placeholder={t('data.paste')} 
                                    className="w-full text-[10px] p-2 border border-gray-200 rounded mb-2 font-mono dark:bg-slate-900 dark:border-slate-600 dark:text-gray-200"
                                ></textarea>
                                
                                <div className="flex items-center mb-2">
                                    <input 
                                        id="fb-remember" 
                                        type="checkbox" 
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-3 h-3 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600" 
                                    />
                                    <label htmlFor="fb-remember" className="ml-2 text-xs text-gray-600 dark:text-gray-400">{t('data.remember')}</label>
                                </div>

                                <button onClick={handleInitFirebase} className="w-full py-1.5 text-xs bg-gray-900 text-white rounded font-medium hover:bg-gray-800 transition dark:bg-slate-700 dark:hover:bg-slate-600">{t('data.set')}</button>
                            </>
                        ) : (
                             <div className="text-xs text-gray-500 text-center py-2 animate-pulse dark:text-gray-400">Initializing Client Mode...</div>
                        )}
                     </div>
                 ) : (
                     <div id="fb-room-section">
                        <div className="flex justify-between items-end mb-1">
                             <label className="block text-[10px] text-gray-500 dark:text-gray-400">
                                 {isClientMode && isConnected ? "Session Active" : t('data.room')}
                             </label>
                             <div className="flex gap-2">
                                {!isClientMode && (
                                    <button onClick={handleDeleteDB} className="text-[9px] text-red-800 hover:text-red-900 transition mb-0.5 font-bold underline bg-red-100 px-1 rounded dark:bg-red-900/50 dark:text-red-300 dark:hover:text-red-200">{t('data.deleteDB')}</button>
                                )}
                                <button onClick={handleDisconnect} className="text-[9px] text-red-500 hover:text-red-700 transition mb-0.5 font-bold underline dark:text-red-400 dark:hover:text-red-300">{t('data.disconnect')}</button>
                             </div>
                        </div>
                        {(!isClientMode || !isConnected) && (
                            <input 
                                value={isClientMode ? (isConnected ? "Secure Connected Room" : "Pending Connection...") : roomId}
                                onChange={(e) => !isClientMode && setRoomId(e.target.value)}
                                type={isClientMode ? "password" : "text"} 
                                placeholder="Enter Room Name" 
                                className="w-full text-xs p-2 border border-gray-200 rounded mb-2 font-bold text-indigo-700 disabled:bg-gray-50 dark:bg-slate-900 dark:border-slate-600 dark:text-indigo-300 dark:disabled:bg-slate-500"
                                disabled={isConnected || isClientMode}
                            />
                        )}
                        <div className="flex gap-2">
                            {!isConnected ? (
                                <button 
                                    id="btn-connect" 
                                    onClick={handleConnect} 
                                    disabled={isConnecting}
                                    className={`flex-1 py-1.5 text-xs text-white rounded font-medium transition shadow-sm ${isConnecting ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-600'}`}
                                >
                                    {isConnecting ? "Connecting..." : (isClientMode ? "Join Room" : t('data.connect'))}
                                </button>
                            ) : (
                                <button onClick={toggleLiveMode} className={`flex-1 py-1.5 text-xs text-white rounded font-medium shadow-sm transition flex items-center justify-center gap-2 ${isLiveMode ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-500 hover:bg-gray-600'}`}>
                                    {isLiveMode ? <Radio size={12} className="animate-pulse"/> : <Unplug size={12}/>}
                                    {isLiveMode ? "LIVE Mode" : "Local Mode"}
                                </button>
                            )}
                            {!isClientMode && (
                                <button onClick={handleCopyMagicLink} className="py-1 px-3 text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 rounded hover:bg-emerald-100 transition dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/50" title="Copy Magic Link">
                                    <LinkIcon size={14} />
                                </button>
                            )}
                        </div>

                         {/* Connected Users List (Accordion) */}
                        {isConnected && connectedUsers.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-indigo-100 dark:border-indigo-900">
                                <button 
                                    onClick={() => setIsUsersListOpen(!isUsersListOpen)}
                                    className="w-full flex justify-between items-center text-[10px] uppercase font-bold text-gray-400 mb-2 hover:text-indigo-600 transition-colors dark:text-gray-500 dark:hover:text-indigo-400"
                                >
                                    <span>Active Users ({connectedUsers.length})</span>
                                    {isUsersListOpen ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                </button>
                                
                                {isUsersListOpen && (
                                    <div className="space-y-1.5 animate-slide-in">
                                        {connectedUsers.map(u => {
                                            const myId = isClientMode ? sessionStorage.getItem('client_uid') : localStorage.getItem('my_user_id');
                                            return (
                                                <div key={u.id} className="flex items-center justify-between text-xs bg-gray-50 p-1.5 rounded border border-gray-100 dark:bg-slate-800 dark:border-slate-700">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: u.color || '#ccc' }}></div>
                                                        <span className="font-medium text-gray-700 max-w-[100px] truncate dark:text-gray-300">{u.name || 'Anonymous'}</span>
                                                        {u.id === myId && <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded dark:bg-green-900/30 dark:text-green-400">Me</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                     </div>
                 )}
            </div>

            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">{t('data.mgmt')}</h3>
            
            <div className="grid grid-cols-1 gap-3">
                 <button 
                    onClick={() => !isLiveMode && setCSVModalOpen(true)} 
                    disabled={isLiveMode}
                    className={`w-full text-left p-4 text-xs font-medium rounded-lg transition flex items-center gap-3 border shadow-sm ${
                        isLiveMode 
                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-slate-800/50 dark:border-slate-800 dark:text-gray-600' 
                        : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-slate-700'
                    }`}
                >
                     <FileSpreadsheet size={24} className={isLiveMode ? "text-gray-400 dark:text-gray-600" : "text-gray-600 dark:text-gray-400"} />
                     <div>
                         <div className="font-bold">{t('data.excel')}</div>
                         <div className="text-[10px] text-gray-500 mt-0.5 dark:text-gray-500">{isLiveMode ? "Disabled in Live Mode" : "Bulk edit in Excel"}</div>
                     </div>
                 </button>
                 
                 <button onClick={exportJSON} className="w-full text-left p-4 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition flex items-center gap-3 border border-indigo-200 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-slate-700">
                     <Database size={24} className="text-gray-600 dark:text-gray-400" />
                     <div>
                         <div className="font-bold">{t('data.export')}</div>
                         <div className="text-[10px] text-gray-500 mt-0.5 dark:text-gray-500">Save all data</div>
                     </div>
                 </button>
                 
                 <label className={`w-full text-left p-4 text-xs font-medium rounded-lg transition flex items-center gap-3 border shadow-sm ${
                        isLiveMode 
                        ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed dark:bg-slate-800/50 dark:border-slate-800 dark:text-gray-600' 
                        : 'bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-slate-700'
                    }`}>
                     <Upload size={24} className={isLiveMode ? "text-gray-400 dark:text-gray-600" : "text-gray-600 dark:text-gray-400"} />
                     <div>
                         <div className="font-bold">{t('data.import')}</div>
                         <div className="text-[10px] text-gray-500 mt-0.5 dark:text-gray-500">{isLiveMode ? "Disabled in Live Mode" : "Load backup"}</div>
                     </div>
                     <input 
                        type="file" 
                        className="hidden" 
                        accept=".json" 
                        onChange={handleImportFile} 
                        disabled={isLiveMode}
                    />
                 </label>
                 
                 <button onClick={() => setHistoryModalOpen(true)} className="w-full text-left p-4 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition flex items-center gap-3 border border-indigo-200 bg-white shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-indigo-400 dark:hover:bg-slate-700">
                     <History size={24} className="text-gray-600 dark:text-gray-400" />
                     <div>
                         <div className="font-bold">{t('data.history')}</div>
                         <div className="text-[10px] text-gray-500 mt-0.5 dark:text-gray-500">View changes</div>
                     </div>
                 </button>
            </div>
            
            <ConfirmationModal 
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={confirmDeleteDB}
                title="Delete Database"
                message="DANGER: This will delete ALL data in the remote DB room and your local data. This action cannot be undone. Are you sure?"
                confirmText="Delete Everything"
                isDanger={true}
            />
            
            <CSVModal isOpen={isCSVModalOpen} onClose={() => setCSVModalOpen(false)} />
            <HistoryModal isOpen={isHistoryModalOpen} onClose={() => setHistoryModalOpen(false)} />
        </div>
    );
};
