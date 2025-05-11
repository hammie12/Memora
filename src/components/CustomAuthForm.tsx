'use client';

import { useState, FormEvent } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Database } from '@/types/supabase';

// Define view types
type AuthView = 'sign_in' | 'sign_up' | 'verify_otp';

interface CustomAuthFormProps {
  initialView?: AuthView;
}

export default function CustomAuthForm({ initialView = 'sign_in' }: CustomAuthFormProps) {
  const router = useRouter();
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // For sign up
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // --- Sign Up Handler ---
  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      // options: { data: { custom_data: 'example' } } // Optional: Add custom data
    });

    if (error) {
      console.error('Sign Up Error:', error);
      setError(error.message);
    } else if (data.user && !data.session) {
       // User created but needs verification (OTP because Confirmation Email is OFF)
       setMessage('Account created! Check your email for the verification code.');
       setView('verify_otp'); // Move to OTP entry step
    } else if (data.user && data.session) {
        // User created AND logged in (might happen if auto-confirm is on, less likely)
        setMessage('Account created and logged in! Redirecting...');
        router.push('/');
        router.refresh();
    } else {
        setError('An unexpected error occurred during sign up.');
    }

    setIsLoading(false);
  };

  // --- Sign In Handler ---
  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });

    if (error) {
        console.error('Sign In Error:', error);
        setError(error.message);
    } else if (data.session) {
        // Successfully signed in
        setMessage('Signed in! Redirecting...');
        router.push('/');
        router.refresh();
    } else {
        setError('An unexpected error occurred during sign in.');
    }

    setIsLoading(false);
  };

  // --- Verify OTP Handler (for Sign Up Confirmation) ---
  const handleOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email || !otp) { // Ensure email is still available
        setError("An error occurred. Please try signing up again.");
        setView('sign_up');
        return;
    }
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const { data: { session }, error } = await supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: 'signup', // Critical: Use 'signup' type for verification
    });

    if (error) {
        console.error('Verify OTP Error:', error);
        setError(error.message);
    } else if (session) {
        // Successfully verified and signed in
        setMessage('Email verified! Redirecting...');
        router.push('/');
        router.refresh();
    } else {
        setError('Verification failed. Invalid code or expired.');
    }

    setIsLoading(false);
  };

  // --- Styles --- (Assume these match your app)
  const inputClasses = "w-full px-4 py-2 text-gray-900 dark:text-white bg-white/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500 dark:placeholder-gray-400";
  const buttonClasses = `w-full relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-bold text-black rounded-full group focus:ring-2 focus:outline-none shadow-md bg-gradient-to-br focus:ring-purple-200 dark:focus:ring-purple-800 shadow-purple-500/50 dark:shadow-sm dark:shadow-purple-800/80 ${isLoading ? 'opacity-50 cursor-not-allowed from-gray-400 to-gray-500' : 'from-purple-500 to-pink-500'}`;
  const buttonInnerSpanClasses = "w-full text-center relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-full group-hover:bg-opacity-90";

  return (
    <div className="w-full">
      {/* --- Sign In View --- */}
      {view === 'sign_in' && (
        <form onSubmit={handleSignIn} className="space-y-6">
          <div>
            <label htmlFor="email-signin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input id="email-signin" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} className={inputClasses} placeholder="you@example.com" />
          </div>
          <div>
             <label htmlFor="password-signin" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input id="password-signin" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} className={inputClasses} placeholder="••••••••" />
          </div>
          <div>
            <button type="submit" disabled={isLoading} className={buttonClasses}>
              <span className={buttonInnerSpanClasses}>{isLoading ? 'Signing In...' : 'Sign In'}</span>
            </button>
          </div>
          <div className="text-center">
            <button type="button" onClick={() => setView('sign_up')} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
              Don&apos;t have an account? Sign Up
            </button>
          </div>
        </form>
      )}

      {/* --- Sign Up View --- */}
      {view === 'sign_up' && (
        <form onSubmit={handleSignUp} className="space-y-6">
           <div>
            <label htmlFor="email-signup" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input id="email-signup" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} className={inputClasses} placeholder="you@example.com" />
          </div>
           <div>
             <label htmlFor="password-signup" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input id="password-signup" name="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} className={inputClasses} placeholder="Create a password" />
          </div>
           <div>
             <label htmlFor="confirm-password-signup" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
            <input id="confirm-password-signup" name="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoading} className={inputClasses} placeholder="Confirm your password" />
          </div>
          <div>
            <button type="submit" disabled={isLoading} className={buttonClasses}>
              <span className={buttonInnerSpanClasses}>{isLoading ? 'Signing Up...' : 'Sign Up'}</span>
            </button>
          </div>
          <div className="text-center">
            <button type="button" onClick={() => setView('sign_in')} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
              Already have an account? Sign In
            </button>
          </div>
        </form>
      )}

      {/* --- Verify OTP View --- */}
      {view === 'verify_otp' && (
        <form onSubmit={handleOtpSubmit} className="space-y-6">
           <p className="text-sm text-center text-gray-600 dark:text-gray-300">
             Enter the verification code sent to <span className="font-medium text-gray-800 dark:text-white">{email}</span>.
           </p>
          <div>
            <label htmlFor="otp-verify" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Verification Code</label>
            <input id="otp-verify" name="otp" type="text" inputMode="numeric" required value={otp} onChange={(e) => setOtp(e.target.value)} disabled={isLoading} className={inputClasses} placeholder="123456" maxLength={6} />
          </div>
          <div>
            <button type="submit" disabled={isLoading} className={buttonClasses}>
              <span className={buttonInnerSpanClasses}>{isLoading ? 'Verifying...' : 'Verify Email'}</span>
            </button>
          </div>
           <div className="text-center">
             <button type="button" onClick={() => { setView('sign_up'); setError(null); setMessage(null); setPassword(''); setConfirmPassword(''); setOtp(''); }} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
                 Entered wrong email? Sign Up again
             </button>
           </div>
        </form>
      )}

      {/* Error and Message Display */}
      {error && (
        <p className="mt-4 text-center text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {message && (
        <p className="mt-4 text-center text-sm text-green-600 dark:text-green-400">{message}</p>
      )}
    </div>
  );
} 