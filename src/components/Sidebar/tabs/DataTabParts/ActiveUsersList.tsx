import React, { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, Eye, EyeOff, Trash2 } from 'lucide-react';

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
    isProjectAuthor?: boolean; // Is current user the project author
    onRemoveUser?: (accessId: string, userName: string) => void; // Callback to remove user
    roomAccessUsers?: any[]; // List of users with access to room
}

export const ActiveUsersList: React.FC<ActiveUsersListProps> = ({
    t, isConnected, connectedUsers, isUsersListOpen, setIsUsersListOpen, config, isInvisible, toggleInvisible,
    isProjectAuthor = false, onRemoveUser, roomAccessUsers = []
}) => {
    // All hooks must be at the top, before any conditional returns
    const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
    
    // Process Users List
    const displayUsers = useMemo(() => {
        // If empty (loading or no users), return empty
        if (!connectedUsers || connectedUsers.length === 0) return [];

        const myUserId = localStorage.getItem('my_user_id');
        const myName = config.userProfile.name;
        
        return connectedUsers.map(u => {
            // Check if this user is me (by ID or Name as fallback)
            const isMe = (myUserId && u.userId === myUserId) || (!u.userId && u.name === myName);
            
            // Determine Role Badge
            let roleBadge = '';
            // Try to find user in Access List to get Role
            const accessUser = roomAccessUsers?.find(au => 
                (au.userId === u.userId) || // Match by ID (best)
                (au.name === u.name) // Match by Name (fallback)
            );
            
            if (accessUser) {
                if (accessUser.role === 'host' || accessUser.role === 'admin' || accessUser.isOwner) roleBadge = '(Host)';
                else if (accessUser.role === 'writer' || accessUser.role === 'viewer') roleBadge = '(Guest)';
            } else if (isMe && isProjectAuthor) {
                roleBadge = '(Host)';
            } else if (isMe) {
                 // Pending auth or guest
                 roleBadge = ''; 
            } else {
                roleBadge = '(Guest)'; // Default assumption for others if not in list
            }

            return {
                id: u.socketId || u.id,
                userId: u.userId,
                name: u.name || 'Anonymous',
                color: u.color || '#ccc',
                isVisible: u.isVisible !== false,
                isMe,
                roleBadge
            };
        })
        .filter(u => u.isMe || u.isVisible)
        .filter((user, index, self) => {
            // Deduplicate logic:
            
            // 1. Prefer deduplication by userId if available
            if (user.userId) {
                return index === self.findIndex(t => t.userId === user.userId);
            }

            // 2. If it's Me (and no userId on some record?), deduplicate by isMe flag
            if (user.isMe) {
                 return index === self.findIndex(t => t.isMe);
            }

            // 3. Fallback: deduplicate by name+color
            return index === self.findIndex((t) => (
                t.name === user.name && t.color === user.color
            ));
        });
    }, [connectedUsers, config.userProfile.name, roomAccessUsers, isProjectAuthor]);

    // Get access ID for a user to enable removal
    const getAccessIdForUser = (userName: string): string | null => {
        const user = roomAccessUsers.find(u => u.name === userName);
        return user?.id || null;
    };
    
    // With Live Mode (Socket), connectedUsers should be populated.
    if (!isConnected && (!connectedUsers || connectedUsers.length === 0)) return null;

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
                                const accessId = getAccessIdForUser(u.name);
                                const canRemove = isProjectAuthor && !u.isMe;
                                
                                return (
                                    <div key={u.id} className={`relative flex items-center justify-between text-xs p-1.5 rounded border border-gray-100 bg-gray-50 dark:bg-slate-800 dark:border-slate-700`}>
                                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                                            <div 
                                                className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0" 
                                                style={{ backgroundColor: u.color }}
                                            ></div>
                                            <span 
                                                className={`truncate ${u.isMe ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-300'}`} 
                                                title={u.name}
                                            >
                                                {u.name} {u.isMe ? '(You)' : ''} <span className="text-[9px] opacity-70 ml-1 font-normal">{u.roleBadge}</span>
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-1 ml-2">
                                            {u.isMe && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); toggleInvisible(); }}
                                                    className="ml-1 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none transition"
                                                    title={isInvisible ? "Unlock Visibility" : "Hide from list"}
                                                >
                                                    {isInvisible ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                            )}
                                            
                                            {canRemove && accessId && (
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setExpandedMenu(expandedMenu === u.id ? null : u.id);
                                                        }}
                                                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 focus:outline-none transition p-0.5"
                                                        title="User options"
                                                    >
                                                        <ChevronDown size={12} className={`transition-transform ${expandedMenu === u.id ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    
                                                    {expandedMenu === u.id && (
                                                        <div className="absolute right-0 mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded shadow-lg z-10">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onRemoveUser?.(accessId, u.name);
                                                                    setExpandedMenu(null);
                                                                }}
                                                                className="flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left transition"
                                                            >
                                                                <Trash2 size={12} />
                                                                {t('delete')}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
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