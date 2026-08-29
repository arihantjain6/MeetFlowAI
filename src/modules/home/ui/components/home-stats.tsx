"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { VideoIcon, BotIcon, ClockIcon, SparklesIcon, ArrowUpRightIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { MAX_FREE_MEETINGS, MAX_FREE_AGENTS } from "@/modules/premium/constants";
import Link from "next/link";
import { formatDuration } from "@/lib/utils";

export const HomeStats = () => {
    const trpc = useTRPC();

    const { data: meetingsData } = useQuery(
        trpc.meetings.getMany.queryOptions({
            page: 1,
            pageSize: 100,
        })
    );

    const { data: agentsData } = useQuery(
        trpc.agents.getMany.queryOptions({
            page: 1,
            pageSize: 100,
        })
    );

    const { data: freeUsage } = useQuery(
        trpc.premium.getFreeUsage.queryOptions()
    );

    const { data: subscription } = useQuery(
        trpc.premium.getCurrentSubscription.queryOptions()
    );

    const totalMeetings = meetingsData?.total ?? 0;
    const completedMeetings = meetingsData?.items.filter(m => m.status === "completed").length ?? 0;
    const upcomingMeetings = meetingsData?.items.filter(m => m.status === "upcoming" || m.status === "active").length ?? 0;
    const totalAgents = agentsData?.total ?? 0;

    const totalSeconds = meetingsData?.items.reduce((acc, m) => {
        return acc + (Number(m.duration) || 0);
    }, 0) ?? 0;

    const formattedDuration = totalSeconds > 3600
        ? `${(totalSeconds / 3600).toFixed(1)} hrs`
        : totalSeconds > 60
        ? `${Math.round(totalSeconds / 60)} mins`
        : `${totalSeconds}s`;

    const isPro = !!subscription;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-border/60 shadow-xs hover:shadow-md transition-all duration-200 bg-card/80 backdrop-blur-xs">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Total Meetings
                        </span>
                        <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <VideoIcon className="size-4" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-2xl font-bold tracking-tight text-foreground">
                            {totalMeetings}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                {completedMeetings} completed
                            </span>
                            • {upcomingMeetings} scheduled
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-xs hover:shadow-md transition-all duration-200 bg-card/80 backdrop-blur-xs">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            AI Agents
                        </span>
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <BotIcon className="size-4" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-2xl font-bold tracking-tight text-foreground">
                            {totalAgents}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Ready for live voice & Gemini chat
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-xs hover:shadow-md transition-all duration-200 bg-card/80 backdrop-blur-xs">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Time Transcribed
                        </span>
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <ClockIcon className="size-4" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="text-2xl font-bold tracking-tight text-foreground">
                            {formattedDuration}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Analyzed & summarized by AI
                        </p>
                    </div>
                </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-xs hover:shadow-md transition-all duration-200 bg-card/80 backdrop-blur-xs">
                <CardContent className="p-5 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Workspace Plan
                        </span>
                        <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <SparklesIcon className="size-4" />
                        </div>
                    </div>
                    <div className="mt-4">
                        <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold tracking-tight text-foreground">
                                {isPro ? "Pro Plan" : "Free Trial"}
                            </div>
                            {!isPro && (
                                <Link
                                    href="/upgrade"
                                    className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
                                >
                                    Upgrade <ArrowUpRightIcon className="size-3" />
                                </Link>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {isPro
                                ? "Unlimited meetings & custom agents"
                                : `${freeUsage?.meetingCount ?? 0}/${MAX_FREE_MEETINGS} meetings • ${freeUsage?.agentCount ?? 0}/${MAX_FREE_AGENTS} agents`}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
