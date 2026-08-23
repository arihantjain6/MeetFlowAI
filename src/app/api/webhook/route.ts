import { and, eq, not } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  CallEndedEvent,
  CallTranscriptionReadyEvent,
  CallRecordingReadyEvent,
  CallSessionStartedEvent,
  CallSessionEndedEvent,
} from "@stream-io/node-sdk";
import { agents, meetings } from "@/db/schema";
import { streamVideo } from "@/lib/stream-video";
import { inngest } from "@/lib/inngest/client";


export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-signature");
  const apiKey = req.headers.get("x-api-key");

  if (!signature || !apiKey) {
    return NextResponse.json(
      { error: "Missing signature or API key" },
      { status: 400 },
    );
  }

  // if (apiKey !== process.env.STREAM_API_KEY) {
  //     return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  // } 

  const rawBody = Buffer.from(await req.arrayBuffer());
  let payload: unknown;
  try {
    payload = streamVideo.verifyAndParseWebhook(rawBody, signature);
    console.log("[Webhook Debug] Webhook signature verified successfully!");
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[Webhook Debug] Webhook signature verification failed:", errorMsg);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const eventType = (payload as Record<string, unknown>)?.type;

  if (eventType === "call.session_started") {
    const event = payload as CallSessionStartedEvent;
    const meetingId = event.call.custom?.meetingId as string | undefined;

    if (!meetingId) {
      return NextResponse.json({ error: "No meetingId found" }, { status: 400 });
    }

    const [existingMeeting] = await db
      .select()
      .from(meetings)
      .where(
        and(
          eq(meetings.id, meetingId),
          not(eq(meetings.status, "completed")),
          not(eq(meetings.status, "active")),
          not(eq(meetings.status, "cancelled")),
          not(eq(meetings.status, "processing")),
        ),
      );

    if (!existingMeeting) {
      return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
    }

    await db
      .update(meetings)
      .set({
        status: "active",
        startedAt: new Date(),
      })
      .where(eq(meetings.id, existingMeeting.id));

    const [existingAgent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, existingMeeting.agentId));

    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    streamVideo.video.call("default", meetingId);
  }

  if (eventType === "call.session_ended") {
    const event = payload as CallSessionEndedEvent;
    const meetingId = event.call.custom?.meetingId as string | undefined;

    if (!meetingId) {
      return NextResponse.json({ error: "No meetingId found" }, { status: 400 });
    }

    await inngest.send({
      name: "call.session_ended",
      data: event,
    });
  }

  if (eventType === "call.recording_ready") {
    const event = payload as CallRecordingReadyEvent;
    const meetingId = event.call_cid.split(":")[1];

    if (!meetingId) {
      return NextResponse.json({ error: "No meetingId found" }, { status: 400 });
    }

    await inngest.send({
      name: "call.recording_ready",
      data: event,
    });
  }

  if (eventType === "call.transcription_ready") {
    const event = payload as CallTranscriptionReadyEvent;
    const meetingId = event.call_cid.split(":")[1];

    if (!meetingId) {
      return NextResponse.json({ error: "No meetingId found" }, { status: 400 });
    }

    await inngest.send({
      name: "call.transcription_ready",
      data: event,
    });
  }

  return NextResponse.json({ status: "ok" });
}
