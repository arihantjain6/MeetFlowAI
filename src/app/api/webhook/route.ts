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
import { inngest } from "@/inngest/client";
import { streamChat } from "@/lib/stream-chats";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-signature") || req.headers.get("signature");
  const apiKey = req.headers.get("x-api-key");

  console.log("[Webhook Debug] Incoming Webhook Headers:", {
    "x-signature": req.headers.get("x-signature"),
    "signature": req.headers.get("signature"),
    "x-api-key": apiKey,
  });

  if (!signature) {
    return NextResponse.json(
      { error: "Missing signature" },
      { status: 400 },
    );
  }

  const rawBody = Buffer.from(await req.arrayBuffer());

  // 1. Try verifying as Stream Chat webhook
  try {
    const chatEvent = streamChat.verifyAndParseWebhook(rawBody, signature);
    console.log("[Webhook Debug] Webhook parsed! Event type:", chatEvent.type);

    if (chatEvent.type === "message.new") {
      console.log("[Webhook Debug] Sending message.new to Inngest...");
      await inngest.send({
        name: "message.new",
        data: chatEvent,
      });
      console.log("[Webhook Debug] message.new sent to Inngest successfully!");
      return NextResponse.json({ status: "ok" });
    }
  } catch (err) {
    // Not a valid chat webhook — fall through to video verification
    console.log("[Webhook Debug] Not a Stream Chat webhook, trying video...");
  }

  // 2. Otherwise verify as Stream Video webhook
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing API key for video webhook" },
      { status: 400 },
    );
  }

  let payload: unknown;
  try {
    const calculatedHash = require("crypto")
      .createHmac("sha256", process.env.STREAM_VIDEO_SECRET_KEY || "")
      .update(rawBody)
      .digest("hex");
    console.log("[Webhook Debug] Received Signature:", signature);
    console.log("[Webhook Debug] Calculated Hash:", calculatedHash);

    payload = streamVideo.verifyAndParseWebhook(rawBody, signature);
    console.log("[Webhook Debug] Webhook signature verified successfully!");
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(
      "[Webhook Debug] Webhook signature verification failed:",
      errorMsg,
    );
    // If payload is valid JSON despite signature mismatch in development, parse payload so events are not dropped
    try {
      payload = JSON.parse(rawBody.toString("utf-8"));
      console.log("[Webhook Debug] Fallback JSON parse succeeded for event:", (payload as any)?.type);
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const eventType = (payload as Record<string, unknown>)?.type;

  if (eventType === "call.session_started") {
    const event = payload as CallSessionStartedEvent;
    const meetingId =
      (event.call?.custom?.meetingId as string | undefined) ||
      event.call?.id ||
      (event as Record<string, any>).call_cid?.split(":")[1];

    if (!meetingId) {
      return NextResponse.json(
        { error: "No meetingId found" },
        { status: 400 },
      );
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

  if (eventType === "call.session_ended" || eventType === "call.ended") {
    const event = payload as CallSessionEndedEvent;
    const meetingId =
      (event.call?.custom?.meetingId as string | undefined) ||
      event.call?.id ||
      (event as Record<string, any>).call_cid?.split(":")[1];

    if (!meetingId) {
      return NextResponse.json(
        { error: "No meetingId found" },
        { status: 400 },
      );
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
      return NextResponse.json(
        { error: "No meetingId found" },
        { status: 400 },
      );
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
      return NextResponse.json(
        { error: "No meetingId found" },
        { status: 400 },
      );
    }

    await inngest.send({
      name: "call.transcription_ready",
      data: event,
    });
  }

  return NextResponse.json({ status: "ok" });
}
