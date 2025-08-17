import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTicketsAiInvocations1721155200000 implements MigrationInterface {
  name = 'CreateTicketsAiInvocations1721155200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tickets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "source" varchar(20) NOT NULL,
        "subject" text NOT NULL,
        "description" text NOT NULL,
        "summary" text,
        "type" varchar(20),
        "status" varchar(20) NOT NULL DEFAULT 'open',
        "priority" varchar(10),
        "suggested_reply" text,
        "reason" text,
        "context" jsonb,
        "created_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ai_invocations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "ticket_id" uuid REFERENCES tickets(id) ON DELETE CASCADE,
        "operation" varchar(40) NOT NULL,
        "model" varchar(64) NOT NULL,
        "prompt_tokens" int NOT NULL DEFAULT 0,
        "completion_tokens" int NOT NULL DEFAULT 0,
        "cost_usd" numeric(10,6) NOT NULL DEFAULT 0,
        "latency_ms" int,
        "request_snapshot" jsonb,
        "response_snapshot" jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_tickets_type ON tickets(type);`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_ai_invocations_ticket ON ai_invocations(ticket_id);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "ai_invocations"');
    await queryRunner.query('DROP TABLE IF EXISTS "tickets"');
  }
}
