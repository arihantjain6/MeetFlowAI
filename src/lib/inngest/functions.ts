import { inngest } from "./client";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import { GoogleGenAI } from "@google/genai";
import {
  CallEndedEvent,
  CallRecordingReadyEvent,
  CallTranscriptionReadyEvent,
} from "@stream-io/node-sdk";

// 1. Function to handle call session ended (transition status to processing)
export const handleCallSessionEnded = inngest.createFunction(
  { id: "call-session-ended", triggers: [{ event: "call.session_ended" }] },
  async ({ event, step }) => {
    const payload = event.data as CallEndedEvent;
    const meetingId = payload.call.custom?.meetingId as string | undefined;

    if (!meetingId) {
      throw new Error("No meetingId found in webhook payload");
    }

    await step.run("update-meeting-status", async () => {
      await db
        .update(meetings)
        .set({
          status: "processing",
          endedAt: new Date(),
        })
        .where(eq(meetings.id, meetingId));
    });
  }
);

// 2. Function to handle call recording ready (save recording URL)
export const handleCallRecordingReady = inngest.createFunction(
  { id: "call-recording-ready", triggers: [{ event: "call.recording_ready" }] },
  async ({ event, step }) => {
    const payload = event.data as CallRecordingReadyEvent;
    const meetingId = payload.call_cid.split(":")[1];
    const recordingUrl = payload.call_recording.url;

    if (!meetingId) {
      throw new Error("No meetingId found in webhook payload");
    }

    await step.run("update-meeting-recording", async () => {
      await db
        .update(meetings)
        .set({
          recordingUrl,
        })
        .where(eq(meetings.id, meetingId));
    });
  }
);

// 3. Function to handle transcription ready (summarize transcript via Gemini)
export const handleCallTranscriptionReady = inngest.createFunction(
  { id: "call-transcription-ready", triggers: [{ event: "call.transcription_ready" }] },
  async ({ event, step }) => {
    const payload = event.data as CallTranscriptionReadyEvent;
    const meetingId = payload.call_cid.split(":")[1];
    const transcriptUrl = payload.call_transcription.url;

    if (!meetingId) {
      throw new Error("No meetingId found in webhook payload");
    }

    // Fetch meeting and agent instructions
    const { agent } = await step.run("fetch-meeting-and-agent", async () => {
      const [m] = await db
        .select()
        .from(meetings)
        .where(eq(meetings.id, meetingId));

      if (!m) {
        throw new Error(`Meeting not found: ${meetingId}`);
      }

      const [a] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, m.agentId));

      if (!a) {
        throw new Error(`Agent not found for meeting: ${meetingId}`);
      }

      return { meeting: m, agent: a };
    });

    // Fetch and parse the JSONLines transcript file
    const transcript = await step.run("fetch-and-parse-transcript", async () => {
      const res = await fetch(transcriptUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch transcription file from ${transcriptUrl}`);
      }

      const jsonLinesText = await res.text();
      const lines = jsonLinesText.split("\n").filter(Boolean);

      let parsed = "";
      for (const line of lines) {
        try {
          const obj = JSON.parse(line);
          if (obj.text) {
            parsed += `${obj.user_id || "Speaker"}: ${obj.text}\n`;
          }
        } catch {
          // Skip malformed lines
        }
      }
      return parsed;
    });

    // Call Gemini using the official @google/genai SDK to generate summaries and key items
    const summary = await step.run("generate-summary", async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `You are an expert AI meeting analyst. Your task is to analyze the meeting transcript and generate a highly professional, structured, and actionable meeting summary.

### Core Instructions & Guidelines:
${agent.instructions}

### Input Transcript:
"""
${transcript}
"""

### Output Requirements:
Format your response in clean, professional Markdown using this structure:

# Meeting Summary: [Concise Title of the Meeting]

## Executive Summary
Provide a high-level overview (3-5 sentences) summarizing the main purpose, context, and key outcomes of the meeting.

## Key Discussion Points
Detail the main topics discussed during the meeting. Use bullet points and provide brief explanations for each topic.

## Decisions Made
List all concrete decisions made or agreements reached. If no decisions were made, state "No explicit decisions recorded."

## Action Items
Provide a structured list of action items:
- **Task**: [Description of the task] | **Owner**: [Name of the owner if mentioned, otherwise "Unassigned"]

## Key Takeaways & Next Steps
Highlight the most important takeaways, next milestones, or follow-up items.

Please apply the "Core Instructions & Guidelines" to customize the tone, style, and specific focus area of the summary.`,
      });

      return response.text || "";
    });

    // Update meeting details in the database
    await step.run("save-summary", async () => {
      await db
        .update(meetings)
        .set({
          transcriptUrl,
          summary,
          status: "completed",
        })
        .where(eq(meetings.id, meetingId));
    });
  }
);
