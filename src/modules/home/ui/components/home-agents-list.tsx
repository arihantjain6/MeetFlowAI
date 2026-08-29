"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import Link from "next/link";
import { BotIcon, PlusIcon, ArrowRightIcon, VideoIcon, SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { NewAgentDialog } from "@/modules/agents/ui/components/new-agent-dialog";
import { NewMeetingsDialog } from "@/modules/meetings/ui/components/new-meeting-dialog";

export const HomeAgentsList = () => {
    const trpc = useTRPC();
    const [agentDialogOpen, setAgentDialogOpen] = useState(false);
    const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);

    const { data: agentsData, isLoading } = useQuery(
        trpc.agents.getMany.queryOptions({
            page: 1,
            pageSize: 20,
        })
    );

    const agents = agentsData?.items.slice(0, 4) ?? [];

    return (
        <>
            <NewAgentDialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen} />
            <NewMeetingsDialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen} />

            <div className="bg-card border border-border/60 rounded-2xl p-5 sm:p-6 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-border/40">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <BotIcon className="size-4.5" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-foreground tracking-tight">
                                Your AI Agents
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Specialized AI personas for live calls and transcription
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAgentDialogOpen(true)}
                            className="hidden sm:inline-flex text-xs"
                        >
                            <PlusIcon className="size-3.5 mr-1" />
                            New Agent
                        </Button>
                        <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
                            <Link href="/agents" className="inline-flex items-center gap-1">
                                View all <ArrowRightIcon className="size-3" />
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="mt-4">
                    {isLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
                            ))}
                        </div>
                    ) : agents.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {agents.map((agent) => (
                                <div
                                    key={agent.id}
                                    className="group relative flex flex-col justify-between p-4 rounded-xl border border-border/50 hover:border-indigo-500/40 bg-background/50 hover:bg-muted/40 transition-all duration-200"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2">
                                            <GeneratedAvatar
                                                seed={agent.name}
                                                variant="botttsNeutral"
                                                className="size-11 ring-2 ring-indigo-500/20 group-hover:scale-105 transition-transform"
                                            />
                                            <Badge variant="secondary" className="text-[11px] font-normal">
                                                {agent.meetingCount ?? 0} {(agent.meetingCount ?? 0) === 1 ? "meeting" : "meetings"}
                                            </Badge>
                                        </div>

                                        <div className="mt-3">
                                            <Link
                                                href={`/agents/${agent.id}`}
                                                className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
                                            >
                                                {agent.name}
                                            </Link>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                                {agent.instructions || "Standard meeting assistant ready to listen and answer."}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            asChild
                                            className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
                                        >
                                            <Link href={`/agents/${agent.id}`}>
                                                <SettingsIcon className="size-3.5 mr-1" />
                                                Edit
                                            </Link>
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={() => setMeetingDialogOpen(true)}
                                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white h-8 px-2.5"
                                        >
                                            <VideoIcon className="size-3.5 mr-1" />
                                            Meet
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border/80 bg-muted/20">
                            <div className="size-10 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                                <BotIcon className="size-5" />
                            </div>
                            <h3 className="text-sm font-semibold text-foreground">No AI agents yet</h3>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                                Create customized AI personas with specific roles, instructions, and vocal styles.
                            </p>
                            <Button
                                onClick={() => setAgentDialogOpen(true)}
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                <PlusIcon className="size-3.5 mr-1.5" />
                                Create Your First Agent
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
