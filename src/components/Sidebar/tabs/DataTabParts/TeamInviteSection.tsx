import React from 'react';
import { Mail, Link as LinkIcon } from 'lucide-react';

interface TeamInviteSectionProps {
    t: (key: string) => string;
    isClientMode: boolean;
    isConnected: boolean;
    isRestoringSession: boolean;
    linkAllowEdit: boolean;
    setLinkAllowEdit: (val: boolean) => void;
    inviteEmail: string;
    setInviteEmail: (val: string) => void;
    handleInviteUser: () => void;
    isInviting: boolean;
    handleCopyMagicLink: () => void;
}

export const TeamInviteSection: React.FC<TeamInviteSectionProps> = ({
    t, isClientMode, isConnected, isRestoringSession, linkAllowEdit, setLinkAllowEdit,
    inviteEmail, setInviteEmail, handleInviteUser, isInviting, handleCopyMagicLink
}) => {
    if (isClientMode) return null;

    if (isRestoringSession) {
        return (
             <div className="flex flex-col gap-2 w-full mt-2 pt-2 border-t border-indigo-50 dark:border-indigo-900/50 animate-pulse">
                <div className="flex justify-between">
                    <div className="h-3 w-20 bg-gray-100 rounded dark:bg-slate-800"></div>
                    <div className="h-3 w-16 bg-gray-100 rounded dark:bg-slate-800"></div>
                </div>
                <div className="flex gap-2">
                    <div className="flex-1 h-8 bg-gray-100 rounded dark:bg-slate-800"></div>
                    <div className="w-16 h-8 bg-gray-100 rounded dark:bg-slate-800"></div>
                </div>
             </div>
        );
    }

    if (!isConnected) return null;

    return (
        <div className="flex flex-col gap-2 w-full mt-2 pt-2 border-t border-indigo-50 dark:border-indigo-900/50">
           <div className="flex items-center gap-1.5 justify-between">
                <label className="text-[10px] text-gray-500 font-bold dark:text-gray-400">{t('data.invite.title')}</label>
                <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 dark:bg-slate-800 dark:border-slate-700">
                     <input 
                        type="checkbox" 
                        id="allow-edit-chk"
                        checked={linkAllowEdit}
                        onChange={e => setLinkAllowEdit(e.target.checked)}
                        className="w-3 h-3 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300 dark:border-slate-600 dark:bg-slate-700" 
                     />
                     <label htmlFor="allow-edit-chk" className="text-[10px] text-gray-600 cursor-pointer font-medium select-none dark:text-gray-400">
                         {t('data.invite.allowEdit')}
                     </label>
                </div>
           </div>
            
           <div className="flex gap-2">
               <input 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={t('data.invite.placeholder')}
                  className="flex-1 text-xs p-1.5 border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-600 dark:text-gray-200"
               />
               <button 
                  onClick={handleInviteUser}
                  disabled={isInviting}
                  className="bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-indigo-700 flex items-center gap-1 disabled:opacity-50"
               >
                   <Mail size={12} /> {isInviting ? "..." : t('btn.share')}
               </button>
           </div>
            
            {/* Fallback Legacy Button */}
            <div 
                className={`text-[9px] text-center flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                    inviteEmail && inviteEmail.includes('@') 
                    ? "text-indigo-600 font-medium hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300" 
                    : "text-gray-400 hover:text-gray-500"
                }`} 
                onClick={handleCopyMagicLink}
            >
                <LinkIcon size={10} /> or copy magic link manually
            </div>
        </div>
    );
};
