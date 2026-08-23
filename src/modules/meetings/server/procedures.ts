import { db } from "@/db";
import { agents, meetings } from "@/db/schema";
import {
  createTRPCRouter,
  protectedProcedure,
} from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import z from "zod";
import { and, count, desc, eq, getTableColumns, ilike, sql } from "drizzle-orm";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE_SIZE,
} from "@/constants";
import { meetingsInsertSchema, meetingsUpdateSchema } from "../schema";
import { MeetingStatus } from "../types";
import { generateAvatarUri } from "@/lib/avatar";
import { streamVideo } from "@/lib/stream-video";
import { GoogleGenAI } from "@google/genai";

export const meetingsRouter = createTRPCRouter({

  generateToken: protectedProcedure.mutation(async ({ctx})=>{
    await streamVideo.upsertUsers([
        {
            id:ctx.auth.user.id,
            name:ctx.auth.user.name,
            role:"admin",
            image:
            ctx.auth.user.image ?? generateAvatarUri({
                seed:ctx.auth.user.id,
                variant:"initials"
            })
        }
    ])
    const expirationTime = Math.floor(Date.now() / 1000) + 3600;
    const issueAt = Math.floor(Date.now() / 1000)-60;
 
    const token = streamVideo.generateUserToken({
      user_id: ctx.auth.user.id,
      exp: expirationTime,
      validity_in_seconds: issueAt,
    });

    return token;
  }),

  generateAgentToken: protectedProcedure
    .input(z.object({ agentId: z.string(), meetingId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [result] = await db
        .select({
          agent: agents,
        })
        .from(meetings)
        .innerJoin(agents, eq(meetings.agentId, agents.id))
        .where(
          and(
            eq(meetings.id, input.meetingId),
            eq(meetings.userId, ctx.auth.user.id),
            eq(agents.id, input.agentId)
          )
        );

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found",
        });
      }

      const existingAgent = result.agent;

      await streamVideo.upsertUsers([
        {
          id: existingAgent.id,
          name: existingAgent.name,
          role: "user",
          image: generateAvatarUri({ seed: existingAgent.name, variant: "botttsNeutral" }),
        },
      ]);

      const expirationTime = Math.floor(Date.now() / 1000) + 3600;
      const issueAt = Math.floor(Date.now() / 1000) - 60;

      const token = streamVideo.generateUserToken({
        user_id: existingAgent.id,
        exp: expirationTime,
        validity_in_seconds: issueAt,
      });

      return token;
    }),

  generateEphemeralToken: protectedProcedure
    .mutation(async () => {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins
      const newSessionExpireTime = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min

      const token = await ai.authTokens.create({
        config: {
          uses: 1,
          expireTime: expireTime,
          newSessionExpireTime: newSessionExpireTime,
          httpOptions: { apiVersion: "v1alpha" },
        },
      });

      console.log("[Gemini Token Debug] Generated token response:", JSON.stringify(token));
      if (!token.name) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate ephemeral token",
        });
      }
      return token.name;
    }),

  remove: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { id } = input;
        const [removedMeeting] = await db
          .delete(meetings)
          .where(and(eq(meetings.id, id), eq(meetings.userId, ctx.auth.user.id)))
          .returning();
  
        if (!removedMeeting) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Meeting not found",
          });
        }
        return removedMeeting;
      }),

  update: protectedProcedure
      .input(meetingsUpdateSchema)
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const [updateMeeting] = await db
          .update(meetings)
          .set(data)
          .where(and(eq(meetings.id, id), eq(meetings.userId, ctx.auth.user.id)))
          .returning();
  
        if (!updateMeeting) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Meeting not found",
          });
        }
        return updateMeeting;
      }),

  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      const [updatedMeeting] = await db
        .update(meetings)
        .set({ status: MeetingStatus.Cancelled })
        .where(
          and(
            eq(meetings.id, id),
            eq(meetings.userId, ctx.auth.user.id),
            eq(meetings.status, MeetingStatus.Upcoming)
          )
        )
        .returning();

      if (!updatedMeeting) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Meeting not found or cannot be cancelled (must be upcoming)",
        });
      }

      return updatedMeeting;
    }),

  create: protectedProcedure
      .input(meetingsInsertSchema)
      .mutation(async ({ input, ctx }) => {
        const [createdMeeting] = await db
          .insert(meetings)
          .values({ ...input, userId: ctx.auth.user.id })
          .returning();

        const call = streamVideo.video.call("default", createdMeeting.id);
        await call.create({
          data: {
            created_by_id: ctx.auth.user.id,
            custom: {
              meetingId: createdMeeting.id,
              meetingName: createdMeeting.name,
            },
            settings_override: {
              transcription: {
                language: "en",
                mode: "auto-on",
                closed_caption_mode: "auto-on",
              },
              recording: {
                mode: "auto-on",
                quality: "1080p",
              },
            },
          },
        });

        const [existingAgent] = await db
          .select()
          .from(agents)
          .where(eq(agents.id, createdMeeting.agentId))        
        if(!existingAgent){
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Agent not found",
          });
        }
        await streamVideo.upsertUsers([{
          id: existingAgent.id,
          name: existingAgent.name,
          role: "user",
          image: generateAvatarUri({seed:existingAgent.name,variant:"botttsNeutral"})
        }])

        return createdMeeting;
      }),

  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const [existingMeeting] = await db 
        .select({ ...getTableColumns(meetings),
          agent: agents,
          duration: sql<number>`EXTRACT(EPOCH FROM (ended_at - started_at))`.as("duration"),
        })
        .from(meetings)
        .innerJoin(agents, eq(meetings.agentId, agents.id))
        .where(
          and(eq(meetings.id, input.id), eq(meetings.userId, ctx.auth.user.id)),
        );

      if (!existingMeeting) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found",
        });
      }

      return existingMeeting;
    }),
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(MIN_PAGE_SIZE)
          .max(MAX_PAGE_SIZE)
          .default(DEFAULT_PAGE_SIZE),
        search: z.string().nullish(),
        agentId: z.string().nullish(),
        status: z.enum([
          MeetingStatus.Upcoming,
          MeetingStatus.Active,
          MeetingStatus.Completed,
          MeetingStatus.Processing,
          MeetingStatus.Cancelled,
        ])
        .nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { search, page, pageSize, status, agentId } = input;

      const data = await db
        .select({ ...getTableColumns(meetings),
          agent: agents,
          duration: sql<number>`EXTRACT(EPOCH FROM (ended_at - started_at))`.as("duration"),
         })
        .from(meetings)
        .innerJoin(agents, eq(meetings.agentId, agents.id))
        .where(
          and(
            eq(meetings.userId, ctx.auth.user.id),
            search ? ilike(meetings.name, `%${search}%`) : undefined,
            status ? eq(meetings.status, status) : undefined, 
            agentId ? eq(meetings.agentId, agentId) : undefined,
          ),
        )
        .orderBy(desc(meetings.createdAt), desc(meetings.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      const total = await db
        .select({ count: count() })
        .from(meetings)
        .innerJoin(agents, eq(meetings.agentId, agents.id))

        .where(
          and(
            eq(meetings.userId, ctx.auth.user.id),
            search ? ilike(meetings.name, `%${search}%`) : undefined,
            status ? eq(meetings.status, status) : undefined,
            agentId ? eq(meetings.agentId, agentId) : undefined,
          ),
        );

      const totalPages = Math.ceil(total[0]!.count / pageSize);
      return {
        items: data,
        total: total[0]!.count,
        totalPages,
      };
    }), 
});
