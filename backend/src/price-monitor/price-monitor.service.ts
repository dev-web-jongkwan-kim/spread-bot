import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ExchangeService } from '../exchange/exchange.service';
import { AlertService } from '../alert/alert.service';
import { UserService } from '../user/user.service';
import { MVP_EXCHANGES } from '../common/constants';

@Injectable()
export class PriceMonitorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PriceMonitorService.name);
  private monitoredSymbols: Set<string> = new Set();
  private isRunning = false;

  constructor(
    private readonly exchangeService: ExchangeService,
    private readonly alertService: AlertService,
    private readonly userService: UserService,
  ) {}

  async onModuleInit() {
    await this.start();
  }

  async onModuleDestroy() {
    await this.stop();
  }

  async start() {
    if (this.isRunning) {
      this.logger.warn('Price monitor is already running');
      return;
    }

    await this.refreshMonitoredSymbols();
    this.isRunning = true;
    this.logger.log('Price monitor started');
  }

  async stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.logger.log('Price monitor stopped');
  }

  @Cron('*/10 * * * * *') // Every 10 seconds
  async monitoringCycle() {
    if (!this.isRunning || this.monitoredSymbols.size === 0) {
      return;
    }

    this.logger.debug(`Monitoring cycle started for ${this.monitoredSymbols.size} symbols`);

    const tasks = Array.from(this.monitoredSymbols).map((symbol) =>
      this.processSymbol(symbol),
    );

    await Promise.allSettled(tasks);
  }

  @Cron('*/5 * * * *') // Every 5 minutes
  async refreshMonitoredSymbols() {
    try {
      const symbols = await this.userService.getAllMonitoredSymbols();
      this.monitoredSymbols = new Set(symbols);
      this.logger.log(`Refreshed monitored symbols: ${this.monitoredSymbols.size} symbols`);
    } catch (error) {
      this.logger.error(`Failed to refresh monitored symbols: ${error.message}`);
    }
  }

  private async processSymbol(symbol: string) {
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'price-monitor.service.ts:processSymbol',message:'Processing symbol',data:{symbol,exchanges:MVP_EXCHANGES},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      const spread = await this.exchangeService.calculateSpread(
        symbol,
        MVP_EXCHANGES,
      );

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'price-monitor.service.ts:processSymbol',message:'Spread calculated',data:{symbol,spread:spread?{spreadPercent:spread.spreadPercent,buyExchange:spread.buyExchange,sellExchange:spread.sellExchange}:null},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      if (!spread) {
        this.logger.debug(`No spread calculated for ${symbol}`);
        return;
      }

      this.logger.debug(`Spread for ${symbol}: ${spread.spreadPercent.toFixed(2)}% (${spread.buyExchange} -> ${spread.sellExchange})`);
      
      await this.alertService.checkAndSendAlerts(symbol, spread);
    } catch (error) {
      this.logger.error(`Error processing symbol ${symbol}: ${error.message}`);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'price-monitor.service.ts:processSymbol',message:'Error processing symbol',data:{symbol,error:error.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
    }
  }

  addSymbol(symbol: string) {
    this.monitoredSymbols.add(symbol);
    this.logger.log(`Added symbol to monitor: ${symbol}`);
  }

  removeSymbol(symbol: string) {
    this.monitoredSymbols.delete(symbol);
    this.logger.log(`Removed symbol from monitor: ${symbol}`);
  }
}


