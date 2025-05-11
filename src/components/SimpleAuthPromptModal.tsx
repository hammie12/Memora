'use client';

import Link from 'next/link';

interface SimpleAuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SimpleAuthPromptModal({ isOpen, onClose }: SimpleAuthPromptModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={onClose} // Close on overlay click
    >
      <div
        className="relative w-full max-w-sm p-6 space-y-4 bg-white rounded-lg shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()} // Prevent closing inside the modal
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close modal"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white">
          Authentication Required
        </h3>
        <p className="text-center text-sm text-gray-600 dark:text-gray-300">
          It seems like you are not logged in! Please log in or sign up to upload a photo.
        </p>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 pt-2">
          <Link href="/login" legacyBehavior>
            <a
              onClick={onClose} // Close modal when navigating
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Login
            </a>
          </Link>
          <Link href="/signup" legacyBehavior>
            <a
              onClick={onClose} // Close modal when navigating
              className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
            >
              Sign Up
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
} 