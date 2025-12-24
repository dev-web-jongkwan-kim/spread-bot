import { Controller, Get, Post, Put, Delete, Query, Body, Param, Request, UseGuards, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Alert } from '../database/entities/alert.entity';
import { User } from '../database/entities/user.entity';
import { UserCoin } from '../database/entities/user-coin.entity';
import { UserExchange } from '../database/entities/user-exchange.entity';
import { UnifiedSymbol } from '../database/entities/unified-symbol.entity';
import { UnifiedSymbolExchange } from '../database/entities/unified-symbol-exchange.entity';
import { UserService } from '../user/user.service';
import { SUPPORTED_EXCHANGES, PlanType, Language } from '../common/constants';
import { AuthGuard } from '../auth/auth.guard';
import { SubscriptionService } from '../subscription/subscription.service';
import { ExchangeService } from '../exchange/exchange.service';
import { SymbolService } from '../symbol/symbol.service';
import { CoinGeckoService } from '../coingecko/coingecko.service';
import { normalizeSymbol, normalizePrice } from '../common/symbol-normalizer';
import { AddCoinDto } from './dto/add-coin.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { MuteSettingsDto } from './dto/mute-settings.dto';

@Controller('api')
@UseGuards(AuthGuard)
export class ApiController {
  private readonly logger = new Logger(ApiController.name);

  constructor(
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserCoin)
    private readonly userCoinRepo: Repository<UserCoin>,
    @InjectRepository(UserExchange)
    private readonly userExchangeRepo: Repository<UserExchange>,
    @InjectRepository(UnifiedSymbol)
    private readonly unifiedSymbolRepo: Repository<UnifiedSymbol>,
    @InjectRepository(UnifiedSymbolExchange)
    private readonly unifiedExchangeRepo: Repository<UnifiedSymbolExchange>,
    private readonly userService: UserService,
    private readonly subscriptionService: SubscriptionService,
    private readonly exchangeService: ExchangeService,
    private readonly symbolService: SymbolService,
    private readonly coinGeckoService: CoinGeckoService,
  ) {}

  @Get('alerts')
  async getAlerts(
    @Query('limit') limit?: string,
    @Query('page') page?: string,
    @Request() req?: any,
  ) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const limitNum = limit ? parseInt(limit, 10) : 20;
    const pageNum = page ? parseInt(page, 10) : 1;
    const offset = (pageNum - 1) * limitNum;

    let query = this.alertRepo
      .createQueryBuilder('alert')
      .where('alert.userId = :userId', { userId })
      .orderBy('alert.createdAt', 'DESC');

    // 총 개수 조회 (has_more 판단용)
    const totalCount = await query.getCount();

    // 페이지네이션 적용
    query = query.skip(offset).take(limitNum);

    const alerts = await query.getMany();
    const hasMore = offset + alerts.length < totalCount;

    return {
      items: alerts.map((a) => ({
        id: a.id,
        symbol: a.symbol,
        spread_percent: Number(a.spreadPercent),
        buy_exchange: a.buyExchange,
        buy_price: Number(a.buyPrice),
        sell_exchange: a.sellExchange,
        sell_price: Number(a.sellPrice),
        potential_profit: Number(a.potentialProfit || 0),
        created_at: a.createdAt.toISOString(),
        was_clicked: false, // TODO: 실제 클릭 추적 구현 필요
      })),
      has_more: hasMore,
    };
  }

  @Get('stats')
  async getStats(@Request() req?: any) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalAlerts, todayAlerts] = await Promise.all([
      this.alertRepo.count({ where: { userId } }),
      this.alertRepo
        .createQueryBuilder('alert')
        .where('alert.userId = :userId', { userId })
        .andWhere('alert.createdAt >= :today', { today })
        .getCount(),
    ]);

    const avgSpreadResult = await this.alertRepo
      .createQueryBuilder('alert')
      .select('AVG(alert.spreadPercent)', 'avg')
      .where('alert.userId = :userId', { userId })
      .getRawOne();

    return {
      total_alerts: totalAlerts,
      today_alerts: todayAlerts,
      avg_spread: avgSpreadResult?.avg ? Number(avgSpreadResult.avg) : 0,
    };
  }

  @Get('coins')
  async getCoins(@Request() req: any) {
    const userId = req?.user?.id;
    if (!userId) {
      return [];
    }

    const user = await this.userService.getById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.coins
      ?.filter((c) => c.isActive)
      .map((c) => ({
        symbol: c.symbol,
        price: null, // TODO: 가격 정보 추가
        change_24h: null, // TODO: 24h 변동률 추가
        threshold: c.threshold !== null && c.threshold !== undefined ? Number(c.threshold) : null,
      })) || [];
  }

  @Post('coins')
  async addCoin(@Body() body: AddCoinDto, @Request() req: any) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userService.getById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!this.userService.canAddCoin(user)) {
      throw new BadRequestException('Coin limit reached');
    }

    const symbol = body.symbol.toUpperCase();
    const existing = await this.userCoinRepo.findOne({
      where: { userId, symbol, isActive: true },
    });

    if (existing) {
      return { message: 'Coin already added' };
    }

    // 기존에 비활성화된 코인이 있으면 활성화
    const inactive = await this.userCoinRepo.findOne({
      where: { userId, symbol, isActive: false },
    });

    if (inactive) {
      inactive.isActive = true;
      await this.userCoinRepo.save(inactive);
      return { message: 'Coin reactivated' };
    }

    // 새로 추가
    const userCoin = this.userCoinRepo.create({
      userId,
      symbol,
      isActive: true,
    });
    await this.userCoinRepo.save(userCoin);

    return { message: 'Coin added' };
  }

  @Delete('coins/:symbol')
  async removeCoin(@Param('symbol') symbol: string, @Request() req: any) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const userCoin = await this.userCoinRepo.findOne({
      where: { userId, symbol: symbol.toUpperCase(), isActive: true },
    });

    if (!userCoin) {
      throw new NotFoundException('Coin not found');
    }

    userCoin.isActive = false;
    await this.userCoinRepo.save(userCoin);

    return { message: 'Coin removed' };
  }

  @Put('coins/:symbol/threshold')
  async updateCoinThreshold(
    @Param('symbol') symbol: string,
    @Body() body: { threshold: number | null },
    @Request() req: any,
  ) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const userCoin = await this.userCoinRepo.findOne({
      where: { userId, symbol: symbol.toUpperCase(), isActive: true },
    });

    if (!userCoin) {
      throw new NotFoundException('Coin not found');
    }

    // null이면 기본값 사용, 아니면 검증
    if (body.threshold !== null) {
      const threshold = Number(body.threshold);
      if (isNaN(threshold) || threshold < 0.01 || threshold > 10.0) {
        throw new BadRequestException('Invalid threshold value. Must be between 0.01 and 10.0');
      }
      // 소수점 두자리로 반올림
      userCoin.threshold = Math.round(threshold * 100) / 100;
    } else {
      userCoin.threshold = null; // 기본값 사용
    }

    await this.userCoinRepo.save(userCoin);

    return { 
      message: 'Coin threshold updated',
      threshold: userCoin.threshold,
    };
  }

  @Get('exchanges')
  async getExchanges(@Request() req: any) {
    const userId = req?.user?.id;
    const userExchanges: string[] = [];

    if (userId) {
      const user = await this.userService.getById(userId);
      if (user) {
        userExchanges.push(
          ...(user.exchanges?.filter((e) => e.isActive).map((e) => e.exchangeId) || []),
        );
      }
    }

    return Object.keys(SUPPORTED_EXCHANGES).map((exchangeId) => ({
      id: exchangeId,
      name: SUPPORTED_EXCHANGES[exchangeId].name,
      emoji: SUPPORTED_EXCHANGES[exchangeId].emoji,
      is_active: userExchanges.includes(exchangeId),
    }));
  }

  @Post('exchanges/:exchangeId/toggle')
  async toggleExchange(@Param('exchangeId') exchangeId: string, @Request() req: any) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userService.getById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const exchangeIdLower = exchangeId.toLowerCase();
    if (!SUPPORTED_EXCHANGES[exchangeIdLower]) {
      throw new BadRequestException('Unsupported exchange');
    }

    const existing = await this.userExchangeRepo.findOne({
      where: { userId, exchangeId: exchangeIdLower },
    });

    if (existing) {
      // 토글: 활성화면 비활성화, 비활성화면 활성화
      if (existing.isActive) {
        // 비활성화하려면 제한 확인 불필요
        existing.isActive = false;
        await this.userExchangeRepo.save(existing);
        return { message: 'Exchange removed' };
      } else {
        // 활성화하려면 제한 확인 필요
        if (!this.userService.canAddExchange(user)) {
          throw new BadRequestException('Exchange limit reached');
        }
        existing.isActive = true;
        await this.userExchangeRepo.save(existing);
        return { message: 'Exchange added' };
      }
    } else {
      // 새로 추가하려면 제한 확인 필요
      if (!this.userService.canAddExchange(user)) {
        throw new BadRequestException('Exchange limit reached');
      }
      const userExchange = this.userExchangeRepo.create({
        userId,
        exchangeId: exchangeIdLower,
        isActive: true,
      });
      await this.userExchangeRepo.save(userExchange);
      return { message: 'Exchange added' };
    }
  }

  @Put('settings/threshold')
  async updateThreshold(@Body() body: UpdateThresholdDto, @Request() req: any) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const threshold = Number(body.threshold);
    if (isNaN(threshold) || threshold < 0.01 || threshold > 10.0) {
      throw new BadRequestException('Invalid threshold value. Must be between 0.01 and 10.0');
    }
    
    // 소수점 두자리로 반올림
    const roundedThreshold = Math.round(threshold * 100) / 100;

    const user = await this.userService.getById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 테스트 모드: 모든 플랜에서 커스텀 임계값 허용
    // 프로덕션에서는 아래 주석을 해제하고 위의 체크를 활성화하세요
    // if (threshold !== 0.5 && threshold !== 1.0 && threshold !== 1.5 && threshold !== 2.0 && threshold !== 3.0 && threshold !== 5.0) {
    //   if (user.plan !== 'pro' && user.plan !== 'whale') {
    //     throw new BadRequestException('Custom threshold requires Pro or Whale plan');
    //   }
    // }

    await this.userService.update(userId, { threshold: roundedThreshold });
    return { message: 'Threshold updated' };
  }

  @Put('settings/language')
  async updateLanguage(@Body() body: UpdateLanguageDto, @Request() req: any) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const validLanguages = ['en', 'ko', 'ja', 'zh'];
    if (!validLanguages.includes(body.language)) {
      throw new BadRequestException('Invalid language code');
    }

    await this.userService.update(userId, { language: body.language as any });
    return { message: 'Language updated' };
  }

  @Post('settings/mute')
  async setMute(@Body() body: MuteSettingsDto, @Request() req: any) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const minutes = body.minutes;
    let mutedUntil: Date | null = null;

    if (minutes !== null && minutes !== undefined) {
      mutedUntil = new Date();
      mutedUntil.setMinutes(mutedUntil.getMinutes() + minutes);
    }

    await this.userService.update(userId, {
      isMuted: true,
      mutedUntil,
    });

    return { message: 'Notifications muted' };
  }

  @Post('settings/unmute')
  async unmute(@Request() req: any) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    await this.userService.update(userId, {
      isMuted: false,
      mutedUntil: null,
    });

    return { message: 'Notifications unmuted' };
  }

  @Post('subscription/checkout')
  async createCheckout(@Body() body: CreateCheckoutDto, @Request() req: any) {
    
    const userId = req?.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userService.getById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { plan, yearly } = body;
    const validPlans = ['free', 'basic', 'pro', 'whale'];
    if (!validPlans.includes(plan)) {
      throw new BadRequestException('Invalid plan');
    }

    if (plan === 'free') {
      throw new BadRequestException('Cannot checkout free plan');
    }

    const planType = plan as PlanType;
    const variantId = this.subscriptionService.getVariantId(planType, yearly);

    if (!variantId) {
      throw new BadRequestException(
        'Variant ID not configured. Please set Lemon Squeezy variant IDs in environment variables.',
      );
    }

    const checkoutUrl = await this.subscriptionService.createCheckout(
      user.telegramId,
      variantId,
      planType,
    );

    if (!checkoutUrl) {
      throw new BadRequestException('Failed to create checkout. Please check Lemon Squeezy configuration.');
    }

    return { url: checkoutUrl };
  }

  @Get('prices')
  async getPrices(@Request() req: any) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userService.getById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const activeCoins = user.coins?.filter((c) => c.isActive).map((c) => c.symbol) || [];
    const activeExchanges = user.exchanges?.filter((e) => e.isActive).map((e) => e.exchangeId) || [];

    if (activeCoins.length === 0 || activeExchanges.length === 0) {
      return {
        coins: [],
      };
    }

    const priceData = await Promise.all(
      activeCoins.map(async (symbol) => {
        // Check which exchanges support this symbol first
        const symbolSupport = await Promise.all(
          activeExchanges.map(async (exId) => ({
            exchange: exId,
            supported: await this.exchangeService.isSymbolSupported(exId, symbol),
          })),
        );

        // Check if symbol is supported by ANY exchange
        const isSupportedByAny = symbolSupport.some((s) => s.supported);

        // If not supported by any exchange, mark as invalid symbol
        if (!isSupportedByAny) {
          const allExchangePrices = activeExchanges.map((exId) => ({
            exchange: exId,
            price: null,
            deviation_percent: null,
            not_supported: true,
          }));

          return {
            symbol,
            prices: allExchangePrices,
            spread_percent: 0,
            min_price: 0,
            max_price: 0,
            min_exchange: null,
            max_exchange: null,
            avg_price: 0,
            timestamp: new Date().toISOString(),
            invalid_symbol: true, // Flag to indicate this symbol doesn't exist
          };
        }

        const comparison = await this.exchangeService.getPriceComparison(
          symbol,
          activeExchanges,
        );

        if (!comparison) {
          // No price data available, but still show which exchanges support it
          const allExchangePrices = activeExchanges.map((exId) => {
            const supportInfo = symbolSupport.find((s) => s.exchange === exId);
            return {
              exchange: exId,
              price: null,
              deviation_percent: null,
              not_supported: !supportInfo?.supported,
            };
          });

          return {
            symbol,
            prices: allExchangePrices,
            spread_percent: 0,
            min_price: 0,
            max_price: 0,
            min_exchange: null,
            max_exchange: null,
            avg_price: 0,
            timestamp: new Date().toISOString(),
          };
        }

        // 각 거래소별 가격과 평균 대비 편차 계산
        const avgPrice =
          Object.values(comparison.prices).reduce((a, b) => a + b, 0) /
          Object.keys(comparison.prices).length;

        const pricesWithDeviation = Object.entries(comparison.prices).map(
          ([exchangeId, price]) => ({
            exchange: exchangeId,
            price,
            deviation_percent: ((price - avgPrice) / avgPrice) * 100,
          }),
        );

        // Add entries for exchanges that don't support this symbol
        const allExchangePrices = activeExchanges.map((exId) => {
          const existing = pricesWithDeviation.find((p) => p.exchange === exId);
          if (existing) {
            return existing;
          }
          // Exchange doesn't support this symbol
          const supportInfo = symbolSupport.find((s) => s.exchange === exId);
          return {
            exchange: exId,
            price: null,
            deviation_percent: null,
            not_supported: !supportInfo?.supported,
          };
        });

        return {
          symbol,
          prices: allExchangePrices,
          spread_percent: comparison.spreadPercent,
          min_price: comparison.minPrice,
          max_price: comparison.maxPrice,
          min_exchange: comparison.minExchange,
          max_exchange: comparison.maxExchange,
          avg_price: avgPrice,
          timestamp: comparison.timestamp.toISOString(),
        };
      }),
    );

    return {
      coins: priceData,
    };
  }

  @Post('subscription/cancel')
  async cancelSubscription(@Request() req: any) {

    const userId = req?.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userService.getById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.plan === PlanType.FREE) {
      throw new BadRequestException('No active subscription to cancel');
    }

    this.logger.log(`Cancelling subscription for user ${userId}, plan: ${user.plan}, subscriptionId: ${user.lsSubscriptionId}`);

    if (!user.lsSubscriptionId) {
      // 구독 ID가 없으면 수동으로 플랜을 무료로 변경
      await this.userService.update(userId, { plan: PlanType.FREE });
      return { message: 'Subscription cancelled' };
    }

    // Lemon Squeezy를 통해 구독 취소 시도
    const cancelled = await this.subscriptionService.cancelSubscription(user.lsSubscriptionId);

    if (cancelled) {
      await this.userService.update(userId, { plan: PlanType.FREE, lsSubscriptionId: null });
      return { message: 'Subscription cancelled successfully' };
    } else {
      // Lemon Squeezy 취소 실패 시에도 수동으로 플랜 변경
      await this.userService.update(userId, { plan: PlanType.FREE });
      return { message: 'Subscription cancelled (manual)' };
    }
  }

  @Post('subscription/change-plan')
  async changePlan(@Body() body: CreateCheckoutDto, @Request() req: any) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userService.getById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { plan, yearly } = body;
    const validPlans = ['basic', 'pro', 'whale'];
    if (!validPlans.includes(plan)) {
      throw new BadRequestException('Invalid plan. Can only change to basic, pro, or whale.');
    }

    if (user.plan === PlanType.FREE) {
      throw new BadRequestException('Cannot change plan without active subscription. Please create a new subscription first.');
    }

    if (!user.lsSubscriptionId) {
      throw new BadRequestException('No active subscription found. Please create a new subscription.');
    }

    const newPlan = plan as PlanType;

    // Check if trying to change to the same plan
    if (user.plan === newPlan) {
      throw new BadRequestException('You are already on this plan');
    }

    this.logger.log(`Changing plan for user ${userId} from ${user.plan} to ${newPlan} (${yearly ? 'yearly' : 'monthly'})`);

    const changed = await this.subscriptionService.changePlan(
      user.lsSubscriptionId,
      newPlan,
      yearly,
    );

    if (changed) {
      // Note: The actual plan update will be handled by the webhook from LemonSqueezy
      return {
        message: 'Plan change initiated successfully. Your plan will be updated shortly.',
        newPlan,
      };
    } else {
      throw new BadRequestException('Failed to change plan. Please try again or contact support.');
    }
  }

  @Get('plan/recommendation')
  async getPlanRecommendation(@Request() req: any) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userService.getById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const currentPlan = user.plan as PlanType;
    const limits = PLAN_LIMITS[currentPlan];

    const activeCoins = user.coins?.filter((c) => c.isActive).length || 0;
    const activeExchanges = user.exchanges?.filter((e) => e.isActive).length || 0;

    // Calculate usage percentages
    const coinUsagePercent = limits.maxCoins === -1 ? 0 : (activeCoins / limits.maxCoins) * 100;
    const exchangeUsagePercent = limits.maxExchanges === -1 ? 0 : (activeExchanges / limits.maxExchanges) * 100;
    const alertUsagePercent = limits.dailyAlerts === -1 ? 0 : (user.dailyAlertsSent / limits.dailyAlerts) * 100;

    let recommendedPlan: PlanType | null = null;
    const reasons: string[] = [];

    // Recommendation logic
    if (currentPlan === PlanType.FREE) {
      if (coinUsagePercent >= 80 || exchangeUsagePercent >= 80 || alertUsagePercent >= 80) {
        recommendedPlan = PlanType.BASIC;
        if (coinUsagePercent >= 80) reasons.push('You are using 80%+ of your coin limit');
        if (exchangeUsagePercent >= 80) reasons.push('You are using 80%+ of your exchange limit');
        if (alertUsagePercent >= 80) reasons.push('You are using 80%+ of your daily alert limit');
        reasons.push('BASIC plan offers more coins, exchanges, and unlimited alerts');
      }
    } else if (currentPlan === PlanType.BASIC) {
      if (coinUsagePercent >= 80 || exchangeUsagePercent >= 80) {
        recommendedPlan = PlanType.PRO;
        if (coinUsagePercent >= 80) reasons.push('You are using 80%+ of your coin limit');
        if (exchangeUsagePercent >= 80) reasons.push('You are using 80%+ of your exchange limit');
        reasons.push('PRO plan offers unlimited coins, more exchanges, and custom thresholds');
      }
    } else if (currentPlan === PlanType.PRO) {
      if (exchangeUsagePercent >= 80) {
        recommendedPlan = PlanType.WHALE;
        reasons.push('You are using 80%+ of your exchange limit');
        reasons.push('WHALE plan offers unlimited exchanges and API access');
      }
    }

    return {
      currentPlan,
      recommendedPlan,
      reasons: reasons.length > 0 ? reasons : ['You are using your current plan efficiently'],
      usage: {
        coins: {
          active: activeCoins,
          limit: limits.maxCoins === -1 ? 'unlimited' : limits.maxCoins,
          percentage: limits.maxCoins === -1 ? 0 : Math.round(coinUsagePercent),
        },
        exchanges: {
          active: activeExchanges,
          limit: limits.maxExchanges === -1 ? 'unlimited' : limits.maxExchanges,
          percentage: limits.maxExchanges === -1 ? 0 : Math.round(exchangeUsagePercent),
        },
        alerts: {
          sent: user.dailyAlertsSent,
          limit: limits.dailyAlerts === -1 ? 'unlimited' : limits.dailyAlerts,
          percentage: limits.dailyAlerts === -1 ? 0 : Math.round(alertUsagePercent),
        },
      },
    };
  }

  @Get('subscription/invoices')
  async getInvoices(@Request() req: any) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userService.getById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.plan === PlanType.FREE) {
      return {
        invoices: [],
        message: 'No subscription found',
      };
    }

    if (!user.lsSubscriptionId) {
      return {
        invoices: [],
        message: 'No active subscription',
      };
    }

    const invoices = await this.subscriptionService.getInvoices(user.lsSubscriptionId);

    if (invoices === null) {
      throw new BadRequestException('Failed to fetch invoices. Please try again later.');
    }

    return {
      invoices,
      subscriptionId: user.lsSubscriptionId,
    };
  }

  @Get('symbols')
  async getSymbols(
    @Query('exchange') exchangeId?: string,
    @Query('search') search?: string,
    @Request() req?: any,
  ) {

    const userId = req?.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userService.getById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user's selected exchanges or all supported exchanges
    const userExchanges = user.exchanges
      ?.filter((e) => e.isActive)
      .map((e) => e.exchangeId) || [];
    
    const exchangesToQuery = exchangeId 
      ? [exchangeId] 
      : userExchanges.length > 0 
        ? userExchanges 
        : Object.keys(SUPPORTED_EXCHANGES);

    try {
      this.logger.log(`[API] getSymbols called: userId=${userId}, exchangeId=${exchangeId}, search=${search}, userExchanges=${JSON.stringify(userExchanges)}, exchangesToQuery=${JSON.stringify(exchangesToQuery)}`);
      
      // 기본: DB에 있는 모든 활성 심볼 반환 (바이낸스 기준)
      let symbols: string[];
      
      if (search && search.trim()) {
        // 검색어가 있으면 검색 결과 사용
        this.logger.log(`[API] Getting symbols with search: "${search}"`);
        symbols = await this.symbolService.getActiveSymbols(search);
        this.logger.log(`[API] Found ${symbols.length} symbols matching search`);
      } else {
        // 검색어가 없으면 모든 활성 심볼 반환
        this.logger.log(`[API] Getting all active symbols from DB`);
        symbols = await this.symbolService.getActiveSymbols();
        this.logger.log(`[API] Found ${symbols.length} active symbols from DB`);
      }

      // 항상 모든 심볼 반환 (거래소 필터링 없음)
      // 클라이언트에서 가용성 정보를 보고 필터링할 수 있음

      // 심볼 가용성 조회 (DB 기반) - 모든 거래소에 대한 정보 제공
      const allExchanges = Object.keys(SUPPORTED_EXCHANGES);
      this.logger.log(`[API] Getting symbol availability for ${symbols.length} symbols across ${allExchanges.length} exchanges`);
      const symbolAvailability = await this.symbolService.getSymbolAvailability(
        symbols,
        allExchanges, // 모든 거래소에 대한 가용성 정보 제공
      );
      this.logger.log(`[API] Got availability for ${Object.keys(symbolAvailability).length} symbols`);

      const response = {
        symbols,
        availability: symbolAvailability,
        exchanges: allExchanges, // 모든 거래소 정보 반환
      };
      
      this.logger.log(`[API] ==========================================`);
      this.logger.log(`[API] Returning response:`);
      this.logger.log(`[API]   - symbols count: ${symbols.length}`);
      this.logger.log(`[API]   - symbols (first 10): ${symbols.slice(0, 10).join(', ')}`);
      this.logger.log(`[API]   - availability entries: ${Object.keys(symbolAvailability).length}`);
      this.logger.log(`[API]   - exchanges: ${allExchanges.join(', ')}`);
      this.logger.log(`[API] ==========================================`);
      
      return response;
    } catch (error) {
      this.logger.error(`[API] Failed to get symbols: ${error.message}`);
      if (error instanceof Error) {
        this.logger.error(`[API] Error stack: ${error.stack}`);
      }
      throw new BadRequestException('Failed to fetch symbols');
    }
  }

  /**
   * Get unified symbols with exchange mappings (200 supported symbols)
   */
  @Get('unified-symbols')
  async getUnifiedSymbols(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.logger.log(`[API] Getting unified symbols - search: ${search}, category: ${category}`);
    
    try {
      let query = this.unifiedSymbolRepo
        .createQueryBuilder('us')
        .leftJoinAndSelect('us.exchangeMappings', 'em')
        .where('us.isActive = :active', { active: true })
        .orderBy('us.marketCapRank', 'ASC');

      if (search && search.trim()) {
        const searchTerm = search.trim().toUpperCase();
        query = query.andWhere(
          '(UPPER(us.standardSymbol) LIKE :search OR UPPER(us.name) LIKE :search)',
          { search: `%${searchTerm}%` },
        );
      }

      if (category && category.trim()) {
        query = query.andWhere('us.category = :category', { category: category.trim() });
      }

      const limitNum = limit ? Math.min(parseInt(limit, 10), 200) : 200;
      const offsetNum = offset ? parseInt(offset, 10) : 0;

      query = query.skip(offsetNum).take(limitNum);

      const [symbols, total] = await query.getManyAndCount();

      // Transform to API response format
      const response = symbols.map((s) => ({
        id: s.unifiedId,
        symbol: s.standardSymbol,
        name: s.name,
        category: s.category,
        rank: s.marketCapRank,
        exchanges: s.exchangeMappings?.reduce((acc, em) => {
          acc[em.exchangeId] = {
            symbol: em.exchangeSymbol,
            tradingPair: em.tradingPair,
            multiplier: Number(em.multiplier),
            isActive: em.isActive,
          };
          return acc;
        }, {} as Record<string, any>) || {},
      }));

      this.logger.log(`[API] Returning ${response.length} unified symbols (total: ${total})`);

      return {
        symbols: response,
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + response.length < total,
      };
    } catch (error) {
      this.logger.error(`[API] Failed to get unified symbols: ${error.message}`);
      throw new BadRequestException('Failed to fetch unified symbols');
    }
  }

  /**
   * Get categories of unified symbols
   */
  @Get('unified-symbols/categories')
  async getUnifiedSymbolCategories() {
    try {
      const categories = await this.unifiedSymbolRepo
        .createQueryBuilder('us')
        .select('DISTINCT us.category', 'category')
        .where('us.isActive = :active', { active: true })
        .andWhere('us.category IS NOT NULL')
        .getRawMany();

      return categories.map((c) => c.category).filter(Boolean);
    } catch (error) {
      this.logger.error(`[API] Failed to get categories: ${error.message}`);
      throw new BadRequestException('Failed to fetch categories');
    }
  }

  /**
   * Get normalized price comparison using unified symbols
   * This handles 1000x prefix symbols and returns normalized prices
   */
  @Get('unified-prices')
  async getUnifiedPrices(@Request() req: any) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userService.getById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const activeCoins = user.coins?.filter((c) => c.isActive).map((c) => c.symbol) || [];
    const activeExchanges = user.exchanges?.filter((e) => e.isActive).map((e) => e.exchangeId) || [];

    if (activeCoins.length === 0 || activeExchanges.length === 0) {
      return { coins: [] };
    }

    const priceData = await Promise.all(
      activeCoins.map(async (symbol) => {
        // Get unified symbol info
        const unifiedSymbol = await this.unifiedSymbolRepo.findOne({
          where: { standardSymbol: symbol.toUpperCase(), isActive: true },
          relations: ['exchangeMappings'],
        });

        // Get prices from each exchange with normalization
        const prices = await Promise.all(
          activeExchanges.map(async (exchangeId) => {
            try {
              // Find exchange mapping for this symbol
              let exchangeSymbol = symbol;
              let multiplier = 1;

              if (unifiedSymbol) {
                const mapping = unifiedSymbol.exchangeMappings?.find(
                  (m) => m.exchangeId === exchangeId && m.isActive,
                );
                if (mapping) {
                  exchangeSymbol = mapping.exchangeSymbol;
                  multiplier = Number(mapping.multiplier);
                }
              }

              // Fetch ticker
              const ticker = await this.exchangeService.fetchTicker(exchangeId, exchangeSymbol);
              
              if (ticker && ticker.price) {
                // Normalize price based on multiplier
                const normalizedPrice = normalizePrice(ticker.price, multiplier);
                return {
                  exchange: exchangeId,
                  price: normalizedPrice,
                  rawPrice: ticker.price,
                  multiplier,
                  exchangeSymbol,
                  not_supported: false,
                };
              }

              return {
                exchange: exchangeId,
                price: null,
                not_supported: false,
              };
            } catch (error) {
              return {
                exchange: exchangeId,
                price: null,
                not_supported: true,
              };
            }
          }),
        );

        // Calculate spread using normalized prices
        const validPrices = prices.filter((p) => p.price !== null);
        
        if (validPrices.length < 2) {
          return {
            symbol,
            name: unifiedSymbol?.name || symbol,
            category: unifiedSymbol?.category || null,
            prices,
            spread_percent: 0,
            min_price: validPrices[0]?.price || 0,
            max_price: validPrices[0]?.price || 0,
            min_exchange: validPrices[0]?.exchange || null,
            max_exchange: validPrices[0]?.exchange || null,
            avg_price: validPrices[0]?.price || 0,
            timestamp: new Date().toISOString(),
          };
        }

        const priceValues = validPrices.map((p) => p.price as number);
        const minPrice = Math.min(...priceValues);
        const maxPrice = Math.max(...priceValues);
        const avgPrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
        const spreadPercent = ((maxPrice - minPrice) / minPrice) * 100;

        const minExchange = validPrices.find((p) => p.price === minPrice)?.exchange;
        const maxExchange = validPrices.find((p) => p.price === maxPrice)?.exchange;

        // Calculate deviation from average for each price
        const pricesWithDeviation = prices.map((p) => ({
          ...p,
          deviation_percent: p.price ? ((p.price - avgPrice) / avgPrice) * 100 : null,
        }));

        return {
          symbol,
          name: unifiedSymbol?.name || symbol,
          category: unifiedSymbol?.category || null,
          prices: pricesWithDeviation,
          spread_percent: spreadPercent,
          min_price: minPrice,
          max_price: maxPrice,
          min_exchange: minExchange,
          max_exchange: maxExchange,
          avg_price: avgPrice,
          timestamp: new Date().toISOString(),
        };
      }),
    );

    return {
      coins: priceData.sort((a, b) => (b.spread_percent || 0) - (a.spread_percent || 0)),
    };
  }

  /**
   * Sync CoinGecko mappings (admin only)
   */
  @Post('admin/sync-coingecko')
  async syncCoinGecko() {
    this.logger.log('[API] Starting CoinGecko sync...');
    
    try {
      // First update CoinGecko IDs
      const updatedIds = await this.coinGeckoService.updateCoinGeckoIds();
      this.logger.log(`[API] Updated ${updatedIds} CoinGecko IDs`);

      // Then sync exchange mappings
      const result = await this.coinGeckoService.syncAllMappings();
      this.logger.log(`[API] CoinGecko sync completed: ${result.mapped} mappings`);

      return {
        success: true,
        updatedIds,
        ...result,
      };
    } catch (error) {
      this.logger.error(`[API] CoinGecko sync failed: ${error.message}`);
      throw new BadRequestException('CoinGecko sync failed');
    }
  }

  /**
   * GDPR: Export user data
   */
  @Get('gdpr/export')
  async exportUserData(@Request() req: any) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    this.logger.log(`[GDPR] Exporting data for user: ${userId}`);

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['coins', 'exchanges'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get all alerts
    const alerts = await this.alertRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const exportData = {
      user: {
        id: user.id,
        telegram_id: user.telegramId,
        username: user.username,
        first_name: user.firstName,
        last_name: user.lastName,
        language: user.language,
        plan: user.plan,
        threshold: user.threshold,
        is_muted: user.isMuted,
        muted_until: user.mutedUntil,
        daily_alerts_sent: user.dailyAlertsSent,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      },
      coins: user.coins?.map((c) => ({
        symbol: c.symbol,
        threshold: c.threshold,
        is_active: c.isActive,
        created_at: c.createdAt,
      })) || [],
      exchanges: user.exchanges?.map((e) => ({
        exchange_id: e.exchangeId,
        is_active: e.isActive,
        created_at: e.createdAt,
      })) || [],
      alerts: alerts.map((a) => ({
        id: a.id,
        symbol: a.symbol,
        spread_percent: Number(a.spreadPercent),
        buy_exchange: a.buyExchange,
        buy_price: Number(a.buyPrice),
        sell_exchange: a.sellExchange,
        sell_price: Number(a.sellPrice),
        potential_profit: Number(a.potentialProfit || 0),
        created_at: a.createdAt,
      })),
      export_date: new Date().toISOString(),
    };

    return exportData;
  }

  /**
   * GDPR: Delete user data
   */
  @Delete('gdpr/delete')
  async deleteUserData(@Request() req: any) {
    const userId = req?.user?.id;
    if (!userId) {
      throw new BadRequestException('User not authenticated');
    }

    const user = await this.userService.getById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const originalTelegramId = user.telegramId;
    this.logger.log(`[GDPR] Deleting data for user: ${userId} (Telegram ID: ${originalTelegramId})`);

    // Delete all user-related data
    await this.alertRepo.delete({ userId });
    await this.userCoinRepo.delete({ userId });
    await this.userExchangeRepo.delete({ userId });

    // Anonymize user data instead of deleting (for legal/audit purposes)
    // Use negative telegram ID to avoid conflicts and maintain uniqueness
    await this.userRepo.update(userId, {
      telegramId: -Math.abs(originalTelegramId),
      username: `deleted_${Date.now()}`,
      firstName: 'Deleted',
      lastName: 'User',
      language: Language.EN,
      plan: PlanType.FREE,
      threshold: 0,
      isMuted: true,
      dailyAlertsSent: 0,
      lsSubscriptionId: null,
      lsSubscriptionStatus: null,
      lsCurrentPeriodEnd: null,
      isDeleted: true,
      deletedAt: new Date(),
    });

    this.logger.log(`[GDPR] User data deleted/anonymized: ${userId}`);

    return {
      success: true,
      message: 'Your data has been deleted. Your account will be deactivated.',
    };
  }
}



