import React, { useState, useEffect } from 'react';
import { X, Trash2, Shield, User, Crown, AlertTriangle } from 'lucide-react';
import { RoomAccessUser } from '../../utils/types';

interface ManageAccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    projectName: string;
    users: RoomAccessUser[];
    currentUserId?: string | null;
    onRemoveUser: (accessId: string, userName: string) => void;
    onChangeRole: (accessId: string, newRole: string) => void;
    isOwner: boolean;
    t: (key: string) => string;
}

export const ManageAccessModal: React.FC<ManageAccessModalProps> = ({
    isOpen, onClose, projectId, projectName, users, currentUserId, onRemoveUser, onChangeRole, isOwner, t
}) => {
    if (!isOpen) return null;

    // Filter out users who are Owners if the current user is not an owner (unlikely scenario but safe)
    // Actually, usually only Owners can see this modal for full management.
    // If we are just a viewer, we probably shouldn't see this or only see a read-only list.

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[80vh]">
                
                {/* Header */}
                <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                             <Shield size={16} className="text-indigo-600 dark:text-indigo-400"/>
                             {t('Manage Access')}
                        </h3>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[250px]">
                            {projectName}
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                    {users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
                            <User size={24} className="opacity-20"/>
                            <span className="text-xs">{t('No other users have access')}</span>
                        </div>
                    ) : (
                        users.map((user) => {
                            const isMe = currentUserId && (user.userId === currentUserId || user.email === currentUserId); // Rough check
                            const isOtherOwner = user.role === 'owner';
                            
                            // Can I manage this user?
                            // Only if I'm owner and they are NOT me.
                            const canManage = isOwner && !isMe;

                            return (
                                <div key={user.accessId || user.email} className="flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-indigo-50 hover:bg-indigo-50/30 dark:hover:border-slate-700 dark:hover:bg-slate-800/50 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${user.role === 'owner' ? 'bg-amber-500' : 'bg-indigo-500'}`}>
                                            {user.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1">
                                                {user.name}
                                                {user.role === 'owner' && <Crown size={10} className="text-amber-500 fill-amber-500" />}
                                                {isMe && <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 rounded-full font-medium ml-1">You</span>}
                                            </div>
                                            <div className="text-[10px] text-gray-400 dark:text-gray-500">{user.email}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {canManage ? (
                                            <>
                                                {/* Role Switcher could go here */}
                                                <button 
                                                    onClick={() => onRemoveUser(user.accessId!, user.name)}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    title={t('Remove User')}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-[10px] font-medium text-gray-400 capitalize px-2 py-1 bg-gray-50 dark:bg-slate-800 rounded-md">
                                                {user.role}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
