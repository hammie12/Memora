'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { Database } from '@/types/supabase'; // Assuming types are generated

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error logging out:', error);
      // Optionally show an error message to the user
    } else {
      // Redirect to home page after logout & refresh to clear state
      router.push('/');
      router.refresh(); 
    }
  };

  return (
    <button 
      onClick={handleLogout}
      // Style similarly to other action buttons, maybe a different color
      className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-bold text-black rounded-full group focus:ring-2 focus:outline-none shadow-md bg-gradient-to-br from-red-400 to-pink-500 focus:ring-red-200 dark:focus:ring-red-800 shadow-pink-500/50 dark:shadow-sm dark:shadow-pink-800/80"
    >
      <span className="relative px-5 py-1.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-full group-hover:bg-opacity-90">
        Logout
      </span>
    </button>
  );
} 