import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface TabData {
    id: string;
    roomId: string | null; // null = New Tab / Local only?
    title: string;
    type: 'graph';
    isLive?: boolean; 
}

interface WorkspaceContextType {
    tabs: TabData[];
    activeTabId: string;
    addTab: (roomId?: string, title?: string) => void;
    closeTab: (id: string) => void;
    setActiveTabId: (id: string) => void;
    updateTab: (id: string, data: Partial<TabData>) => void;
    getTabByRoomId: (roomId: string) => TabData | undefined;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const useWorkspace = () => {
    const context = useContext(WorkspaceContext);
    if (!context) {
        throw new Error('useWorkspace must be used within a WorkspaceProvider');
    }
    return context;
};

const STORAGE_KEY = 'workspace_tabs_v1';

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initialize Tabs from LocalStorage or URL
    const [tabs, setTabs] = useState<TabData[]>(() => {
        try {
            // Priority 1: Check URL Parameters for "Link Mode"
            // If the user lands on the app with ?room=XYZ, we should ensure the first tab opens that room.
            const params = new URLSearchParams(window.location.search);
            const roomParam = params.get('room');
            if (roomParam) {
                // If URL has a room, we override the saved state or default state to ensure the user sees what they clicked.
                // Or maybe we append it?
                // Let's decide: If URL is present, start FRESH with that room (Link Sharing UX).
                // But if we want to preserve previous tabs, we could append.
                // Standard UX for "Open Link": Open that link.
                let targetRoomId = roomParam;
                 try {
                    const decodedRoom = atob(roomParam);
                    if (/^[\x20-\x7E]+$/.test(decodedRoom)) targetRoomId = decodedRoom;
                } catch { /* ignore */ }

                return [{ id: 'tab-1', roomId: targetRoomId, title: `Room ${targetRoomId.slice(-4)}`, type: 'graph' }];
            }

            // Priority 2: LocalStorage Restore
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.tabs && Array.isArray(parsed.tabs) && parsed.tabs.length > 0) {
                    return parsed.tabs;
                }
            }
        } catch (e) {
            console.error("Failed to load workspace tabs", e);
        }
        return [{ id: 'tab-1', roomId: null, title: 'New Tab', type: 'graph' }];
    });

    // Initialize Active Tab from LocalStorage
    const [activeTabId, setActiveTabId] = useState<string>(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.activeTabId && typeof parsed.activeTabId === 'string') {
                    // Validate that the active tab actually exists
                    // (We can't easily access 'tabs' here as it's being initialized potentially in parallel or similar closure scope, 
                    // but usually we rely on the persisted value. For safety, we can check later via effect if needed, 
                    // or just trust the storage for now).
                    return parsed.activeTabId;
                }
            }
        } catch (e) {
             console.error("Failed to load active tab", e);
        }
        return 'tab-1';
    });

    // Persistence Effect
    React.useEffect(() => {
        const dataToSave = {
            tabs,
            activeTabId
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }, [tabs, activeTabId]);

    const addTab = useCallback((roomId: string | null = null, title: string = 'New Tab') => {
        const newTab: TabData = {
            id: `tab-${Date.now()}`,
            roomId,
            title,
            type: 'graph'
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTabId(newTab.id);
    }, []);

    const closeTab = useCallback((id: string) => {
        setTabs(prev => {
            const newTabs = prev.filter(t => t.id !== id);
            // If we closed the active tab, switch to the last one
            if (id === activeTabId && newTabs.length > 0) {
                setActiveTabId(newTabs[newTabs.length - 1].id);
            }
            if (newTabs.length === 0) {
                // Always keep one tab?
                return [{ id: `tab-${Date.now()}`, roomId: null, title: 'New Tab', type: 'graph' }];
            }
            return newTabs;
        });
    }, [activeTabId]);

    const updateTab = useCallback((id: string, data: Partial<TabData>) => {
        setTabs(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    }, []);

    const getTabByRoomId = useCallback((roomId: string) => {
        return tabs.find(t => t.roomId === roomId);
    }, [tabs]);

    return (
        <WorkspaceContext.Provider value={{
            tabs,
            activeTabId,
            addTab,
            closeTab,
            setActiveTabId,
            updateTab,
            getTabByRoomId
        }}>
            {children}
        </WorkspaceContext.Provider>
    );
};
