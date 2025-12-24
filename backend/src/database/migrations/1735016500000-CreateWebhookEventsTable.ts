import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWebhookEventsTable1735016500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE webhook_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_name VARCHAR(100) NOT NULL,
        subscription_id VARCHAR(255),
        user_id UUID,
        payload JSONB,
        status VARCHAR(50) DEFAULT 'success',
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_webhook_events_event_name_created
      ON webhook_events(event_name, created_at DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_webhook_events_subscription_id
      ON webhook_events(subscription_id)
      WHERE subscription_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_webhook_events_subscription_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_webhook_events_event_name_created`);
    await queryRunner.query(`DROP TABLE IF EXISTS webhook_events`);
  }
}
