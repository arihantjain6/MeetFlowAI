import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
  handleCallSessionEnded,
  handleCallRecordingReady,
  handleCallTranscriptionReady,
  handleMessageNew,
} from "@/inngest/functions";

// Serve the Inngest endpoint to handle HTTP incoming requests from Inngest dev server / cloud
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    handleCallSessionEnded,
    handleCallRecordingReady,
    handleCallTranscriptionReady,
    handleMessageNew,
  ],
});
