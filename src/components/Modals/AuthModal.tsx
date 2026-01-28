import React, { useState, useEffect } from 'react';
import { X, Lock, UserPlus, LogIn, Globe, Eye, EyeOff } from 'lucide-react';
// Firebase imports removed


export type AuthMode = 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD' | 'FORGOT_PASSWORD';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialState: AuthMode;
    initialEmail?: string;
    onSuccess: (token: string, userEmail: string, userName: string, projects: any[], userProfile?: any) => void;
    inviteToken?: string;
    resetToken?: string;
}

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api') + '/auth';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialState, initialEmail, onSuccess, inviteToken, resetToken }) => {
    // Determine effective initial email
    // Prioritize props, but if we have resetToken, we need to extract email or let server validation handle it.
    // Actually, we can decode the resetToken on the client to prefill the email if it's JWT.
    
    const resolveInitialEmail = () => {
        if (initialEmail) return initialEmail;
        if (resetToken) {
            try {
                const part = resetToken.split('.')[1];
                if(part) {
                    const payload = JSON.parse(atob(part));
                    return payload.email || '';
                }
            } catch(e) {}
        }
        return '';
    };

    const [mode, setMode] = useState<AuthMode>(initialState);
    const [email, setEmail] = useState(resolveInitialEmail());
    const [password, setPassword] = useState('');
    const [repeatPassword, setRepeatPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showRepeatPassword, setShowRepeatPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Initial Auto-Init Check using .env - REMOVED

    // Config bootstrapping for Social Login (Legacy)
    const [showConfigInput, setShowConfigInput] = useState(false);
    const [tempConfig, setTempConfig] = useState('');

    useEffect(() => {
        setMode(initialState);
        // If initialEmail is provided (e.g. from invite link), force it
        // If not, and we have resetToken, try to decode it again
        const em = resolveInitialEmail();
        if(em) setEmail(em);
    }, [initialState, initialEmail, isOpen, resetToken]);

    useEffect(() => {
        setError(null);
        setSuccessMsg(null);
    }, [mode]);

    if (!isOpen) return null;

    const handleSocialLogin = async (provider: 'google' | 'apple') => {
        setError("Social login is currently disabled.");
    };


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMsg(null);
        setIsLoading(true);

        try {
            if (mode === 'REGISTER') {
                if (password !== repeatPassword) {
                    throw new Error("Passwords do not match");
                }
                if (password.length < 6) {
                    throw new Error("Password must be at least 6 characters");
                }
                
                const res = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, inviteToken, password })
                });
                
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Registration failed');
                
                if (data.success && !data.token) {
                    setSuccessMsg(data.message || "Check your email for instructions.");
                    return;
                }

                onSuccess(data.token, data.user.email, data.user.name, data.projects, data.user);
            } else if (mode === 'LOGIN') {
                const res = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, inviteToken, rememberMe })
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Login failed');
                
                onSuccess(data.token, data.user.email, data.user.name, data.projects, data.user);
            } else if (mode === 'FORGOT_PASSWORD') {
                const res = await fetch(`${API_URL}/request-reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, origin: window.location.origin + window.location.pathname })
                });
                const data = await res.json();
                 if (!res.ok) throw new Error(data.error || 'Request failed');
                 setSuccessMsg("If this email exists, a reset link has been sent.");
            } else if (mode === 'RESET_PASSWORD') {
                if (password !== repeatPassword) throw new Error("Passwords do not match");
                
                const res = await fetch(`${API_URL}/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: resetToken, newPassword: password })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Reset failed');
                
                setSuccessMsg("Password reset! You can now login.");
                
                // Auto-fill email for next step if available (it should be)
                // But wait, resetToken has the email, so 'email' state is technically already set/available?
                // The 'email' state might be hidden in RESET_PASSWORD mode if we didn't show input. 
                // Wait, in RESET_PASSWORD UI we don't show email input.
                // But we used 'resolveInitialEmail' to init the state.
                
                // Decode token to get email for login
                let userEmail = '';
                try {
                    const payload = JSON.parse(atob(resetToken!.split('.')[1]));
                    userEmail = payload.email;
                } catch(e) {}
                
                setTimeout(() => {
                    setMode('LOGIN');
                    if (userEmail) setEmail(userEmail); // Ensure it's carried over
                    
                    // Auto-Login after reset?
                    // We need user password for token? No, we just set it. 
                    // Technically we could ask backend to return a token on reset-password success.
                    // But for security, usually we ask to login.
                    // Let's just switch to Login.
                }, 1500);
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    };

    const getTitle = () => {
        switch(mode) {
            case 'REGISTER': return inviteToken ? 'Set Password' : 'Create Account';
            case 'LOGIN': return 'Login';
            case 'FORGOT_PASSWORD': return 'Reset Password';
            case 'RESET_PASSWORD': return 'New Password';
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 z-50 flex items-center justify-center animate-fade-in backdrop-blur-sm">
            <div className="bg-white rounded-xl border border-gray-200 w-full max-w-sm shadow-2xl overflow-hidden relative animate-scale-in">
                <div className="p-6 pb-0">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                             <LogIn className="text-indigo-600"/> {getTitle()}
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded border border-red-100">
                            {error}
                        </div>
                    )}
                    {successMsg && (
                        <div className="mb-4 p-3 bg-green-50 text-green-600 text-xs rounded border border-green-100">
                            {successMsg}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode !== 'RESET_PASSWORD' && (
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                disabled={!!inviteToken}
                                className="w-full text-sm p-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50 disabled:text-gray-500"
                                required
                            />
                        </div>
                        )}

                        {mode !== 'FORGOT_PASSWORD' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                    {mode === 'RESET_PASSWORD' ? "New Password" : "Password"}
                                </label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="w-full text-sm p-2.5 pr-10 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        required
                                        autoComplete={mode === 'LOGIN' ? 'current-password' : 'new-password'}
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            {(mode === 'REGISTER' || mode === 'RESET_PASSWORD') && (
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Repeat Password</label>
                                <div className="relative">
                                    <input 
                                        type={showRepeatPassword ? "text" : "password"}
                                        value={repeatPassword}
                                        onChange={e => setRepeatPassword(e.target.value)}
                                        className="w-full text-sm p-2.5 pr-10 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        required
                                        autoComplete="new-password"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                    >
                                        {showRepeatPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            )}

                             {/* LOGIN Options */}
                             {mode === 'LOGIN' && (
                                <div className="flex justify-between items-center text-xs mt-2">
                                    <label className="flex items-center text-gray-600 gap-2 cursor-pointer select-none">
                                        <input 
                                            type="checkbox" 
                                            checked={rememberMe}
                                            onChange={e => setRememberMe(e.target.checked)}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        Remember me
                                    </label>
                                </div>
                            )}
                        </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition shadow-md disabled:opacity-70"
                        >
                            {isLoading ? 'Processing...' : (
                                mode === 'REGISTER' ? 'Create Account' : 
                                mode === 'LOGIN' ? 'Sign In' : 
                                mode === 'FORGOT_PASSWORD' ? 'Send Reset Link' : 'Save Password'
                            )}
                        </button>
                    </form>

                    {/* Footer Links with Consistent Height */}
                    <div className="mt-4 flex flex-col gap-2 items-center text-sm min-h-[40px]">
                        {mode === 'LOGIN' && (
                            <>
                                <button onClick={() => setMode('FORGOT_PASSWORD')} className="text-xs text-indigo-500 hover:text-indigo-700 underline">
                                    Forgot password?
                                </button>
                                <div className="text-gray-500 text-xs mt-2">
                                    Don't have an account? <button type="button" onClick={() => setMode('REGISTER')} className="text-indigo-600 font-bold hover:underline">Register</button>
                                </div>
                            </>
                        )}
                        {mode === 'REGISTER' && (
                             <div className="text-gray-500 text-xs mt-2">
                                Already have an account? <button type="button" onClick={() => setMode('LOGIN')} className="text-indigo-600 font-bold hover:underline">Sign In</button>
                            </div>
                        )}
                        {mode === 'FORGOT_PASSWORD' && (
                             <div className="text-center mt-3">
                                <button type="button" onClick={() => setMode('LOGIN')} className="text-xs text-indigo-500 hover:text-indigo-700 underline">
                                    Back to Login
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Config Input Overlay for Social Login Bootstrapping */}
                </div>
                <div className="p-4 bg-gray-50 text-center text-xs text-gray-500 mt-6 border-t border-gray-100">
                     Visual DB Viewer Secure Access
                </div>
            </div>
        </div>
    );
};
