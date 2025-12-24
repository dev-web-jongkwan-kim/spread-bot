import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshTokensTable1735016600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        token VARCHAR(500) UNIQUE NOT NULL,
        user_id UUID NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        is_revoked BOOLEAN DEFAULT FALSE,
        user_agent VARCHAR(255),
        ip_address VARCHAR(45),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX idx_refresh_tokens_token
      ON refresh_tokens(token)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_refresh_tokens_user_id_expires_at
      ON refresh_tokens(user_id, expires_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_refresh_tokens_user_id_expires_at`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_refresh_tokens_token`);
    await queryRunner.query(`DROP TABLE IF EXISTS refresh_tokens`);
  }
}
