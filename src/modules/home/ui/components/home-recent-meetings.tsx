"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import Link from "next/link";
import { SparklesIcon, MessageSquareIcon, ClockIcon, ArrowRightIcon, FileTextIcon, CheckCircle2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { format } from "date-fns";

export const HomeRecentMeetings = () => {
    const trpc = useTRPC();

    const { data: meetingsData, isLoading } = useQuery(
        trpc.meetings.getMany.queryOptions({
            page: 1,
            pageSize: 50,
        })
    );

    const completedMeetings = meetingsData?.items
        .filter((m) => m.status === "completed")
        .slice(0, 3) ?? [];

    const cleanSummaryPreview = (summary?: string | null) => {
        if (!summary) return "Meeting recorded and transcribed. Open to review details and chat with your agent.";
        const cleaned = summary
            .replace(/^#+\s+/gm, "")
            .replace(/\*\*/g, "")
            .replace(/\n+/g, " ")
            .trim();
        return cleaned.length > 160 ? cleaned.slice(0, 160) + "..." : cleaned;
    };

    return (
        <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        <SparklesIcon className="size-4.5" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-foreground tracking-tight">
                            Recent Meeting Intelligence
                        </h2>
                        <p className="text-xs text-muted-foreground">
                            AI summaries, takeaways, and agent chats
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
                            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
                        ))}
                    </div>
                ) : completedMeetings.length > 0 ? (
                    completedMeetings.map((meeting) => (
                        <div
                            key={meeting.id}
                            className="group relative flex flex-col p-4 rounded-xl border border-border/50 hover:border-purple-500/30 bg-background/50 hover:bg-muted/40 transition-all duration-200 gap-3"
                        >
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-3">
                                    <GeneratedAvatar
                                        seed={meeting.agent?.name || "Agent"}
                                        variant="botttsNeutral"
                                        className="size-9 shrink-0 ring-1 ring-border/50"
                                    />
                                    <div>
                                        <Link
                                            href={`/meetings/${meeting.id}`}
                                            className="text-sm font-semibold text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
                                        >
                                            {meeting.name}
                                            <CheckCircle2Icon className="size-3.5 text-emerald-500 shrink-0" />
                                        </Link>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                            <span>Agent: <strong className="text-foreground font-medium">{meeting.agent?.name}</strong></span>
                                            <span>•</span>
                                            <span suppressHydrationWarning>{meeting.endedAt ? format(new Date(meeting.endedAt), "MMM d, yyyy") : "Completed"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {meeting.duration && Number(meeting.duration) > 0 && (
                                        <Badge variant="secondary" className="text-xs font-normal gap-1 bg-muted/80">
                                            <ClockIcon className="size-3 text-muted-foreground" />
                                            {Number(meeting.duration) > 60
                                                ? `${Math.round(Number(meeting.duration) / 60)} mins`
                                                : `${meeting.duration}s`}
                                        </Badge>
                                    )}
                                    <Button size="sm" variant="outline" asChild className="text-xs hover:bg-primary hover:text-primary-foreground transition-all">
                                        <Link href={`/meetings/${meeting.id}`} className="inline-flex items-center gap-1.5">
                                            <MessageSquareIcon className="size-3.5" />
                                            Chat with Agent
                                        </Link>
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground leading-relaxed border border-border/30">
                                <div className="flex items-center gap-1.5 font-medium text-foreground mb-1">
                                    <FileTextIcon className="size-3 text-purple-500" />
                                    <span>Executive Summary Preview</span>
                                </div>
                                <p className="line-clamp-2">
                                    {cleanSummaryPreview(meeting.summary)}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border/80 bg-muted/20">
                        <div className="size-10 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto mb-3">
                            <SparklesIcon className="size-5" />
                        </div>
                        <h3 className="text-sm font-semibold text-foreground">No completed meetings yet</h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                            When your calls finish, Gemini automatically generates structured summaries, action items, and conversational intelligence here.
                        </p>
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/meetings">
                                Explore Meetings
                            </Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
