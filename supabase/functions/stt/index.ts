import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY");
    if (!ASSEMBLYAI_API_KEY) {
      throw new Error("ASSEMBLYAI_API_KEY is not configured");
    }

    // Get audio from request (base64 or form data)
    let audioBase64: string;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const audioFile = formData.get("audio") as File;
      if (!audioFile) {
        throw new Error("No audio file provided");
      }
      const arrayBuffer = await audioFile.arrayBuffer();
      audioBase64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    } else {
      const body = await req.json();
      audioBase64 = body.audio;
      if (!audioBase64) {
        throw new Error("No audio data provided");
      }
    }

    console.log("Uploading audio to AssemblyAI...");

    // Upload audio to AssemblyAI
    const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    
    const uploadResponse = await fetch("https://api.assemblyai.com/v2/upload", {
      method: "POST",
      headers: {
        "Authorization": ASSEMBLYAI_API_KEY,
        "Content-Type": "application/octet-stream",
      },
      body: audioBytes,
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      console.error("Upload error:", error);
      throw new Error(`Failed to upload audio: ${error}`);
    }

    const uploadResult = await uploadResponse.json();
    const audioUrl = uploadResult.upload_url;

    console.log("Creating transcription...");

    // Create transcription
    const transcriptResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
      method: "POST",
      headers: {
        "Authorization": ASSEMBLYAI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        audio_url: audioUrl,
        language_code: "ru",
      }),
    });

    if (!transcriptResponse.ok) {
      const error = await transcriptResponse.text();
      console.error("Transcription create error:", error);
      throw new Error(`Failed to create transcription: ${error}`);
    }

    const transcriptResult = await transcriptResponse.json();
    const transcriptId = transcriptResult.id;

    console.log("Polling for transcription result...", transcriptId);

    // Poll for result
    let result;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds timeout

    while (attempts < maxAttempts) {
      const pollResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: {
          "Authorization": ASSEMBLYAI_API_KEY,
        },
      });

      result = await pollResponse.json();

      if (result.status === "completed") {
        console.log("Transcription completed");
        break;
      } else if (result.status === "error") {
        throw new Error(`Transcription failed: ${result.error}`);
      }

      // Wait 1 second before next poll
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!result || result.status !== "completed") {
      throw new Error("Transcription timeout");
    }

    return new Response(
      JSON.stringify({ text: result.text || "" }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("STT error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
