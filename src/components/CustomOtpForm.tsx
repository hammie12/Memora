'use client';

import { useState, FormEvent } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Database } from '@/types/supabase'; // Assuming types are generated
// import { AuthOtpResponse } from '@supabase/supabase-js'; // Removed unused import

export default function CustomOtpForm() {
  const router = useRouter();
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email'); // 'email' or 'otp'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Step 1: Send OTP to email
  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const { data: _data, error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        // Set this to false if you don't want the user to be automatically signed up
        // if they don't exist yet. Setting to true combines signup/signin.
        shouldCreateUser: true, 
        // Optional: redirect user after successful verification if needed, 
        // but we handle redirect manually on success
        // emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      console.error('OTP Error:', error);
      setError(error.message);
    } else {
      setMessage('Check your email for the OTP code!');
      setStep('otp'); // Move to OTP entry step
    }
    setIsLoading(false);
  };

  // Step 2: Verify OTP
  const handleOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setMessage(null);

    const { data: { session }, error } = await supabase.auth.verifyOtp({
        email: email,
        token: otp,
        type: 'email', // or 'sms' if using phone
    });

    if (error) {
        console.error('Verify OTP Error:', error);
        setError(error.message);
    } else if (session) {
        // Successfully signed in / signed up
        setMessage('Success! Redirecting...');
        // Redirect to home page after successful verification
        router.push('/');
        router.refresh(); // Refresh layout to reflect logged-in state
    } else {
        // Should not happen if error is null and session is null, but handle defensively
        setError('Verification failed. Please try again.');
    }

    setIsLoading(false);
  };

  // Input styles matching app aesthetic
  const inputClasses = "w-full px-4 py-2 text-gray-900 dark:text-white bg-white/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500 dark:placeholder-gray-400";
  // Button styles matching app aesthetic (using brand colors)
  const buttonClasses = `w-full relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-bold text-black rounded-full group focus:ring-2 focus:outline-none shadow-md bg-gradient-to-br focus:ring-purple-200 dark:focus:ring-purple-800 shadow-purple-500/50 dark:shadow-sm dark:shadow-purple-800/80 ${isLoading ? 'opacity-50 cursor-not-allowed from-gray-400 to-gray-500' : 'from-purple-500 to-pink-500'}`;
  const buttonInnerSpanClasses = "w-full text-center relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-full group-hover:bg-opacity-90";

  return (
    <div className="w-full">
      {step === 'email' && (
        <form onSubmit={handleEmailSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className={inputClasses}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={buttonClasses}
            >
              <span className={buttonInnerSpanClasses}>
                {isLoading ? 'Sending...' : 'Send Code'}
              </span>
            </button>
          </div>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleOtpSubmit} className="space-y-6">
           <p className="text-sm text-center text-gray-600 dark:text-gray-300">
             Enter the code sent to <span className="font-medium text-gray-800 dark:text-white">{email}</span>.
           </p>
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Verification Code
            </label>
            <input
              id="otp"
              name="otp"
              type="text"
              inputMode="numeric" // Helps mobile keyboards
              autoComplete="one-time-code"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              disabled={isLoading}
              className={inputClasses}
              placeholder="123456"
              maxLength={6} // Standard OTP length
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={buttonClasses}
            >
              <span className={buttonInnerSpanClasses}>
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </span>
            </button>
          </div>

          {/* Option to go back and change email */}
           <div className="text-center">
            <button 
                type="button"
                onClick={() => { setStep('email'); setError(null); setMessage(null); setOtp(''); }}
                disabled={isLoading}
                className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
                Use a different email?
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