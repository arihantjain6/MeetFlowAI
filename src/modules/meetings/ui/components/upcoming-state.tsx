import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { VideoIcon } from "lucide-react";

interface Props {
    meetingId: string
    isCancelling: boolean
}

export const UpcomingState = ({meetingId, isCancelling}:Props) => {
    return (
        <div className="bg-white rounded-lg px-4 py-5 flex flex-col gap-y-8 items-center justify-center">
            <EmptyState
                image="/upcoming.svg"
                title="Not started yet"
                description="Looks like you're all clear! Schedule a new meeting to get started."
            />
            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center items-center"> 
                <Button asChild className="w-full sm:w-auto">
                    <Link href={`/call/${meetingId}`}>
                        <VideoIcon className="size-4 mr-2" />
                        Start Meeting
                    </Link>
                </Button>
            </div>
        </div>
    )
}