import React, { useState } from 'react';
import { User } from '../types';
import { login, signup, googleLogin, loginGuest } from '../services/authService';
import { ArrowRight, Loader2, Sparkles, Mail } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
}

type AuthMode = 'welcome' | 'login' | 'signup';

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(null);
      try {
          const user = await login(email, password);
          onAuthSuccess(user);
      } catch (err) {
          setError(err instanceof Error ? err.message : "Login failed");
      } finally {
          setLoading(false);
      }
  };

  const handleSignup = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError(null);
      try {
          const user = await signup(email, password);
          onAuthSuccess(user);
      } catch (err) {
          setError(err instanceof Error ? err.message : "Signup failed");
      } finally {
          setLoading(false);
      }
  };

  const handleGoogleLogin = async () => {
      setLoading(true);
      try {
          const user = await googleLogin();
          onAuthSuccess(user);
      } catch (err) {
          setError("Google Login failed");
      } finally {
          setLoading(false);
      }
  };

  const handleGuest = () => {
      const user = loginGuest();
      onAuthSuccess(user);
  };

  const renderLogo = () => (
      <div className="flex flex-col items-center mb-10 animate-enter">
          <div className="relative w-32 h-20 flex items-center justify-center mb-6">
               <svg viewBox="0 0 50 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full drop-shadow-xl">
                    <path d="M2 12 V 5 Q 2 2 5 2 H 12" stroke="#FF9F1C" strokeWidth="2" strokeLinecap="round" />
                    <path d="M38 2 H 45 Q 48 2 48 5 V 12" stroke="#2955D9" strokeWidth="2" strokeLinecap="round" />
                    <path d="M48 18 V 25 Q 48 28 45 28 H 38" stroke="#D7263D" strokeWidth="2" strokeLinecap="round" />
                    <path d="M12 28 H 5 Q 2 28 2 25 V 18" stroke="#6BA292" strokeWidth="2" strokeLinecap="round" />
               </svg>
               <span className="font-bold text-3xl tracking-tighter text-stone-900 z-10 pt-1">3x5</span>
          </div>
          <p className="text-[10px] font-medium tracking-[0.2em] text-[#A0A0A0] uppercase">Stories begin here.</p>
      </div>
  );

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-cinematic p-8 md:p-12 transition-all duration-500">
            {renderLogo()}

            {/* FIX: Single-step welcome screen - decision point only, no forms */}
            {mode === 'welcome' && (
                <div className="flex flex-col gap-4 animate-enter" style={{ animationDelay: '0.1s' }}>
                    <button
                        onClick={() => setMode('login')}
                        className="w-full py-3 bg-stone-900 text-white rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-black transition-all hover:scale-[1.02] shadow-md"
                    >
                        Log In
                    </button>
                    <button
                        onClick={() => setMode('signup')}
                        className="w-full py-3 bg-white border border-stone-200 text-stone-900 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-stone-50 transition-all hover:border-stone-300"
                    >
                        Sign Up
                    </button>

                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-stone-100"></span>
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase">
                            <span className="bg-white px-2 text-stone-400">Or</span>
                        </div>
                    </div>

                    <button
                        onClick={handleGuest}
                        className="w-full py-3 text-stone-500 rounded-lg font-medium text-sm hover:text-stone-900 hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
                    >
                        Continue as Guest <ArrowRight size={14} />
                    </button>
                </div>
            )}

            {/* UX: Single-step login/signup forms - no intermediate confirmation screens */}
            {(mode === 'login' || mode === 'signup') && (
                <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="flex flex-col gap-4 animate-enter">

                    {/* UX: Clear heading to reinforce current step */}
                    <div className="mb-2 -mt-2">
                        <h2 className="text-lg font-medium text-stone-900 tracking-tight">
                            {mode === 'login' ? 'Welcome back' : 'Create your account'}
                        </h2>
                        <p className="text-xs text-stone-500 mt-1">
                            {mode === 'login'
                                ? 'Enter your credentials to continue'
                                : 'Get started with your storytelling journey'}
                        </p>
                    </div>

                    {error && <div className="text-red-500 text-xs text-center bg-red-50 p-2 rounded border border-red-100">{error}</div>}

                    <div className="space-y-4">
                        <input
                            type="email"
                            placeholder="Email address"
                            required
                            autoFocus
                            className="w-full px-4 py-3 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-400 text-sm placeholder-stone-400 transition-colors"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            required
                            className="w-full px-4 py-3 rounded-lg bg-stone-50 border border-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-400 text-sm placeholder-stone-400 transition-colors"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {/* UX: Primary action button with clear call-to-action */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-amber-500 text-white rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-amber-600 transition-all hover:scale-[1.02] shadow-md disabled:opacity-70 flex items-center justify-center gap-2 mt-2"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : (mode === 'login' ? 'Continue' : 'Create Account')}
                    </button>

                    {/* UX: Google login as secondary option within same step */}
                    <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-stone-100"></span>
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase">
                            <span className="bg-white px-2 text-stone-400">Or</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full py-3 bg-white border border-stone-200 text-stone-600 rounded-lg font-bold text-xs hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
                    >
                         <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/></svg>
                         {mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}
                    </button>

                    {/* UX: Switch between login/signup without going back to welcome */}
                    <div className="text-center mt-4">
                        <button
                            type="button"
                            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null); }}
                            className="text-xs text-stone-500 hover:text-stone-900 transition-colors"
                        >
                            {mode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
                        </button>
                    </div>

                     {/* UX: Clear back action to return to welcome */}
                     <div className="text-center">
                        <button
                            type="button"
                            onClick={() => { setMode('welcome'); setError(null); setEmail(''); setPassword(''); }}
                            className="text-[10px] text-stone-400 hover:text-stone-600 uppercase font-bold tracking-widest mt-2"
                        >
                            Back
                        </button>
                    </div>
                </form>
            )}
        </div>
        
        <div className="fixed bottom-4 text-[10px] text-stone-400 font-medium">
            &copy; {new Date().getFullYear()} 3x5 App. All rights reserved.
        </div>
    </div>
  );
};

export default AuthScreen;