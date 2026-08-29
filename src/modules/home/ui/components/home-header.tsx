"use client";

import { useEffect, useState } from "react";
import { PlusIcon, VideoIcon, BotIcon, SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewMeetingsDialog } from "@/modules/meetings/ui/components/new-meeting-dialog";
import { NewAgentDialog } from "@/modules/agents/ui/components/new-agent-dialog";
import { authClient } from "@/lib/auth-client";

export const HomeHeader = () => {
    const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
    const [agentDialogOpen, setAgentDialogOpen] = useState(false);
    const [formattedDate, setFormattedDate] = useState<string>("");
    const { data: session } = authClient.useSession();

    useEffect(() => {
        setFormattedDate(
            new Intl.DateTimeFormat("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
            }).format(new Date())
        );
    }, []);

    const userName = session?.user?.name ? session.user.name.split(" ")[0] : "there";

    return (
        <>
            <NewMeetingsDialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen} />
            <NewAgentDialog open={agentDialogOpen} onOpenChange={setAgentDialogOpen} />

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sidebar via-sidebar/95 to-sidebar-accent/80 text-white p-6 sm:p-8 shadow-md border border-sidebar-border/20">
                <div className="absolute -right-16 -top-16 size-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
                <div className="absolute -left-16 -bottom-16 size-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-emerald-300 backdrop-blur-sm border border-white/10">
                            <SparklesIcon className="size-3.5 animate-pulse" />
                            <span suppressHydrationWarning>{formattedDate || "AI Workspace Active"}</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                            Welcome back, {userName}! 👋
                        </h1>
                        <p className="text-sm text-sidebar-foreground max-w-xl">
                            Conduct real-time voice meetings with your custom AI agents, generate instant summaries, and chat with meeting intelligence.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            onClick={() => setMeetingDialogOpen(true)}
                            size="lg"
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <VideoIcon className="size-4 mr-2" />
                            New Meeting
                        </Button>
                        <Button
                            onClick={() => setAgentDialogOpen(true)}
                            variant="secondary"
                            size="lg"
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <BotIcon className="size-4 mr-2 text-emerald-400" />
                            New Agent
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
};
