import { useEffect, useState } from 'react';
import { LoaderIcon } from 'lucide-react';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { useTRPC } from '@/trpc/client';
import {
    Call,
    CallingState,
    StreamCall,
    StreamVideo,
    StreamVideoClient,
} from "@stream-io/video-react-sdk";
import "@stream-io/video-react-sdk/dist/css/styles.css";
import { CallUI } from './call-ui';
import { generateAvatarUri } from '@/lib/avatar';

function downsampleBuffer(buffer: Float32Array, inputSampleRate: number, outputSampleRate: number) {
    if (inputSampleRate === outputSampleRate) {
        return buffer;
    }
    const sampleRateRatio = inputSampleRate / outputSampleRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
        let accum = 0;
        let count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
        }
        result[offsetResult] = accum / count;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }
    return result;
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
    for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
}

interface Props {
    meetingId: string;
    meetingName: string;
    userId: string;
    userName: string;
    userImage: string;
    agentId: string;
    agentName: string;
    agentInstructions: string;
}


export const CallConnect = ({
    meetingId,
    meetingName,
    userId,
    userName,
    userImage,
    agentId,
    agentName,
    agentInstructions,
}: Props) => {
    const trpc = useTRPC();
    const { mutateAsync: generateToken } = useMutation(
        trpc.meetings.generateToken.mutationOptions(),
    );
    const { mutateAsync: generateAgentToken } = useMutation(
        trpc.meetings.generateAgentToken.mutationOptions(),
    );
    const { mutateAsync: generateEphemeralToken } = useMutation(
        trpc.meetings.generateEphemeralToken.mutationOptions(),
    );

    const [client, setClient] = useState<StreamVideoClient>();
    useEffect(() => {
        const _client = new StreamVideoClient({
            apiKey: process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY!,
            user: {
                id: userId,
                name: userName,
                image: userImage,
            },
            tokenProvider: generateToken,
        });
        setClient(_client);

        return () => {
            _client.disconnectUser();
            setClient(undefined);
        };
    }, [userId, userName, userImage, generateToken]);

    const [call, setCall] = useState<Call>();

    useEffect(() => {
        if (!client) return;

        const _call = client.call('default', meetingId);
        _call.camera.disable();
        _call.microphone.disable();

        setCall(_call);

        return () => {
            if (_call.state.callingState !== CallingState.LEFT) {
                _call.leave().catch(() => { });
                _call.endCall().catch(() => { });
                setCall(undefined)
            }
        };

    }, [client, meetingId]);


    useEffect(() => {
        if (!client || !call) return;

        let activeAgentClient: StreamVideoClient | undefined;
        let activeAgentCall: Call | undefined;
        let ws: WebSocket | undefined;
        let micStream: MediaStream | undefined;
        let audioCtx: AudioContext | undefined;
        let processor: ScriptProcessorNode | undefined;
        let playCtx: AudioContext | undefined;
        let isStarting = false;
        let isCancelled = false;

        const cleanupSession = () => {
            if (ws) {
                try { ws.close(); } catch { }
            }
            if (micStream) {
                try { micStream.getTracks().forEach(t => t.stop()); } catch { }
            }
            if (processor) {
                try { processor.disconnect(); } catch { }
            }
            if (audioCtx) {
                try { audioCtx.close(); } catch { }
            }
            if (playCtx) {
                try { playCtx.close(); } catch { }
            }
            if (activeAgentCall) {
                activeAgentCall.leave().catch(() => { });
            }
            if (activeAgentClient) {
                try { activeAgentClient.disconnectUser(); } catch { }
            }
        };

        const startGeminiLive = async () => {
            isStarting = true;
            console.log("[Gemini Live Debug] startGeminiLive started.");
            try {
                const tokenResponse = await generateEphemeralToken();
                console.log("[Gemini Live Debug] Ephemeral token retrieved:", tokenResponse);
                if (isCancelled) {
                    cleanupSession();
                    return;
                }

                // 1. Establish Gemini Live WebSocket connection (v1alpha)
                const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(tokenResponse)}`;
                console.log("[Gemini Live Debug] Connecting to WebSocket URL:", url);
                ws = new WebSocket(url);
                if (isCancelled) {
                    cleanupSession();
                    return;
                }

                ws.onopen = () => {
                    console.log("Gemini WebSocket opened, sending setup message...");
                    // Send Setup Message with Protobuf snake_case keys
                    const setupMsg = {
                        setup: {
                            model: "models/gemini-3.1-flash-live-preview",
                            generation_config: {
                                response_modalities: ["AUDIO"],
                                speech_config: {
                                    voice_config: {
                                        prebuilt_voice_config: {
                                            voice_name: "Aoede" // Choose Kore, Aoede, Puck, Charon, Fenrir
                                        }
                                    }
                                }
                            },
                            system_instruction: {
                                parts: [{ text: agentInstructions }]
                            }
                        }
                    };
                    ws?.send(JSON.stringify(setupMsg));
                };

                ws.onerror = (err) => {
                    console.error("Gemini WebSocket error event:", err);
                };

                ws.onclose = (evt) => {
                    console.warn("Gemini WebSocket connection closed by Google:", evt.code, evt.reason || "Check if your GEMINI_API_KEY is valid and starts with AIzaSy...");
                };

                // 2. Initialize Web Audio API for playing Gemini response
                playCtx = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)({ sampleRate: 24000 });
                if (playCtx.state === 'suspended') {
                    await playCtx.resume();
                    if (isCancelled) {
                        cleanupSession();
                        return;
                    }
                }
                const dest = playCtx.createMediaStreamDestination();

                let nextPlayTime = 0;
                const playChunk = (float32Data: Float32Array) => {
                    if (!playCtx) return;
                    const audioBuffer = playCtx.createBuffer(1, float32Data.length, 24000);
                    audioBuffer.getChannelData(0).set(float32Data);

                    const source = playCtx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(dest);

                    const currentTime = playCtx.currentTime;
                    if (nextPlayTime < currentTime) {
                        nextPlayTime = currentTime;
                    }
                    source.start(nextPlayTime);
                    nextPlayTime += audioBuffer.duration;
                };

                ws.onmessage = async (event) => {
                    try {
                        const text = typeof event.data === 'string' ? event.data : await event.data.text();
                        const response = JSON.parse(text);

                        const serverContent = response.serverContent || response.server_content;
                        const modelTurn = serverContent?.modelTurn || serverContent?.model_turn;
                        const parts = modelTurn?.parts;

                        if (parts) {
                            console.log("Received response chunk from Gemini Live.");
                            for (const part of parts) {
                                const inlineData = part.inlineData || part.inline_data;
                                if (inlineData && inlineData.data) {
                                    // Decode base64 24kHz PCM to float32
                                    const binary = atob(inlineData.data);
                                    const bytes = new Uint8Array(binary.length);
                                    for (let i = 0; i < binary.length; i++) {
                                        bytes[i] = binary.charCodeAt(i);
                                    }
                                    const int16Array = new Int16Array(bytes.buffer);
                                    const float32Array = new Float32Array(int16Array.length);
                                    for (let i = 0; i < int16Array.length; i++) {
                                        float32Array[i] = int16Array[i] / 32768;
                                    }
                                    playChunk(float32Array);
                                }
                            }
                        }

                        if (serverContent?.interrupted) {
                            console.log("Gemini Live interrupted by user speech.");
                            nextPlayTime = playCtx ? playCtx.currentTime : 0;
                        }
                    } catch (err) {
                        console.error("Error parsing Gemini message:", err);
                    }
                };

                // 3. Connect Stream Agent Participant and publish custom destination stream
                const token = await generateAgentToken({ agentId, meetingId });
                if (isCancelled) {
                    cleanupSession();
                    return;
                }

                activeAgentClient = new StreamVideoClient({
                    apiKey: process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY!,
                    user: {
                        id: agentId,
                        name: agentName,
                        image: generateAvatarUri({ seed: agentName, variant: "botttsNeutral" }),
                    },
                    tokenProvider: () => Promise.resolve(token),
                });

                activeAgentCall = activeAgentClient.call('default', meetingId);
                await activeAgentCall.camera.disable();
                if (isCancelled) {
                    cleanupSession();
                    return;
                }

                await activeAgentCall.join();
                if (isCancelled) {
                    cleanupSession();
                    return;
                }

                // Publish Gemini's output stream as the agent's audio!
                try {
                    await activeAgentCall.publishAudioStream(dest.stream);
                    console.log("Agent published custom audio stream successfully!");
                } catch (pubErr) {
                    console.error("Agent failed to publish custom audio stream:", pubErr);
                }
                if (isCancelled) {
                    cleanupSession();
                    return;
                }

                // 4. Capture User's Microphone and send base64 PCM over WebSocket
                micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                if (isCancelled) {
                    cleanupSession();
                    return;
                }

                audioCtx = new (window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
                if (audioCtx.state === 'suspended') {
                    await audioCtx.resume();
                    if (isCancelled) {
                        cleanupSession();
                        return;
                    }
                }
                const sourceNode = audioCtx.createMediaStreamSource(micStream);

                // Process in chunks of 2048 samples
                processor = audioCtx.createScriptProcessor(2048, 1, 1);
                const inputSampleRate = audioCtx.sampleRate;
                let chunksSent = 0;

                processor.onaudioprocess = (e) => {
                    const inputData = e.inputBuffer.getChannelData(0);
                    const downsampled = downsampleBuffer(inputData, inputSampleRate, 16000);

                    const buffer = new ArrayBuffer(downsampled.length * 2);
                    const view = new DataView(buffer);
                    floatTo16BitPCM(view, 0, downsampled);

                    const bytes = new Uint8Array(buffer);
                    let binary = "";
                    for (let i = 0; i < bytes.byteLength; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    const base64Data = btoa(binary);

                    const mediaChunk = {
                        realtime_input: {
                            audio: {
                                mime_type: "audio/pcm;rate=16000",
                                data: base64Data
                            }
                        }
                    };

                    if (ws && ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify(mediaChunk));
                        if (chunksSent === 0) {
                            console.log("Started streaming audio chunks to Gemini Live WebSocket successfully.");
                        }
                        chunksSent++;
                    }
                };

                sourceNode.connect(processor);
                processor.connect(audioCtx.destination);

            } catch (err) {
                console.error("Gemini Live connection failed:", err);
            }
        };

        const unsubscribe = call.state.callingState$.subscribe((state) => {
            if (state === CallingState.JOINED && !activeAgentCall && !isStarting) {
                startGeminiLive();
            }
        });

        return () => {
            isCancelled = true;
            isStarting = false;
            unsubscribe.unsubscribe();
            cleanupSession();
        };
    }, [client, call, meetingId, agentId, agentName, agentInstructions, generateAgentToken, generateEphemeralToken]);

    if (!call || !client) {
        return (
            <div className="flex h-screen items-center justify-center bg-radial from-sidebar-accent to-sidebar">
                <LoaderIcon className="size-6 animate-spin text-white" />
            </div>
        );
    }

    return (
        <StreamVideo client={client} >
            <StreamCall call={call}>
                <CallUI meetingName={meetingName} />
            </StreamCall>
        </StreamVideo>
    )
}