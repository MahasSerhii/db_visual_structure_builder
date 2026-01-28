import React, { useMemo } from 'react';
import { ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';

interface ActiveUsersListProps {
    t: (key: string) => string;
    isConnected: boolean;
    connectedUsers: any[];
    isClientMode: boolean; // Keep for interface compat, but less relevant now
    isUsersListOpen: boolean;
    setIsUsersListOpen: (val: boolean) => void;
    isLiveMode: boolean;
    isInvisible: boolean; 
    toggleInvisible: () => void;
    config: any;
    isRestoringSession?: boolean;
}

export const ActiveUsersList: React.FC<ActiveUsersListProps> = ({
    t, isConnected, connectedUsers, isUsersListOpen, setIsUsersListOpen, config, isInvisible, toggleInvisible
}) => {
    // With Live Mode (Socket), connectedUsers should be populated.
    if (!isConnected && (!connectedUsers || connectedUsers.length === 0)) return null;
    
    // Process Users List
    const displayUsers = useMemo(() => {
        // If empty (loading or no users), return empty
        if (!connectedUsers || connectedUsers.length === 0) return [];
        
        return connectedUsers.map(u => ({
            id: u.socketId || u.id,
            name: u.name || 'Anonymous',
            color: u.color || '#ccc',
            isVisible: u.isVisible !== false,
            isMe: u.name === config.userProfile.name, // Weak check but sufficient for display
        }))
        .filter(u => u.isMe || u.isVisible)
        .filter((user, index, self) => {
            // Deduplicate logic:
            // If it's Me, only show one instance (the first one) to hide ghost sessions
            if (user.isMe) {
                 return index === self.findIndex(t => t.isMe);
            }
            // Others: deduplicate by name+color
            return index === self.findIndex((t) => (
                t.name === user.name && t.color === user.color
            ));
        });
    }, [connectedUsers, config.userProfile.name]);

    return (
        <div className="mt-3 pt-3 border-t border-indigo-100 dark:border-indigo-900 min-h-[70px]">
            <button 
                onClick={() => setIsUsersListOpen(!isUsersListOpen)}
                className="w-full flex justify-between items-center text-[10px] uppercase font-bold text-gray-400 mb-2 hover:text-indigo-600 transition-colors dark:text-gray-500 dark:hover:text-indigo-400"
            >
                <span>{t('data.users.active')} ({displayUsers.length})</span>
                {isUsersListOpen ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
            </button>
            
            {isUsersListOpen && (
                <div className="space-y-1.5 animate-slide-in">
                        {displayUsers.length > 0 ? (
                            displayUsers.map(u => {
                                return (
                                    <div key={u.id} className={`flex items-center justify-between text-xs p-1.5 rounded border border-gray-100 bg-gray-50 dark:bg-slate-800 dark:border-slate-700`}>
                                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                                            <div 
                                                className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0" 
                                                style={{ backgroundColor: u.color }}
                                            ></div>
                                            <span 
                                                className={`truncate ${u.isMe ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300'}`} 
                                                title={u.name}
                                            >
                                                {u.name} {u.isMe && '(You)'}
                                            </span>
                                        </div>
                                        {u.isMe && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); toggleInvisible(); }}
                                                className="ml-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none"
                                                title={isInvisible ? "Unlock Visibility" : "Hide from list"}
                                            >
                                                {isInvisible ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                             <div className="text-center text-xs text-gray-400 py-2 italic opacity-60">
                                 {t('data.users.empty')}
                             </div>
                        )}
                </div>
            )}
        </div>
    );
};