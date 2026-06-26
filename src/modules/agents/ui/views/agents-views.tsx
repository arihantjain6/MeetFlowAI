"use client"

import { LoadingState } from "@/components/loading-state";
import { ErrorState } from "@/components/error-state";
import { useTRPC } from "@/trpc/client";

import { useSuspenseQuery } from "@tanstack/react-query";

export const AgentsView = () => {
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(trpc.agents.getMany.queryOptions());

    return (
        <div>
            {JSON.stringify(data, null, 2)}
        </div>
    )

}

export const AgentViewLoading = () => {
    return (
        <LoadingState 
        title="Loading Agents"
        description="Please wait while we fetch your agents..."
        />
    )
} 

export const AgentViewError = () => {
    return (
        <ErrorState 
        title="Failed to load agents"
        description="Please try again later..."
        />
    )
}