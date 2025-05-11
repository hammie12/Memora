import { v4 as uuidv4 } from 'uuid';
// Use createServerClient for server-side auth from @supabase/ssr
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
// import { Database } from '@/types/supabase'; // Adjust path if needed - Generate this with `supabase gen types typescript`
import OpenAI from 'openai';
import sharp from 'sharp'; // Import sharp for image resizing
import { toFile } from 'openai/uploads'; // Import the toFile helper
import { supabase } from '@/lib/supabaseClient'; // Re-add original client import for storage
// Import StorageError for typing the background upload
import { StorageError } from '@supabase/storage-js';

// Ensure OPENAI_API_KEY is loaded (will throw error at build time if not)
if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing environment variable: OPENAI_API_KEY');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BUCKET_NAME = 'uploads'; // Your public bucket name

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  // Create a Supabase client specific to this route handler using @supabase/ssr
  const supabaseRouteClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, // Ensure these are set in your env
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Ensure these are set in your env
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.warn('Supabase SSR set cookie error (ignored in Route Handler):', error);
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options }); // Use set with empty value for deletion
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
            console.warn('Supabase SSR remove cookie error (ignored in Route Handler):', error);
          }
        },
      },
    }
    // Pass Database type here once generated: <Database>
  );

  // Check for authenticated user
  const { data: { session }, error: sessionError } = await supabaseRouteClient.auth.getSession();

  if (sessionError) {
    console.error('Supabase session error:', sessionError);
    return NextResponse.json({ error: 'Failed to retrieve user session' }, { status: 500 });
  }

  if (!session || !session.user) {
    // No user session found, or session is invalid
    return NextResponse.json({ error: 'Unauthorized: User not logged in' }, { status: 401 });
  }

  // User is authenticated, log user ID
  console.log(`Authenticated user ID: ${session.user.id}`);

  try {
    const formData = await req.formData();
    const userImageFile = formData.get('image') as File | null;
    const receivedPrompt = formData.get('prompt') as string | null; // Read the prompt

    if (!userImageFile) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }
    if (!receivedPrompt) {
      console.log('No prompt provided in FormData, using default prompt.');
      // Optionally, return an error or fall back to a default here
      // For now, we'll let it proceed and potentially use the hardcoded one later
    } else {
      console.log('Received prompt from frontend:', receivedPrompt.substring(0, 100) + '...'); // Log snippet
    }

    console.log(`Received user image: ${userImageFile.name} Size: ${userImageFile.size}`);

    // --- Process User Image ---
    const userImageBuffer = Buffer.from(await userImageFile.arrayBuffer());
    console.log('Resizing user image to fit within 128x128 for OpenAI edit API...');
    let resizedUserImageBuffer: Buffer;
    try {
      resizedUserImageBuffer = await sharp(userImageBuffer)
        .resize(128, 128, {
          fit: 'inside', // Maintain aspect ratio within 128x128
          withoutEnlargement: true // Don't enlarge small images
        })
        .png({ compressionLevel: 9, quality: 75 })
        .toBuffer();
      console.log('Resized user image buffer length:', resizedUserImageBuffer.length);
    } catch (resizeError) {
      console.error('User image resize error:', resizeError);
      throw new Error('Failed to resize user image before sending to OpenAI');
    }

    // 2. Define the editing prompt (Using detailed Memora Style, no multi-image instructions needed now)
    const memoraEditPrompt = "Render the provided image subject and background composition in the Memora Style, preserving the original content as accurately as possible while applying the stylization. Ensure the main subject is fully visible and centered within the square output. Generate a 1024x1024 sticker.\n\nMemora Style Details:\n\nVisual Aesthetic: A vibrant, sticker-like illustration style. Apply bold outlines, smooth shading, and slightly exaggerated, cartoonish proportions. Maintain a warm, approachable, playful, yet stylish and polished edge.\n\nCharacter Design: Simplify features but keep them expressive (big eyes, strong brows, soft smiles, dynamic poses). If the subject in the image appears male, subtly emphasize masculine features (e.g., stronger jawline, broader shoulders). If female, subtly emphasize feminine features (e.g., softer jawline, eyelashes). Detail hair textures, accessories, and clothing in a stylized manner. Capture characters in lively, candid moments (posing, winking, peace signs, mid-step) for personality.\n\nColor Palette: Use predominantly rich, warm tones (earthy browns, sunset oranges, muted blues and greens). Apply soft but noticeable gradient shading to give a 'puffy sticker' 3D effect.\n\nFashion Focus: Style outfits as trendy and individualized (streetwear, Y2K, casual chic). Emphasize and detail accessories like purses, jewelry, and sneakers. Recreate branding and patterns (logos, designer bags, prints) playfully and stylistically.\n\nBackgrounds: Render backgrounds as lightly detailed environments (street, pub, car, mall) that complement the character and match the warm, nostalgic tone, but keep them muted enough to maintain focus on the subject. Apply a secondary 2-3px off-white outline outside the main subject's black stroke for a die-cut sticker feel.\n\nOverall Vibe: Blend Disney animation style with modern Instagram fashion influencers, drawing inspiration from Bratz character proportions/fashion and Pixar's expressive animation. Aim for a style that is nostalgic yet modern, highly expressive, making the everyday look iconic.";
    console.log('Editing image with gpt-image-1 using single input image. Prompt snippet:', memoraEditPrompt.substring(0, 200) + '...'); // Log snippet for brevity

    // 3. Call OpenAI Image Edit API with SINGLE image, timeout, and retry logic
    let editResponse;
    const maxRetries = 1; // Allow 1 retry
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        editResponse = await openai.images.edit({
          model: "gpt-image-1",
          image: [await toFile(resizedUserImageBuffer, 'user_input.png', { type: 'image/png' })], // Pass only the user image
          prompt: memoraEditPrompt,
          n: 1,
          size: "1024x1024",
        }, {
          timeout: 60000 // 60 seconds timeout
        });
        // If successful, break the loop
        break;
      } catch (error) {
        attempt++;
        // Add type check for error message access
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`OpenAI API call attempt ${attempt} failed:`, errorMessage);
        // Check if it's a connection error and we haven't exceeded retries
        // Refine error checking based on potential error structures
        const isRetryable = (error instanceof Error && 'code' in error && error.code === 'ECONNRESET') ||
                            (error instanceof Error && 'type' in error && error.type === 'system') ||
                            (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' && error.message.includes('Connection error'));

        if (attempt <= maxRetries && isRetryable) {
          console.log(`Retrying API call (${attempt}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retrying
        } else {
          // If it's not a retryable error or max retries reached, re-throw
          throw error;
        }
      }
    }

    // Ensure editResponse is defined after the loop (might fail if all retries fail)
    if (!editResponse) {
        throw new Error('OpenAI API call failed after retries.');
    }

    // 4. Handle potential base64 response
    if (!editResponse.data || editResponse.data.length === 0) {
      console.error('OpenAI Edit API response does not contain data.');
      console.error('OpenAI Response:', JSON.stringify(editResponse, null, 2)); 
      throw new Error('Invalid response structure from OpenAI Edit API');
    }
    const editedImageBase64 = editResponse.data[0]?.b64_json; // Get base64 encoded image

    if (!editedImageBase64) {
        console.error('OpenAI Edit API did not return image data (b64_json).');
        // Log the actual response for debugging
        console.error('OpenAI Response:', JSON.stringify(editResponse, null, 2)); 
        throw new Error('Failed to get edited image data from OpenAI');
    }

    // 5. Decode base64 and upload EDITED image to Supabase
    const editedImageBuffer = Buffer.from(editedImageBase64, 'base64');
    const editedFileExt = 'png'; // DALL-E typically returns PNG
    const editedUniqueFileName = `edited-${uuidv4()}.${editedFileExt}`;
    const editedFilePath = `public/${editedUniqueFileName}`;

    // Convert Buffer to ArrayBuffer to potentially satisfy the linter (ID: 47453a03-046b-4b43-8b87-2af0269aac06)
    // Buffer should be acceptable according to Supabase docs, but linter complains.
    const editedImageArrayBuffer = editedImageBuffer.buffer.slice(
      editedImageBuffer.byteOffset, 
      editedImageBuffer.byteOffset + editedImageBuffer.byteLength
    );

    const { data: editedUploadData, error: editedUploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(editedFilePath, editedImageArrayBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: `image/${editedFileExt}`, // Set content type
      });

    // Acknowledge lint error ID: 47453a03-046b-4b43-8b87-2af0269aac06 - Attempted fix above.
    // The Supabase upload function accepts Buffer type, this lint error seems incorrect.
    if (editedUploadError) {
        console.error('Supabase Upload Error (Edited Image):', editedUploadError);
        throw new Error(`Failed to upload edited image: ${editedUploadError.message}`);
    }
    console.log('Supabase Upload Success (Edited Image):', editedUploadData);

    // 6. Get public URL for the EDITED image
     const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(editedFilePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
        console.error('Supabase Get Public URL Error (Edited): URL not found');
        throw new Error('Failed to get public URL for the edited image');
    }
    const finalImageUrl = publicUrlData.publicUrl;
    console.log('Final Edited Image URL (from Supabase):', finalImageUrl);


    // (Optional) Upload the ORIGINAL user image to Supabase in the background (for logging/backup)
    // Run this without await so it doesn't block the response
    const originalFileExt = userImageFile.name.split('.').pop();
    const originalUniqueFileName = `${uuidv4()}.${originalFileExt}`;
    const originalFilePath = `public/${originalUniqueFileName}`; // Store in a 'public' folder within the bucket

    supabase.storage
      .from(BUCKET_NAME)
      .upload(originalFilePath, userImageFile, { cacheControl: '3600', upsert: false })
      // Use correct types for storage upload result
      .then(({ data: uploadData, error: uploadError }: { data: { path: string } | null, error: StorageError | null }) => {
          if (uploadError) {
              console.error('Supabase Upload Error (Original Image):', uploadError);
          } else if (uploadData) {
              console.log('Supabase Upload Success (Original Image):', uploadData);
          }
      });

    // 7. Return the Supabase URL of the EDITED image
    return NextResponse.json({ success: true, imageUrl: finalImageUrl });

    // --- End Refactor ---

  } catch (error) {
    // Add type check for error message access
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('API Error:', error);

    // Check for specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      console.error('OpenAI API Error Details:', {
        status: error.status,
        message: error.message,
        code: error.code,
        type: error.type,
      });
       return NextResponse.json(
         { error: `OpenAI API Error: ${error.message}` },
         { status: error.status || 500 }
       );
    }

    // Generic error
    return NextResponse.json(
      { error: 'Internal Server Error', details: errorMessage || 'Unknown error' },
      { status: 500 }
    );
  }
}
