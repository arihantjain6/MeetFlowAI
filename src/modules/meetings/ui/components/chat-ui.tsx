import { useState, useEffect, useMemo, useCallback } from "react"
import { useMutation } from "@tanstack/react-query"
import type { Channel as StreamChannel } from "stream-chat"
import { LoadingState } from "@/components/loading-state";
import { useCreateChatClient, Chat, Channel, MessageComposer, MessageList, Thread, Window } from "stream-chat-react";
import { useTRPC } from "@/trpc/client";
import "stream-chat-react/dist/css/index.css"

interface ChatUIProps {
    meetingId: string;
    meetingName: string;
    userId: string;
    userName: string;
    userImage: string | undefined;
}

export const ChatUI = ({ meetingId, meetingName, userId, userName, userImage }: ChatUIProps) => {
    const trpc = useTRPC();
    const { mutateAsync: generateChatToken } = useMutation(
        trpc.meetings.generateChatToken.mutationOptions(),
    );

    const [channel, setChannel] = useState<StreamChannel>();

    const userData = useMemo(() => ({
        id: userId,
        name: userName,
        image: userImage,
    }), [userId, userName, userImage]);

    const tokenOrProvider = useCallback(() => generateChatToken(), [generateChatToken]);

    const client = useCreateChatClient({
        apiKey: process.env.NEXT_PUBLIC_STREAM_CHAT_API_KEY!,
        tokenOrProvider,
        userData,
    });

    useEffect(() => {
        if (!client) return;

        const Channel = client.channel('messaging', meetingId, {
            members: [userId]
        });

        setChannel(Channel);
    }, [client, meetingId, userId]);

    if (!client || !channel) {
        return (
            <LoadingState
                title="Loading chat..."
                description="This may take a few seconds"
            />
        );
    }

    return (
        <div className="bg-white rounded-lg border overflow-hidden">
            <Chat client={client}>
                <Channel channel={channel}>
                    <Window>
                        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-23rem)] border-b">
                            <MessageList />
                        </div>
                        <MessageComposer />
                    </Window>
                    <Thread />
                </Channel>
            </Chat>
        </div>
    );
};

