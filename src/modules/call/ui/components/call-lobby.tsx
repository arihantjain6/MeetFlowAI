import Link from "next/link";
import { LogInIcon } from "lucide-react";
import {
    DefaultVideoPlaceholder,
    StreamVideoParticipant,
    ToggleAudioPreviewButton,
    ToggleVideoPreviewButton,
    useCallStateHooks,
    VideoPreview
} from "@stream-io/video-react-sdk";

import { authClient } from "@/lib/auth-client";
import { generateAvatarUri } from "@/lib/avatar";
import { Button } from "@/components/ui/button";
import "@stream-io/video-react-sdk/dist/css/styles.css";


interface Props {
    onJoin: () => void;
}

const DisabledVideoPreview = () => {
    const { data } = authClient.useSession();

    return (
        <DefaultVideoPlaceholder
            participant={{
                name: data?.user.name,
                image: data?.user.image ?? generateAvatarUri({ seed: data?.user.name as string, variant: "initials" }),
            } as StreamVideoParticipant}
        />
    );
};

const AllowBrowserPermission = () => {
    return (
        <p className="text-sm">
            Allow access to your camera & microphone in the browser settings
        </p>
    )
}


export const CallLobby = ({ onJoin }: Props) => {
    const { useMicrophoneState, useCameraState } = useCallStateHooks();
    const { hasBrowserPermission: hasMicPermission } = useMicrophoneState();
    const { hasBrowserPermission: hasCameraPermission } = useCameraState();

    const hasBrowserMediaPermission = hasMicPermission && hasCameraPermission;
    return (
        <div className="flex flex-col items-center justify-center h-full bg-radial from-sidebar-accent to-sidebar">
            <div className="py-4 px-8 flex flex-1 items-center justify-center">
                <div className="flex flex-1 flex-col items-center justify-center gap-y-6 bg-background rounded-lg p-10 shadow-sm">
                    <div className="flex flex-col gap-y-2 text-center">
                        <h6 className="text-lg font-medium">Ready to join?</h6>
                        <p className="text-sm">Set up your call before joining</p>
                    </div>
                    <VideoPreview
                        DisabledVideoPreview={
                            hasBrowserMediaPermission
                                ? DisabledVideoPreview
                                : AllowBrowserPermission
                        }
                    />
                    <div className="flex gap-x-2">
                        <ToggleAudioPreviewButton />
                        <ToggleVideoPreviewButton />
                    </div> 
                    <div className="flex gap-x-4 justify-between w-full">
                        <Button asChild variant="ghost">
                            <Link href={"/meetings"}>Cancel</Link>
                        </Button> 
                        <Button onClick={onJoin}>
                            <LogInIcon /> 
                            Join Call
                        </Button>
                    </div>

                </div>
            </div>
        </div>
    );
}


