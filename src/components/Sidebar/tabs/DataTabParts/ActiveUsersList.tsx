import React, { useMemo, useState } from 'react';
import { UserProfile, UserRoleType, ActiveSessionUser, RoomAccessUser } from '../../../../utils/types';
import { ChevronUp, ChevronDown, Eye, EyeOff, Trash2, LogOut } from 'lucide-react';

interface ActiveUsersListProps {
    t: (key: string) => string;
    isConnected: boolean;
    connectedUsers: ActiveSessionUser[];
    isClientMode: boolean; // Keep for interface compat, but less relevant now
    isUsersListOpen: boolean;
    setIsUsersListOpen: (val: boolean) => void;
    isLiveMode: boolean;
    isInvisible: boolean; 
    toggleInvisible: () => void;
    userProfile: UserProfile;
    isRestoringSession?: boolean;
    isProjectAuthor?: boolean; // Is current user the project author
    onRemoveUser?: (accessId: string, userName: string) => void; // Callback to remove user
    onLeaveRoom?: (accessId: string, userName: string) => void; // Callback for user to leave room
    roomAccessUsers?: RoomAccessUser[]; // List of users with access to room
    currentUserId?: string | null;
    mySocketId?: string | null;
}

export const ActiveUsersList: React.FC<ActiveUsersListProps> = ({
    t, isConnected, connectedUsers, isUsersListOpen, setIsUsersListOpen, userProfile, isInvisible, toggleInvisible,
    isProjectAuthor = false, onRemoveUser, onLeaveRoom, roomAccessUsers = [], currentUserId, mySocketId
}) => {
    
    // All hooks must be at the top, before any conditional returns
    const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
    
    // Process Users List
    const displayUsers = useMemo(() => {
        // If empty (loading or no users), return empty
        if (!connectedUsers || connectedUsers.length === 0) return [];

        const myUserId = currentUserId || localStorage.getItem('my_user_id');
        const myName = userProfile.name;
        
        return connectedUsers.map(u => {
            // Check if this user is me
            // Priority 1: Socket ID Match (Most Reliable for current session)
            // Priority 2: User ID Match (If authenticated)
            // Priority 3: Name Match (Legacy/Fallback)
            
            const isMe = (mySocketId && u.socketId === mySocketId) ||
                         (myUserId && u.userId && u.userId.toString() === myUserId.toString()) || 
                         (!u.userId && u.name === myName);
            
            // Determine Role Badge
            let roleBadge = '';
            
            // Helper to normalize and map role
            // Priority 1: Use Role directly from Socket/Session (Backend Enriched)
            const rawRole = u.role ? u.role.toLowerCase() : '';
            
            switch (rawRole) {
                case UserRoleType.HOST:
                case UserRoleType.OWNER:
                case UserRoleType.ADMIN:
                    roleBadge = '(Host)';
                    break;
                case UserRoleType.EDITOR:
                case UserRoleType.RW:
                    roleBadge = '(Editor)';
                    break;
                case UserRoleType.VIEWER:
                case UserRoleType.R:
                    roleBadge = '(Viewer)';
                    break;
                default:
                    // If no direct role from socket (or it's 'guest'), check fallbacks
                    break;
            }
            
            // Priority 2: Fallback to Access List matching (if socket info missing or guest)
            if (!roleBadge) {
                const accessUser = roomAccessUsers?.find(au => 
                    (au && au.userId === u.userId) || 
                    (au && au.name === u.name)
                );
                
                if (accessUser && accessUser.role) {
                     const fallbackRole = accessUser.role.toLowerCase();
                     switch (fallbackRole) {
                        case 'host':
                        case 'admin':
                             roleBadge = '(Host)';
                             break;
                        case 'editor':
                             roleBadge = '(Editor)';
                             break;
                        case 'viewer':
                             roleBadge = '(Viewer)';
                             break;
                     }
                }
            }

            // Priority 3: Fallback specific checks
            if (!roleBadge) {
                if (isMe && isProjectAuthor) {
                     roleBadge = '(Host)';
                } else if (!u.userId) { // No User ID means not logged in 
                    roleBadge = '(Guest)'; // Explicitly guest
                } else {
                     // Logged in but no role found? 
                     // It means "Guest" (Authenticated but no access role granted in this project context?)
                     // Or maybe they are just a "Viewer" by default?
                     // Usually Authenticated user without explicit permission shouldn't be here if private
                     // But if public, they are just viewers/guests.
                     roleBadge = '(Guest)';
                }
            }
            
            // Re-find accessUser if not already found in Priority 2 block above,
            // to pass it down for menu actions
            const linkedAccessUser = roomAccessUsers?.find(au => 
                (au && au.userId === u.userId) || 
                (au && au.name === u.name)
            );

            return {
                id: (u.socketId || u.id) as string,
                userId: u.userId,
                name: u.name || 'Anonymous',
                color: u.color || '#ccc',
                // FIX: Ensure visibility logic matches:
                // 1. If user.isVisible is explicit false -> invisible
                // 2. If it is ME, I always see myself in the list regardless of isVisible flag (so I can toggle it back)
                // 3. BUT logic below filters: .filter(u => u.isMe || u.isVisible)
                // This seems correct for list display.
                isVisible: u.isVisible !== false,
                isMe,
                roleBadge,
                accessUser: linkedAccessUser // Pass access record if found
            };
        })
        .filter(u => u.isMe || u.isVisible)
        .filter((user, index, self) => {
            // Deduplicate logic:

            // 1. Priority: Deduplicate by User ID (Merge multiple tabs of same logged-in user)
            if (user.userId) {
                return index === self.findIndex(t => t.userId === user.userId);
            }

            // 2. Priority: Deduplicate "Me" (Merge multiple My Guest tabs)
            if (user.isMe) {
                 return index === self.findIndex(t => t.isMe);
            }

            // 3. Fallback: deduplicate by name+color
            return index === self.findIndex((t) => (
                t.name === user.name && t.color === user.color
            ));
        });
    }, [connectedUsers, userProfile.name, roomAccessUsers, isProjectAuthor, currentUserId, mySocketId]);

    // Get access ID for a user to enable removal
    const getAccessIdForUser = (userName: string): string | null => {
        const user = roomAccessUsers?.find(u => u && u.name === userName);
        return user?.accessId || null;
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
                                const accessId = u.accessUser ? u.accessUser.accessId : getAccessIdForUser(u.name);
                                
                                // CAN REMOVE: Am I author? Is target NOT me? Do we have access ID?
                                const canRemove = isProjectAuthor && !u.isMe && !!accessId;

                                // CAN LEAVE: Is target ME? Am I NOT the host (Host cannot leave, must delete room)? Do I have access ID?
                                const isHost = u.roleBadge === '(Host)';
                                const canLeave = u.isMe && !isHost && !!accessId;

                                const showMenu = (canRemove || canLeave);
                                
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
                                                    {isInvisible ? <EyeOff size={14} className="text-orange-400" /> : <Eye size={14} />}
                                                </button>
                                            )}
                                            
                                            {showMenu && accessId && (
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setExpandedMenu(expandedMenu === u.id ? null : u.id as string);
                                                        }}
                                                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 focus:outline-none transition p-0.5"
                                                        title="User options"
                                                    >
                                                        <ChevronDown size={12} className={`transition-transform ${expandedMenu === u.id ? 'rotate-180' : ''}`} />
                                                    </button>
                                                    
                                                    {expandedMenu === u.id && (
                                                        <div className="absolute right-0 mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded shadow-lg z-10 min-w-[120px]">
                                                            {canRemove && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onRemoveUser?.(accessId, u.name);
                                                                        setExpandedMenu(null);
                                                                    }}
                                                                    className="flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left transition border-b border-gray-100 dark:border-gray-800 last:border-0"
                                                                >
                                                                    <Trash2 size={12} />
                                                                    {t('delete')}
                                                                </button>
                                                            )}
                                                            {canLeave && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onLeaveRoom?.(accessId, u.name);
                                                                        setExpandedMenu(null);
                                                                    }}
                                                                    className="flex items-center gap-2 px-3 py-2 text-xs text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 w-full text-left transition"
                                                                >
                                                                    <LogOut size={12} />
                                                                    {t('Leave Room') || "Leave Room"}
                                                                </button>
                                                            )}
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
