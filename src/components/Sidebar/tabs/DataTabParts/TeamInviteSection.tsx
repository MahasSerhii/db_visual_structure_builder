import React from 'react';
import { Mail, Link as LinkIcon, Share2, Loader2 } from 'lucide-react';

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

                <div className="relative group">
                   <button 
                      onClick={handleInviteUser}
                      disabled={isInviting}
                      className="bg-indigo-600 text-white p-1.5 aspect-square rounded text-xs font-medium hover:bg-indigo-700 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={t('btn.share')}
                   >
                       {isInviting ? (
                           <Loader2 size={14} className="animate-spin" />
                       ) : (
                           <Share2 size={14} />
                       )}
                   </button>
                   
                   {/* Tooltip */}
                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-[10px] rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                       {t('btn.share')}
                       <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800"></div>
                   </div>
               </div>
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
                <LinkIcon size={10} /> {t('data.invite.manual')}
            </div>
        </div>
    );
};
