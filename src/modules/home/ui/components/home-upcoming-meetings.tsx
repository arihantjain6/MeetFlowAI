"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import Link from "next/link";
import { VideoIcon, PlusIcon, CalendarIcon, ArrowRightIcon, PlayCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { NewMeetingsDialog } from "@/modules/meetings/ui/components/new-meeting-dialog";
import { format } from "date-fns";

export const HomeUpcomingMeetings = () => {
    const trpc = useTRPC();
    const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);

    const { data: meetingsData, isLoading } = useQuery(
        trpc.meetings.getMany.queryOptions({
            page: 1,
            pageSize: 50,
        })
    );

    const upcomingMeetings = meetingsData?.items.filter(
        (m) => m.status === "upcoming" || m.status === "active" || m.status === "processing"
    ).slice(0, 4) ?? [];

    return (
        <>
            <NewMeetingsDialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen} />

            <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-border/40">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <VideoIcon className="size-4.5" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-foreground tracking-tight">
                                Scheduled & Active Meetings
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Join or launch your next live AI session
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
                        <Link href="/meetings" className="inline-flex items-center gap-1">
                            View all <ArrowRightIcon className="size-3" />
                        </Link>
                    </Button>
                </div>

                <div className="mt-4 space-y-3">
                    {isLoading ? (
                        <div className="space-y-3 py-2">
                            {[1, 2].map((i) => (
                                <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
                            ))}
                        </div>
                    ) : upcomingMeetings.length > 0 ? (
                        upcomingMeetings.map((meeting) => (
                            <div
                                key={meeting.id}
                                className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border/50 hover:border-primary/40 bg-background/50 hover:bg-muted/40 transition-all duration-200 gap-4"
                            >
                                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                                    <GeneratedAvatar
                                        seed={meeting.agent?.name || "Agent"}
                                        variant="botttsNeutral"
                                        className="size-10 shrink-0 ring-1 ring-border/50"
                                    />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Link
                                                href={`/meetings/${meeting.id}`}
                                                className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate"
                                            >
                                                {meeting.name}
                                            </Link>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    meeting.status === "active"
                                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px]"
                                                        : meeting.status === "processing"
                                                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[11px]"
                                                        : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[11px]"
                                                }
                                            >
                                                {meeting.status === "active" && (
                                                    <span className="size-1.5 rounded-full bg-emerald-500 mr-1 animate-ping" />
                                                )}
                                                {meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                            <span>with <strong className="font-medium text-foreground">{meeting.agent?.name}</strong></span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1" suppressHydrationWarning>
                                                <CalendarIcon className="size-3" />
                                                {meeting.createdAt ? format(new Date(meeting.createdAt), "MMM d, yyyy") : "Recently"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                    <Button size="sm" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-xs">
                                        <Link href={`/call/${meeting.id}`}>
                                            <PlayCircleIcon className="size-3.5 mr-1.5" />
                                            Start Meeting
                                        </Link>
                                    </Button>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/meetings/${meeting.id}`}>
                                            Details
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border/80 bg-muted/20">
                            <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                                <CalendarIcon className="size-5" />
                            </div>
                            <h3 className="text-sm font-semibold text-foreground">No upcoming meetings</h3>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                                You don&apos;t have any active or upcoming meetings scheduled right now.
                            </p>
                            <Button
                                onClick={() => setMeetingDialogOpen(true)}
                                size="sm"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                            >
                                <PlusIcon className="size-3.5 mr-1.5" />
                                Schedule a Meeting
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
