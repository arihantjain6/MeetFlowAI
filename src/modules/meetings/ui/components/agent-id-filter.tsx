import { useState } from "react"; 
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/trpc/server";
import { CommandSelect } from "@/components/command-select";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { useMeetingsFilters } from "../../hooks/use-meetings-filters";
import { useTRPC } from "@/trpc/client";

export const AgentIdFilter = () => {
    const [ filters, setFilters ] = useMeetingsFilters();
    const trpc = useTRPC();
    
    const [ agentSearch, setAgentSearch ] = useState("");
    
    const { data } = useQuery(trpc.agents.getMany.queryOptions({ pageSize:100,  search: agentSearch }));

    return (
        <CommandSelect 
            className="w-auto min-w-[100px] h-9"
            placeholder="Agent"
            options={(
                data?.items ?? []).map((agent) => ({
                id: agent.id,
                value: agent.id,
                children: (
                    <div className="flex items-center gap-x-2">
                    <GeneratedAvatar variant="botttsNeutral" seed={agent.name} className="size-4" />
                    {agent.name}
                    </div>
                ),    
            }))}
            onSelect={(value) => setFilters({ agentId: value })}
            onSearch={setAgentSearch}
            value={filters.agentId ?? ""}
        />
    )
}