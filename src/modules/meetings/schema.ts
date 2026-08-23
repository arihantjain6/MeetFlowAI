import { z } from "zod";

import { MeetingStatus } from "./types";

export const meetingsInsertSchema = z.object({
    name: z.string().min(1, "Name is required"),
    agentId: z.string().min(1, { message: "Agent is required" })
})

export const meetingsUpdateSchema = meetingsInsertSchema.partial().extend({
    id: z.string().min(1, { message: "Id is required" }),
});