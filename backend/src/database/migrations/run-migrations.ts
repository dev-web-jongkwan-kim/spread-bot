import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables (already loaded by NestJS ConfigModule)

async function runMigrations() {
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    migrations: [path.join(__dirname, '*.sql')],
    migrationsRun: false,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established');

    // Check if migrations table exists
    const migrationsTableExists = await dataSource.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);

    if (!migrationsTableExists[0].exists) {
      console.log('Creating migrations table...');
      await dataSource.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }

    // Get all migration files
    const migrationFiles = fs
      .readdirSync(__dirname)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    console.log(`Found ${migrationFiles.length} migration files`);

    // Execute each migration
    for (const file of migrationFiles) {
      const migrationName = file.replace('.sql', '');
      
      // Check if already executed
      const executed = await dataSource.query(
        'SELECT id FROM migrations WHERE name = $1',
        [migrationName],
      );

      if (executed.length > 0) {
        console.log(`✓ Migration ${migrationName} already executed, skipping`);
        continue;
      }

      console.log(`Running migration: ${migrationName}...`);
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      
      await dataSource.query(sql);
      await dataSource.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [migrationName],
      );

      console.log(`✓ Migration ${migrationName} completed`);
    }

    console.log('All migrations completed successfully');
    await dataSource.destroy();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();

