'use client';

import { useState, useEffect } from 'react';
import ImageUploader from '@/components/ImageUploader';
import Image from 'next/image'; // Restore original import
import { createBrowserClient } from '@supabase/ssr'; // Import browser client
import { Database } from '@/types/supabase'; // Assuming types are generated
import { User } from '@supabase/supabase-js'; // Import User type
import LogoutButton from '@/components/LogoutButton'; // Import LogoutButton

const MEMORA_STYLE_PROMPT = `{
  "style_name": "Memora Style",
  "visual_aesthetic": {
    "description": "Lush, vinyl‐like sticker illustrations with a thick, uniform black outline. Characters combine slightly chibi proportions—oversized heads, slender torsos and limbs—with highly detailed wardrobe elements. Surfaces glimmer with soft gradient highlights and subtle shadowing to convey a 3D, puffy texture reminiscent of collectible fashion dolls.",
    "shading_and_lighting": {
      "technique": "Smooth vector gradients for primary light sources, paired with gentle rim lighting on hair and clothing edges. Use subtle ambient occlusion at garment folds and around facial features to enhance depth.",
      "highlights": "Sharp, white specular spots on jewelry, lamp‐lit hair strands, and glossy lips. Soft diffused glow behind characters to separate them from the background."
    },
    "character_design": {
      "features": {
        "eyes": "Almond‐shaped with thick upper lashes, crisp inner catchlights, and a secondary highlight rim for extra sparkle.",
        "brows": "Bold, sculpted arches with uniform stroke weight matching the outline.",
        "lips": "Full and gently rounded, with a light gloss sheen rendered as a narrow gradient band.",
        "skin": "Even tone with a gentle blush gradient on cheeks and nose bridge."
      },
      "hair": {
        "styles": "From sleek straight to voluminous curls—each lock or curl segment is individually shaded with two to three gradient stops for dimension.",
        "outlines": "Inner hair sections carry a thinner internal stroke to define volume without overcrowding."
      },
      "outfits": {
        "fabric_textures": "Denim shows faint crosshatch and stitched seam lines; leather features soft reflective highlights and subtle grain; knits use minimal line hatching to imply weave.",
        "accessories": "Metallic elements (buckles, chain links) have crisp white highlights and narrow metallic gradient. Purses carry embossed pattern outlines; sneakers show tread and panel stitching."
      },
      "poses_and_expression": "Natural, in‐motion stances—stride with one knee bent, hip cocked, arm extending a peace sign or adjusting sunglasses. Expressions tilt toward confident smiles, playful winks, or cool gazes."
    },
    "outline_and_border": {
      "main_outline": "Consistent 4–6px black stroke around every character and major clothing shape.",
      "sticker_border": "Add a secondary 2–3px off-white outline outside the black stroke to reinforce a die‐cut sticker feel."
    }
  },
  "background": {
    "description": "Simplified but evocative settings drawn in the same sticker style. Environments include boutique storefront façades, café patios with stylized chairs and tables, urban sidewalks with minimal signage, or abstract color‐block shapes suggesting interiors.",
    "composition_and_perspective": {
      "perspective": "One‐point or two‐point perspective with horizon line at character eye‐level. Foreground props (e.g., a bench or potted plant) carry the same black outline and white sticker border.",
      "color_and_tone": "Muted tonal fills—low‐saturation pastels or warm neutrals—so that the character's richer hues pop. Optional vignette or gentle radial gradient behind the figure to draw focus."
    }
  },
  "overall_vibe": "A high‐glamour, nostalgic yet contemporary sticker art style that elevates everyday fashion moments into collectible, shareable icons. It merges the polished sheen of Bratz‐inspired vinyl dolls with the warmth of hand‐drawn animation, making each character look like a limited‐edition fashion sticker."
}`;

// Remove the cast
// const Image = NextImage as React.ComponentType<any>;

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null); // State for user session
  const [authLoading, setAuthLoading] = useState<boolean>(true); // State for auth check loading

  // Create Supabase client only once
  const supabase = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Check user session on mount & listen for changes
  useEffect(() => {
    setAuthLoading(true); // Start loading check
    const getUserSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Error fetching user session:", error);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };
    getUserSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false); // Update loading state on change too
      if (event === 'SIGNED_OUT') {
        setSelectedFile(null);
        setGeneratedImageUrl(null);
        setError(null);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleFileSelected = (file: File | null) => {
    setSelectedFile(file);
    setGeneratedImageUrl(null);
    setError(null);
  };

  const handleGenerateClick = async () => {
    if (!selectedFile) return;

    // Check for user first - This is now a fallback, main check is in ImageUploader
    if (!user) {
      setError("Please log in to generate a sticker."); // Set an error message instead
      return;
    }

    // --- Proceed with generation if user exists ---
    setIsLoading(true);
    setError(null);
    setGeneratedImageUrl(null);

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('prompt', MEMORA_STYLE_PROMPT);

    try {
      const response = await fetch('/api/sticker', {
        method: 'POST',
        body: formData,
        // Note: Auth is handled server-side via cookies by the middleware
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Handle specific auth error from API
        if (response.status === 401) {
            setError("Authentication failed. Please log in again.");
            // Consider forcing logout or showing login modal again
            // supabase.auth.signOut();
            // setShowAuthModal(true);
        } else {
            throw new Error(errorData.error || `Error: ${response.statusText}`);
        }
      } else {
          const result = await response.json();
          console.log('API Response:', result);

          if (result.success && result.imageUrl) {
            setGeneratedImageUrl(result.imageUrl);
          } else {
            throw new Error(result.error || 'API did not return a valid image URL');
          }
      }

    } catch (err: Error) {
      setError(err.message || 'Failed to generate sticker');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadClick = async () => {
    if (!generatedImageUrl) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(generatedImageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      const blob = await response.blob();

      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'memora-sticker.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(blobUrl);

    } catch (err: Error) {
      setError(err.message || 'Failed to download sticker');
      console.error('Download error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Show basic loading indicator initially
  if (authLoading) {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-8">
            <p className="text-gray-600 text-xl">Loading...</p>
        </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 space-y-12 relative">
      {/* Logout Button - Positioned top-right, shown only if logged in */}
      {user && (
         <div className="absolute top-4 right-4">
            <LogoutButton />
         </div>
      )}

      {/* Title - Approximating the logo style */}
      <h1 className="text-6xl sm:text-8xl font-extrabold text-white tracking-tight" style={{ WebkitTextStroke: '2px black', textShadow: '3px 3px 0px rgba(0, 0, 0, 0.2)' }}>
        MEMORA
      </h1>

      {/* Subtitle */}
      <p className="text-xl sm:text-2xl text-center text-black">
        Turn your photo into a Memora sticker!
      </p>

      {/* Use the ImageUploader component - Pass auth props */}
      <ImageUploader 
        onFileSelect={handleFileSelected} 
        isLoggedIn={!!user} // Pass boolean auth status
      />

      {/* Generate Button */}
      {selectedFile && (
        <button
          onClick={handleGenerateClick} // This now checks auth
          disabled={isLoading} // Keep disabling during generation
          className={`mt-6 relative inline-flex items-center justify-center p-0.5 overflow-hidden text-lg font-bold text-black rounded-full group focus:ring-4 focus:outline-none shadow-lg ${isLoading ? 'opacity-50 cursor-not-allowed bg-gray-400' : 'bg-gradient-to-br from-green-400 to-blue-400 focus:ring-green-200 dark:focus:ring-green-800 shadow-green-500/50 dark:shadow-lg dark:shadow-green-800/80'}`}
        >
          <span className="relative px-8 py-3 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-full group-hover:bg-opacity-90">
            {isLoading ? 'Generating...' : 'Generate Sticker'}
          </span>
        </button>
      )}

      {/* Sticker Result Display or Placeholder */}
      <div className="w-full max-w-sm min-h-[16rem] flex flex-col items-center justify-center bg-white/50 rounded-lg border border-gray-200 shadow-md mt-8 p-4 text-center">
        {error && (
          <p className="text-red-600 font-semibold">Error: {error}</p>
        )}
        {/* Show processing only when loading AND no error */}
        {isLoading && !error && (
          <p className="text-gray-600">Processing your image...</p>
        )}

        {/* Show generated image if available, not loading, and no error */}
        {!isLoading && !error && generatedImageUrl && (
          <div className="rounded-lg overflow-hidden">
            <p className="text-green-700 font-semibold mb-2">Sticker Ready!</p>
            <Image
              src={generatedImageUrl}
              alt="Generated Sticker"
              width={256}
              height={256}
              className="object-contain max-h-64 rounded-lg"
              onError={(e) => {
                console.error("Error loading generated image:", e);
                setError("Failed to load generated image");
                setGeneratedImageUrl(null);
              }}
            />
          </div>
        )}

        {/* Placeholder text when idle */}
        {!isLoading && !error && !generatedImageUrl && (
          <p className="text-gray-600">
            {selectedFile
              ? `Ready to generate sticker for ${selectedFile.name}`
              : 'Upload a photo first'}
          </p>
        )}
      </div>

      {/* Download Button */}
      {generatedImageUrl && (
        <button
          onClick={handleDownloadClick}
          disabled={isLoading}
          className={`mt-6 relative inline-flex items-center justify-center p-0.5 overflow-hidden text-lg font-bold text-black rounded-full group focus:ring-4 focus:outline-none shadow-lg ${isLoading ? 'opacity-50 cursor-not-allowed bg-gray-400' : 'bg-gradient-to-br from-purple-500 to-pink-500 focus:ring-pink-200 dark:focus:ring-pink-800 shadow-pink-500/50 dark:shadow-lg dark:shadow-pink-800/80'}`}
        >
          <span className="relative px-8 py-3 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-full group-hover:bg-opacity-90">
            Download Sticker
          </span>
        </button>
      )}

    </main>
  );
}
