import React from 'react';
import { Mail, Link as LinkIcon, Share2, Loader2, Users, Copy } from 'lucide-react';

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
             <div className="flex flex-col gap-2 w-full mt-3 p-4 bg-white/50 border border-slate-200 rounded-xl dark:bg-slate-800/50 dark:border-slate-700 animate-pulse">
                <div className="flex justify-between">
                    <div className="h-4 w-24 bg-slate-200 rounded dark:bg-slate-700"></div>
                    <div className="h-4 w-16 bg-slate-200 rounded dark:bg-slate-700"></div>
                </div>
                <div className="flex gap-2 mt-2">
                    <div className="flex-1 h-9 bg-slate-200 rounded dark:bg-slate-700"></div>
                    <div className="w-9 h-9 bg-slate-200 rounded dark:bg-slate-700"></div>
                </div>
             </div>
        );
    }

    if (!isConnected) return null;

    return (
        <div className="w-full bg-gradient-to-br from-indigo-50/50 to-white dark:from-slate-800/50 dark:to-slate-900 border border-indigo-100 dark:border-slate-700 rounded-xl p-4 mt-3 shadow-sm transition-all hover:shadow-md">
           <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-100 dark:bg-indigo-900/50 p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400">
                        <Users size={14} />
                    </div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wide">{t('data.invite.title')}</label>
                </div>
                
                <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                     <input 
                        type="checkbox" 
                        id="allow-edit-chk"
                        checked={linkAllowEdit}
                        onChange={e => setLinkAllowEdit(e.target.checked)}
                        className="w-3.5 h-3.5 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300 dark:border-slate-600 dark:bg-slate-800 cursor-pointer" 
                     />
                     <label htmlFor="allow-edit-chk" className="text-[10px] font-semibold text-slate-600 cursor-pointer select-none dark:text-slate-400">
                         {t('data.invite.allowEdit')}
                     </label>
                </div>
           </div>
            
           <div className="flex gap-2">
               <input 
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder={t('data.invite.placeholder')}
                  className="flex-1 text-xs px-3 py-2.5 bg-white border border-indigo-100 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm dark:bg-slate-900 dark:text-slate-200 dark:placeholder-slate-500"
               />

               {/* Share Button */}
                <div className="relative group">
                   <button 
                      onClick={handleInviteUser}
                      disabled={isInviting}
                      className="bg-white text-indigo-600 border border-indigo-200 w-[38px] h-[38px] rounded-lg text-xs font-medium hover:bg-indigo-50 active:scale-95 flex items-center justify-center transition-all shadow-sm dark:bg-slate-800 dark:border-slate-600 dark:text-indigo-400 dark:hover:bg-slate-700 mr-0"
                      aria-label={t('btn.share')}
                   >
                       {isInviting ? (
                           <Loader2 size={16} className="animate-spin" />
                       ) : (
                           <Share2 size={16} />
                       )}
                   </button>
                   
                   {/* Tooltip */}
                   <div className="absolute bottom-full right-0 mb-2 px-2 py-1.5 bg-slate-800 text-white text-[10px] font-medium rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 transform translate-y-1 group-hover:translate-y-0">
                       {t('btn.share')}
                       <div className="absolute top-full right-3 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                   </div>
               </div>

                {/* Copy Link Button (Small) */}
               <div className="relative group">
                    <button 
                        className="bg-white text-indigo-600 border border-indigo-200 w-[38px] h-[38px] rounded-lg text-xs font-medium hover:bg-indigo-50 active:scale-95 flex items-center justify-center transition-all shadow-sm dark:bg-slate-800 dark:border-slate-600 dark:text-indigo-400 dark:hover:bg-slate-700 mr-1"
                        onClick={handleCopyMagicLink}
                        aria-label={t('data.invite.manual')}
                    >
                        <Copy size={16} /> 
                    </button>
                     {/* Tooltip */}
                   <div className="absolute bottom-full right-0 mb-2 px-2 py-1.5 bg-slate-800 text-white text-[10px] font-medium rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 transform translate-y-1 group-hover:translate-y-0">
                       {t('data.invite.manual')}
                       <div className="absolute top-full right-3 -mt-1 border-4 border-transparent border-t-slate-800"></div>
                   </div>
               </div>
           </div>
        </div>
    );
};
