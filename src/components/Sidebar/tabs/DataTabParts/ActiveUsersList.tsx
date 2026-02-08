import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    currentUserRole?: string; // Replaces isProjectAuthor for more granular control
    onRemoveUser?: (accessId: string, userName: string) => void; // Callback to remove user
    onLeaveRoom?: (accessId: string, userName: string) => void; // Callback for user to leave room
    onChangeUserRole?: (userId: string, role: string) => void;
    roomAccessUsers?: RoomAccessUser[]; // List of users with access to room
    currentUserId?: string | null;
    mySocketId?: string | null;
}

export const ActiveUsersList: React.FC<ActiveUsersListProps> = ({
    t, isConnected, connectedUsers, isUsersListOpen, setIsUsersListOpen, userProfile, isInvisible, toggleInvisible,
    currentUserRole, onRemoveUser, onLeaveRoom, onChangeUserRole, roomAccessUsers = [], currentUserId, mySocketId
}) => {
    
    // All hooks must be at the top, before any conditional returns
    const [contextMenuCtx, setContextMenuCtx] = useState<{
        u: typeof displayUsers[0];
        x: number;
        y: number;
        canRemove: boolean;
        canChangeRole: boolean;
        canLeave: boolean;
        accessId: string;
    } | null>(null);

    useEffect(() => {
        const handleClickOutside = () => setContextMenuCtx(null);
        if (contextMenuCtx) window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, [contextMenuCtx]);
    
    // Process Users List
    const displayUsers = useMemo(() => {
        // If empty (loading or no users), return empty
        if (!connectedUsers || connectedUsers.length === 0) return [];
        
        const myRole = (currentUserRole || '').toLowerCase();
        const isOwner = myRole === 'owner' || myRole === 'host';
        const isAdmin = myRole === 'admin';

        const myName = userProfile.name;
        
        return connectedUsers.map(u => {
            // Check if this user is me
            // Priority 1: Socket ID Match (Most Reliable for current session)
            // Priority 2: User ID Match (If authenticated)
            // Priority 3: Name Match (Legacy/Fallback)
            
            const myUserId = currentUserId || localStorage.getItem('my_user_id');
            const myName = userProfile.name;

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
                    roleBadge = t('role.host');
                    break;
                case UserRoleType.ADMIN:
                    roleBadge = 'Admin'; // Differentiate Admin from Host
                    break;
                case UserRoleType.EDITOR:
                case UserRoleType.RW:
                    roleBadge = t('role.editor');
                    break;
                case UserRoleType.VIEWER:
                case UserRoleType.R:
                    roleBadge = t('role.viewer');
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
                             roleBadge = t('role.host');
                             break;
                        case 'admin':
                             roleBadge = 'Admin';
                             break;
                        case 'editor':
                             roleBadge = t('role.editor');
                             break;
                        case 'viewer':
                             roleBadge = t('role.viewer');
                             break;
                     }
                }
            }

            // Priority 3: Fallback specific checks
            if (!roleBadge) {
                if (isMe && isOwner) { // check currentUserRole instead of isProjectAuthor
                     roleBadge = t('role.host');
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
    }, [connectedUsers, userProfile.name, roomAccessUsers, currentUserRole, currentUserId, mySocketId]);

    // Get access ID for a user to enable removal
    const getAccessIdForUser = (userName: string): string | null => {
        const user = roomAccessUsers?.find(u => u && u.name === userName);
        return user?.accessId || null;
    };
    
    // With Live Mode (Socket), connectedUsers should be populated.
    if (!isConnected && (!connectedUsers || connectedUsers.length === 0)) return null;

    return (
        <div className="mt-3 w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden transition-all">
            <button 
                onClick={() => setIsUsersListOpen(!isUsersListOpen)}
                className="w-full flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs font-bold text-slate-600 dark:text-slate-300 select-none"
            >
                <div className="flex items-center gap-2">
                    <span>{t('data.users.active')}</span>
                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md text-[10px] font-mono dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 h-5 flex items-center justify-center min-w-[20px]">
                        {displayUsers.length}
                    </span>
                </div>
                {isUsersListOpen ? <ChevronUp size={14} className="text-slate-400"/> : <ChevronDown size={14} className="text-slate-400"/>}
            </button>
            
            {isUsersListOpen && (
                <div className="p-2 pt-0 space-y-1.5 animate-slide-in bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700/50">
                    <div className="h-1"></div>
                        {displayUsers.length > 0 ? (
                            displayUsers.map(u => {
                                const accessId = u.accessUser ? u.accessUser.accessId : getAccessIdForUser(u.name);
                                
                                const myRole = (currentUserRole || '').toLowerCase();
                                const isOwner = myRole === 'owner' || myRole === 'host';
                                const isAdmin = myRole === 'admin';
                                
                                // Robust Target Role Resolution
                                // 1. Check direct socket role (authoritative for live presence)
                                // 2. Check access list role
                                // 3. Fallback to viewer
                                let targetRole = (u.role || u.accessUser?.role || 'viewer').toLowerCase();
                                if (targetRole === 'r') targetRole = 'viewer';
                                if (targetRole === 'rw') targetRole = 'editor';
                                
                                const isTargetOwner = targetRole === 'owner' || targetRole === 'host' || u.roleBadge === '(Host)' || u.roleBadge === t('role.host');
                                const isTargetAdmin = targetRole === 'admin' || u.roleBadge === 'Admin';
                                const isTargetMe = u.isMe || (currentUserId && u.userId === currentUserId);

                                // CAN REMOVE: 
                                // Owner can remove anyone (except themselves).
                                // Admin can remove Editors/Viewers/Admins (but NOT Owner).
                                const canRemove = !isTargetMe && !!accessId && (
                                    isOwner || 
                                    (isAdmin && !isTargetOwner)
                                );

                                // CAN CHANGE ROLE: 
                                // Owner can change all (except self).
                                // Admin can change others (except Owner).
                                const canChangeRole = !isTargetMe && !!u.accessUser?.userId && !!onChangeUserRole && (
                                    isOwner ||
                                    (isAdmin && !isTargetOwner)
                                );

                                // CAN LEAVE: Is target ME? Am I NOT the host (Host cannot leave, must delete room)? Do I have access ID?
                                const isHostBadge = u.roleBadge === '(Host)' || u.roleBadge === t('role.host');
                                const canLeave = isTargetMe && !isHostBadge && !!accessId;

                                // Show menu if we have access ID (meaning user is part of the room formally)
                                // We might show disabled options, but we want the menu to be renderable for status inspection.
                                const showMenu = !!accessId && (isOwner || isAdmin || isTargetMe || canLeave); 
                                
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
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setContextMenuCtx(contextMenuCtx?.u?.id === u.id ? null : {
                                                                u,
                                                                x: rect.right,
                                                                y: rect.bottom,
                                                                canRemove,
                                                                canChangeRole,
                                                                canLeave,
                                                                accessId
                                                            });
                                                        }}
                                                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 focus:outline-none transition p-0.5"
                                                        title="User options"
                                                    >
                                                        <ChevronDown size={12} className={`transition-transform ${contextMenuCtx?.u?.id === u.id ? 'rotate-180' : ''}`} />
                                                    </button>
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

            {contextMenuCtx && createPortal(
                <div 
                     style={{ 
                         top: contextMenuCtx.y, 
                         left: contextMenuCtx.x - 140, 
                         position: 'absolute'
                     }}
                     className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded shadow-lg z-[9999] min-w-[140px] py-1 animate-in fade-in zoom-in duration-200"
                >
                     {contextMenuCtx.u.accessUser && (
                        <>
                            <div className="px-3 py-1.5 text-[10px] text-gray-400 font-bold uppercase tracking-wider bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                                {t('Role') || 'Role'}
                            </div>
                            {['Viewer', 'Editor', 'Admin'].map(role => {
                                    const isCurrent = contextMenuCtx.u.accessUser?.role === role;
                                    const disabled = !contextMenuCtx.canChangeRole || isCurrent;
                                    
                                    return (
                                    <button
                                    key={role}
                                    onClick={(e) => {
                                            e.stopPropagation();
                                            if (!disabled) {
                                            onChangeUserRole?.(contextMenuCtx.u.accessUser!.userId!, role);
                                            setContextMenuCtx(null);
                                            }
                                    }}
                                    disabled={disabled}
                                    className={`flex items-center gap-2 px-3 py-1.5 text-xs w-full text-left transition
                                        ${isCurrent 
                                            ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10 font-bold cursor-default' 
                                            : disabled 
                                                ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                                : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-slate-800'}
                                    `}
                                    >
                                    <span className="flex-1">{role}</span>
                                    {isCurrent && <span className="text-[10px]">✓</span>}
                                    </button>
                                    );
                            })}
                            <div className="border-t border-gray-100 dark:border-slate-800 my-1"></div>
                        </>
                    )}

                    {contextMenuCtx.canRemove && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemoveUser?.(contextMenuCtx.accessId, contextMenuCtx.u.name);
                                setContextMenuCtx(null);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left transition border-b border-gray-100 dark:border-gray-800 last:border-0"
                        >
                            <Trash2 size={12} />
                            {t('delete')}
                        </button>
                    )}
                    {contextMenuCtx.canLeave && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onLeaveRoom?.(contextMenuCtx.accessId, contextMenuCtx.u.name);
                                setContextMenuCtx(null);
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-xs text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 w-full text-left transition"
                        >
                            <LogOut size={12} />
                            {t('Leave Room') || "Leave Room"}
                        </button>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};
