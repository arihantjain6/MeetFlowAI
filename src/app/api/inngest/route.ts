import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
  handleCallSessionEnded,
  handleCallRecordingReady,
  handleCallTranscriptionReady,
} from "@/lib/inngest/functions";

// Serve the Inngest endpoint to handle HTTP incoming requests from Inngest dev server / cloud
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    handleCallSessionEnded,
    handleCallRecordingReady,
    handleCallTranscriptionReady,
  ],
});
