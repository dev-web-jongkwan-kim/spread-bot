import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConstraintsAndIndexes1735016400000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add UNIQUE constraint to lsSubscriptionId (only for non-null values)
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_users_ls_subscription_id
      ON users(ls_subscription_id)
      WHERE ls_subscription_id IS NOT NULL
    `);

    // 2. Add index for webhook lookups
    await queryRunner.query(`
      CREATE INDEX idx_users_ls_subscription_id
      ON users(ls_subscription_id)
      WHERE ls_subscription_id IS NOT NULL
    `);

    // 3. Add index for plan-based queries
    await queryRunner.query(`
      CREATE INDEX idx_users_plan
      ON users(plan)
    `);

    // 4. Add index for alert queries
    await queryRunner.query(`
      CREATE INDEX idx_alerts_user_id_created
      ON alerts(user_id, created_at DESC)
    `);

    // 5. Add index for user coins
    await queryRunner.query(`
      CREATE INDEX idx_user_coins_symbol_active
      ON user_coins(symbol, is_active)
    `);

    // 6. Add index for user exchanges
    await queryRunner.query(`
      CREATE INDEX idx_user_exchanges_exchange_active
      ON user_exchanges(exchange_id, is_active)
    `);

    // 7. Add columns for payment failure tracking
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS payment_failed_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS payment_failure_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop in reverse order
    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS deleted_at,
      DROP COLUMN IF EXISTS is_deleted,
      DROP COLUMN IF EXISTS payment_failure_count,
      DROP COLUMN IF EXISTS grace_period_ends_at,
      DROP COLUMN IF EXISTS payment_failed_at
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_exchanges_exchange_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_user_coins_symbol_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_alerts_user_id_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_plan`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_ls_subscription_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS uq_users_ls_subscription_id`);
  }
}
