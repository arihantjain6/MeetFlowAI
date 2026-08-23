import { useState } from "react";
import { StreamTheme, useCall, CallingState } from "@stream-io/video-react-sdk";
import { CallLobby } from "./call-lobby";
import { CallActive } from "./call-active";
import { CallEnded } from "./call-ended";
import { toast } from "sonner";

interface Props {
    meetingName: string;
};

export const CallUI = ({ meetingName }: Props) => {
    const call = useCall();
    const [show, setShow] = useState<"lobby" | "call" | "ended">("lobby");

    const handleJoin = async() => {
        if(!call) return;
        try {
            await call.join();
            setShow("call");
        } catch (err) {
            const isAlreadyJoined = call.state.callingState === CallingState.JOINED;
            if (isAlreadyJoined) {
                console.warn("Failed or already joined call:", err);
                setShow("call");
            } else {
                console.warn("Failed to join call:", err);
                const errorMsg = err instanceof Error ? err.message : String(err);
                toast.error(`Failed to join call: ${errorMsg}`);
            }
        }
    };

    const handleLeave = () => {
        if(!call) return;
        call.endCall();
        setShow("ended");
    }
    return (
        <StreamTheme className="h-full">
            {show === "lobby" && <CallLobby onJoin = {handleJoin} />}
            {show === "call" && <CallActive onLeave = {handleLeave} meetingName={meetingName} />}
            {show === "ended" && <CallEnded />}
            
        </StreamTheme>
    )
};