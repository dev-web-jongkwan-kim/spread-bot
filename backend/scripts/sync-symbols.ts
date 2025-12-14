import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SymbolService } from '../src/symbol/symbol.service';

async function syncSymbols() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const symbolService = app.get(SymbolService);

  try {
    console.log('Starting symbol sync...');
    await symbolService.syncAll();
    console.log('Symbol sync completed successfully!');
  } catch (error) {
    console.error('Symbol sync failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

syncSymbols();

