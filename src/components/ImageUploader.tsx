'use client';

import React, { useState, useRef, ChangeEvent, useCallback, useEffect } from 'react';
import Image from 'next/image'; // Restore original import
import Link from 'next/link'; // Import Link for the tooltip buttons
// import NextImage from 'next/image'; // Remove this

// Remove the cast
// const Image = NextImage as React.FC<React.ComponentProps<typeof NextImage>>;

interface ImageUploaderProps {
  onFileSelect: (file: File | null) => void;
  isLoggedIn: boolean; // Add prop for auth status
}

// Define as a standard function component
function ImageUploader({ onFileSelect, isLoggedIn }: ImageUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAuthTooltip, setShowAuthTooltip] = useState(false); // State for tooltip
  const buttonRef = useRef<HTMLButtonElement>(null); // Ref for the button
  const tooltipRef = useRef<HTMLDivElement>(null); // Ref for the tooltip div

  // Hide tooltip if user becomes logged in
  useEffect(() => {
    if (isLoggedIn) {
      setShowAuthTooltip(false);
    }
  }, [isLoggedIn]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      onFileSelect(file); // Notify parent component

      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreviewUrl(null);
      onFileSelect(null); // Notify parent component
    }
  };

  const handleButtonClick = () => {
    if (!isLoggedIn) {
      setShowAuthTooltip(true); // Show the tooltip directly
      // Auto-hide after a delay (optional)
      // setTimeout(() => setShowAuthTooltip(false), 5000);
      return; 
    }
    // Clear selection if changing photo while logged in
    if (selectedFile) {
        setSelectedFile(null);
        setPreviewUrl(null);
        onFileSelect(null);
        // Reset file input value to allow re-uploading the same file
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }
    fileInputRef.current?.click();
  };

  // Close tooltip when clicking outside (simplified)
  // Note: This basic version might close even when clicking links inside.
  // More robust handling might involve checking e.target.
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside both button and tooltip
      if (
        buttonRef.current && !buttonRef.current.contains(event.target as Node) &&
        tooltipRef.current && !tooltipRef.current.contains(event.target as Node)
      ) {
        setShowAuthTooltip(false);
      }
    };

    if (showAuthTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAuthTooltip]);

  return (
    <div className="relative flex flex-col items-center space-y-4 w-full max-w-sm">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp" // Accept common image types
        className="hidden"
      />

      {/* Styled Upload Button - Add relative positioning context */}
      <div className="relative">
        <button
          ref={buttonRef} // Attach ref
          onClick={handleButtonClick}
          className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-lg font-bold text-black rounded-full group bg-gradient-to-br from-purple-400 to-pink-400 focus:ring-4 focus:outline-none focus:ring-purple-200 dark:focus:ring-pink-800 shadow-lg shadow-purple-500/50 dark:shadow-lg dark:shadow-pink-800/80"
        >
          <span className="relative px-8 py-3 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-full group-hover:bg-opacity-90">
            {selectedFile ? 'Change Photo' : 'Upload Photo'}
          </span>
        </button>

        {/* Auth Tooltip (Speech Bubble) */}
        {showAuthTooltip && (
          <div 
            ref={tooltipRef} // Attach ref to the tooltip div
            // Apply home page gradient via inline style, adjust text color for contrast
            className="absolute bottom-full left-1/2 mb-4 -translate-x-1/2 w-72 p-5 text-gray-800 rounded-xl shadow-2xl z-10"
            style={{ background: 'linear-gradient(160deg, #a7c5eb 0%, #d5a7e8 25%, #fbc2eb 50%, #a7e8d5 75%, #a7c5eb 100%)' }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Speech bubble pointer (triangle) - Matched to a color in the new gradient */}
            <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[12px] border-t-[#fbc2eb]"></div>
            
            {/* Adjusted text color for better readability on the new background */}
            <p className="text-center text-base font-medium text-gray-900 mb-4">
              Login required to upload!
            </p>
            <div className="flex justify-center gap-4">
              {/* Styled Login Button */}
              <Link href="/login" legacyBehavior>
                <a 
                  onMouseDown={(e) => e.stopPropagation()}
                  // Apply button wrapper styles (gradient, shape, shadow etc.)
                  className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-bold text-black rounded-full group focus:ring-2 focus:outline-none shadow-md bg-gradient-to-br from-yellow-400 to-orange-500 focus:ring-yellow-200 dark:focus:ring-yellow-800 shadow-orange-500/50 dark:shadow-sm dark:shadow-orange-800/80"
                >
                  {/* Inner span for text and background */}
                  <span className="relative px-5 py-1.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-full group-hover:bg-opacity-90">
                     Login
                  </span>
                </a>
              </Link>
              {/* Styled Sign Up Button */}
              <Link href="/signup" legacyBehavior>
                 <a 
                   onMouseDown={(e) => e.stopPropagation()}
                   // Apply button wrapper styles (gradient, shape, shadow etc.)
                   className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-sm font-bold text-black rounded-full group focus:ring-2 focus:outline-none shadow-md bg-gradient-to-br from-pink-500 to-purple-600 focus:ring-pink-200 dark:focus:ring-pink-800 shadow-purple-500/50 dark:shadow-sm dark:shadow-purple-800/80"
                 >
                   {/* Inner span for text and background */}
                   <span className="relative px-5 py-1.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-full group-hover:bg-opacity-90">
                     Sign Up
                   </span>
                 </a>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview */}
      {previewUrl && (
        <div className="mt-4 p-2 border border-gray-300 rounded-lg shadow-md bg-white/70 overflow-hidden">
          <p className="text-sm text-center text-gray-700 mb-2">Preview:</p>
          <Image
            src={previewUrl}
            alt="Selected preview"
            width={256}
            height={256}
            className="object-contain max-h-64 rounded-lg"
          />
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
