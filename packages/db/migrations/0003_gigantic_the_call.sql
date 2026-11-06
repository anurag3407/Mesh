CREATE TABLE "agent_reads" (
	"agent_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"last_read_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_reads_agent_id_room_id_pk" PRIMARY KEY("agent_id","room_id")
);
--> statement-breakpoint
ALTER TABLE "agent_reads" ADD CONSTRAINT "agent_reads_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_reads" ADD CONSTRAINT "agent_reads_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;