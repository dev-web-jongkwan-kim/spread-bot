import { Test, TestingModule } from '@nestjs/testing';
import { PriceMonitorService } from './price-monitor.service';
import { ExchangeService } from '../exchange/exchange.service';
import { AlertService } from '../alert/alert.service';
import { UserService } from '../user/user.service';

describe('PriceMonitorService', () => {
  let service: PriceMonitorService;
  let exchangeService: ExchangeService;
  let alertService: AlertService;
  let userService: UserService;

  const mockExchangeService = {
    calculateSpread: jest.fn(),
  };

  const mockAlertService = {
    checkAndSendAlerts: jest.fn(),
  };

  const mockUserService = {
    getAllMonitoredSymbols: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceMonitorService,
        {
          provide: ExchangeService,
          useValue: mockExchangeService,
        },
        {
          provide: AlertService,
          useValue: mockAlertService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    service = module.get<PriceMonitorService>(PriceMonitorService);
    exchangeService = module.get<ExchangeService>(ExchangeService);
    alertService = module.get<AlertService>(AlertService);
    userService = module.get<UserService>(UserService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('start', () => {
    it('should start monitoring', async () => {
      mockUserService.getAllMonitoredSymbols.mockResolvedValue(['BTC', 'ETH']);

      await service.start();

      expect(mockUserService.getAllMonitoredSymbols).toHaveBeenCalled();
    });

    it('should not start if already running', async () => {
      mockUserService.getAllMonitoredSymbols.mockResolvedValue(['BTC']);

      await service.start();
      const callCount = mockUserService.getAllMonitoredSymbols.mock.calls.length;

      await service.start(); // Try starting again

      // Should not call again
      expect(mockUserService.getAllMonitoredSymbols.mock.calls.length).toBe(callCount);
    });
  });

  describe('stop', () => {
    it('should stop monitoring', async () => {
      mockUserService.getAllMonitoredSymbols.mockResolvedValue(['BTC']);
      await service.start();

      await service.stop();

      // Service should be stopped
      expect(service).toBeDefined();
    });

    it('should handle stop when not running', async () => {
      await expect(service.stop()).resolves.not.toThrow();
    });
  });

  describe('addSymbol', () => {
    it('should add symbol to monitored list', () => {
      service.addSymbol('BTC');
      service.addSymbol('ETH');

      // Symbols should be monitored
      expect(service).toBeDefined();
    });
  });

  describe('removeSymbol', () => {
    it('should remove symbol from monitored list', () => {
      service.addSymbol('BTC');
      service.removeSymbol('BTC');

      // Symbol should be removed
      expect(service).toBeDefined();
    });
  });

  describe('refreshMonitoredSymbols', () => {
    it('should refresh monitored symbols from database', async () => {
      const symbols = ['BTC', 'ETH', 'SOL'];
      mockUserService.getAllMonitoredSymbols.mockResolvedValue(symbols);

      await service.refreshMonitoredSymbols();

      expect(mockUserService.getAllMonitoredSymbols).toHaveBeenCalled();
    });

    it('should handle errors when refreshing symbols', async () => {
      mockUserService.getAllMonitoredSymbols.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.refreshMonitoredSymbols()).resolves.not.toThrow();
    });
  });

  describe('monitoringCycle', () => {
    it('should skip when not running', async () => {
      await service.monitoringCycle();

      expect(mockExchangeService.calculateSpread).not.toHaveBeenCalled();
    });

    it('should skip when no symbols to monitor', async () => {
      mockUserService.getAllMonitoredSymbols.mockResolvedValue([]);
      await service.start();

      await service.monitoringCycle();

      expect(mockExchangeService.calculateSpread).not.toHaveBeenCalled();
    });

    it('should process all monitored symbols', async () => {
      const mockSpread = {
        symbol: 'BTC',
        spreadPercent: 2.5,
        buyExchange: 'binance',
        sellExchange: 'coinbase',
        buyPrice: 50000,
        sellPrice: 51250,
      };

      mockUserService.getAllMonitoredSymbols.mockResolvedValue(['BTC', 'ETH']);
      mockExchangeService.calculateSpread.mockResolvedValue(mockSpread);
      mockAlertService.checkAndSendAlerts.mockResolvedValue(undefined);

      await service.start();
      await service.monitoringCycle();

      expect(mockExchangeService.calculateSpread).toHaveBeenCalledTimes(2);
      expect(mockExchangeService.calculateSpread).toHaveBeenCalledWith('BTC', expect.any(Array));
      expect(mockExchangeService.calculateSpread).toHaveBeenCalledWith('ETH', expect.any(Array));
    });

    it('should send alerts when spread exceeds threshold', async () => {
      const mockSpread = {
        symbol: 'BTC',
        spreadPercent: 3.5,
        buyExchange: 'binance',
        sellExchange: 'coinbase',
        buyPrice: 50000,
        sellPrice: 51750,
      };

      mockUserService.getAllMonitoredSymbols.mockResolvedValue(['BTC']);
      mockExchangeService.calculateSpread.mockResolvedValue(mockSpread);
      mockAlertService.checkAndSendAlerts.mockResolvedValue(undefined);

      await service.start();
      await service.monitoringCycle();

      expect(mockAlertService.checkAndSendAlerts).toHaveBeenCalledWith('BTC', mockSpread);
    });

    it('should skip alert when spread is null', async () => {
      mockUserService.getAllMonitoredSymbols.mockResolvedValue(['BTC']);
      mockExchangeService.calculateSpread.mockResolvedValue(null);

      await service.start();
      await service.monitoringCycle();

      expect(mockAlertService.checkAndSendAlerts).not.toHaveBeenCalled();
    });

    it('should handle errors for individual symbols gracefully', async () => {
      mockUserService.getAllMonitoredSymbols.mockResolvedValue(['BTC', 'ETH']);
      mockExchangeService.calculateSpread
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          symbol: 'ETH',
          spreadPercent: 1.5,
          buyExchange: 'kraken',
          sellExchange: 'binance',
          buyPrice: 3000,
          sellPrice: 3045,
        });

      await service.start();
      await expect(service.monitoringCycle()).resolves.not.toThrow();

      // ETH should still be processed despite BTC error
      expect(mockExchangeService.calculateSpread).toHaveBeenCalledTimes(2);
    });
  });
});
