import { Controller, Post, UseGuards, Logger } from '@nestjs/common';
import { SymbolService } from './symbol.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('api/admin/symbols')
@UseGuards(AuthGuard)
export class SymbolController {
  private readonly logger = new Logger(SymbolController.name);

  constructor(private readonly symbolService: SymbolService) {}

  @Post('sync')
  async syncSymbols() {
    this.logger.log('Manual symbol sync triggered');
    try {
      await this.symbolService.syncAll();
      return { message: 'Symbol sync completed successfully' };
    } catch (error) {
      this.logger.error(`Symbol sync failed: ${error.message}`);
      throw error;
    }
  }

  @Post('sync/binance')
  async syncBinanceSymbols() {
    this.logger.log('Manual Binance symbol sync triggered');
    try {
      await this.symbolService.syncSymbolsFromBinance();
      return { message: 'Binance symbol sync completed successfully' };
    } catch (error) {
      this.logger.error(`Binance symbol sync failed: ${error.message}`);
      throw error;
    }
  }

  @Post('sync/exchanges')
  async syncExchangeSymbols() {
    this.logger.log('Manual exchange symbol sync triggered');
    try {
      await this.symbolService.syncExchangeSymbols();
      return { message: 'Exchange symbol sync completed successfully' };
    } catch (error) {
      this.logger.error(`Exchange symbol sync failed: ${error.message}`);
      throw error;
    }
  }
}

