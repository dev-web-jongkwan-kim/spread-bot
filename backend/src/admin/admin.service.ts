import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual, MoreThan } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { Alert } from '../database/entities/alert.entity';
import { UserCoin } from '../database/entities/user-coin.entity';
import { UserExchange } from '../database/entities/user-exchange.entity';
import { Symbol } from '../database/entities/symbol.entity';
import { ExchangeSymbol } from '../database/entities/exchange-symbol.entity';
import { Log } from '../database/entities/log.entity';
import { PlanType, UserRole, SUPPORTED_EXCHANGES } from '../common/constants';

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  
  subscriptionStats: {
    free: number;
    basic: number;
    pro: number;
    whale: number;
  };
  
  alertStats: {
    totalAlerts: number;
    alertsToday: number;
    alertsThisWeek: number;
    avgAlertsPerUser: number;
  };
  
  coinStats: {
    totalCoins: number;
    avgCoinsPerUser: number;
    topCoins: { symbol: string; count: number }[];
  };
  
  exchangeStats: {
    totalActiveExchanges: number;
    exchangeUsage: { exchangeId: string; count: number }[];
  };
  
  symbolStats: {
    totalSymbols: number;
    activeSymbols: number;
    totalMappings: number;
  };
}

export interface UserListItem {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  plan: PlanType;
  role: UserRole;
  coinsCount: number;
  exchangesCount: number;
  alertsCount: number;
  dailyAlertsSent: number;
  createdAt: Date;
  lastActive: Date;
}

export interface UserGrowthData {
  date: string;
  totalUsers: number;
  newUsers: number;
}

export interface SubscriptionTrend {
  date: string;
  free: number;
  basic: number;
  pro: number;
  whale: number;
}

export interface AlertTrend {
  date: string;
  count: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Alert)
    private readonly alertRepo: Repository<Alert>,
    @InjectRepository(UserCoin)
    private readonly userCoinRepo: Repository<UserCoin>,
    @InjectRepository(UserExchange)
    private readonly userExchangeRepo: Repository<UserExchange>,
    @InjectRepository(Symbol)
    private readonly symbolRepo: Repository<Symbol>,
    @InjectRepository(ExchangeSymbol)
    private readonly exchangeSymbolRepo: Repository<ExchangeSymbol>,
  ) {}

  /**
   * Get dashboard overview statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // User stats
    const [totalUsers, newUsersToday, newUsersThisWeek, newUsersThisMonth] = await Promise.all([
      this.userRepo.count(),
      this.userRepo.count({ where: { createdAt: MoreThanOrEqual(today) } }),
      this.userRepo.count({ where: { createdAt: MoreThanOrEqual(weekAgo) } }),
      this.userRepo.count({ where: { createdAt: MoreThanOrEqual(monthAgo) } }),
    ]);

    // Active users (had alerts in last 7 days)
    const activeUsers = await this.alertRepo
      .createQueryBuilder('alert')
      .select('COUNT(DISTINCT alert.user_id)', 'count')
      .where('alert.created_at >= :weekAgo', { weekAgo })
      .getRawOne();

    // Subscription stats
    const subscriptionStats = await this.userRepo
      .createQueryBuilder('user')
      .select('user.plan', 'plan')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.plan')
      .getRawMany();

    const subStats = {
      free: 0,
      basic: 0,
      pro: 0,
      whale: 0,
    };
    subscriptionStats.forEach((s) => {
      subStats[s.plan as keyof typeof subStats] = parseInt(s.count);
    });

    // Alert stats
    const [totalAlerts, alertsToday, alertsThisWeek] = await Promise.all([
      this.alertRepo.count(),
      this.alertRepo.count({ where: { createdAt: MoreThanOrEqual(today) } }),
      this.alertRepo.count({ where: { createdAt: MoreThanOrEqual(weekAgo) } }),
    ]);

    // Coin stats
    const totalCoins = await this.userCoinRepo.count({ where: { isActive: true } });
    const topCoinsRaw = await this.userCoinRepo
      .createQueryBuilder('uc')
      .select('uc.symbol', 'symbol')
      .addSelect('COUNT(*)', 'count')
      .where('uc.is_active = true')
      .groupBy('uc.symbol')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Exchange stats
    const totalActiveExchanges = await this.userExchangeRepo.count({ where: { isActive: true } });
    const exchangeUsageRaw = await this.userExchangeRepo
      .createQueryBuilder('ue')
      .select('ue.exchange_id', 'exchangeId')
      .addSelect('COUNT(*)', 'count')
      .where('ue.is_active = true')
      .groupBy('ue.exchange_id')
      .orderBy('count', 'DESC')
      .getRawMany();

    // Symbol stats
    const [totalSymbols, activeSymbols, totalMappings] = await Promise.all([
      this.symbolRepo.count(),
      this.symbolRepo.count({ where: { isActive: true } }),
      this.exchangeSymbolRepo.count(),
    ]);

    return {
      totalUsers,
      activeUsers: parseInt(activeUsers?.count || '0'),
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      
      subscriptionStats: subStats,
      
      alertStats: {
        totalAlerts,
        alertsToday,
        alertsThisWeek,
        avgAlertsPerUser: totalUsers > 0 ? Math.round(totalAlerts / totalUsers) : 0,
      },
      
      coinStats: {
        totalCoins,
        avgCoinsPerUser: totalUsers > 0 ? Math.round((totalCoins / totalUsers) * 10) / 10 : 0,
        topCoins: topCoinsRaw.map((c) => ({ symbol: c.symbol, count: parseInt(c.count) })),
      },
      
      exchangeStats: {
        totalActiveExchanges,
        exchangeUsage: exchangeUsageRaw.map((e) => ({ 
          exchangeId: e.exchangeId, 
          count: parseInt(e.count) 
        })),
      },
      
      symbolStats: {
        totalSymbols,
        activeSymbols,
        totalMappings,
      },
    };
  }

  /**
   * Get user growth data for charts
   */
  async getUserGrowthData(days: number = 30): Promise<UserGrowthData[]> {
    const result: UserGrowthData[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const [totalUsers, newUsers] = await Promise.all([
        this.userRepo.count({ where: { createdAt: LessThanOrEqual(nextDate) } }),
        this.userRepo.count({ 
          where: { 
            createdAt: Between(date, nextDate) 
          } 
        }),
      ]);

      result.push({
        date: dateStr,
        totalUsers,
        newUsers,
      });
    }

    return result;
  }

  /**
   * Get alert trend data for charts
   */
  async getAlertTrendData(days: number = 30): Promise<AlertTrend[]> {
    const result: AlertTrend[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const count = await this.alertRepo.count({ 
        where: { 
          createdAt: Between(date, nextDate) 
        } 
      });

      result.push({
        date: dateStr,
        count,
      });
    }

    return result;
  }

  /**
   * Get paginated user list
   */
  async getUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
    plan?: PlanType,
    sortBy: string = 'createdAt',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): Promise<{ users: UserListItem[]; total: number; pages: number }> {
    let query = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.coins', 'coins', 'coins.is_active = true')
      .leftJoinAndSelect('user.exchanges', 'exchanges', 'exchanges.is_active = true');

    if (search) {
      query = query.andWhere(
        '(user.username ILIKE :search OR user.first_name ILIKE :search OR CAST(user.telegram_id AS TEXT) LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (plan) {
      query = query.andWhere('user.plan = :plan', { plan });
    }

    const total = await query.getCount();
    const pages = Math.ceil(total / limit);

    const users = await query
      .orderBy(`user.${sortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Get alert counts for each user
    const userIds = users.map((u) => u.id);
    const alertCounts = await this.alertRepo
      .createQueryBuilder('alert')
      .select('alert.user_id', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('alert.user_id IN (:...userIds)', { userIds: userIds.length > 0 ? userIds : [''] })
      .groupBy('alert.user_id')
      .getRawMany();

    const alertCountMap = new Map(alertCounts.map((a) => [a.userId, parseInt(a.count)]));

    return {
      users: users.map((u) => ({
        id: u.id,
        telegramId: u.telegramId,
        username: u.username,
        firstName: u.firstName,
        lastName: u.lastName,
        plan: u.plan,
        role: u.role || UserRole.USER,
        coinsCount: u.coins?.length || 0,
        exchangesCount: u.exchanges?.length || 0,
        alertsCount: alertCountMap.get(u.id) || 0,
        dailyAlertsSent: u.dailyAlertsSent,
        createdAt: u.createdAt,
        lastActive: u.updatedAt,
      })),
      total,
      pages,
    };
  }

  /**
   * Get user details
   */
  async getUserDetails(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['coins', 'exchanges', 'alerts'],
    });

    if (!user) {
      return null;
    }

    // Get recent alerts
    const recentAlerts = await this.alertRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return {
      ...user,
      recentAlerts,
      stats: {
        totalAlerts: await this.alertRepo.count({ where: { userId } }),
        activeCoins: user.coins?.filter((c) => c.isActive).length || 0,
        activeExchanges: user.exchanges?.filter((e) => e.isActive).length || 0,
      },
    };
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, role: UserRole): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      return null;
    }

    user.role = role;
    return this.userRepo.save(user);
  }

  /**
   * Update user plan
   */
  async updateUserPlan(userId: string, plan: PlanType): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      return null;
    }

    user.plan = plan;
    return this.userRepo.save(user);
  }

  /**
   * Get subscription analytics
   */
  async getSubscriptionAnalytics() {
    // Monthly revenue estimate (based on plan prices)
    const planPrices = {
      free: 0,
      basic: 9.99,
      pro: 29.99,
      whale: 99.99,
    };

    const subscriptionStats = await this.userRepo
      .createQueryBuilder('user')
      .select('user.plan', 'plan')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.plan')
      .getRawMany();

    let monthlyRevenue = 0;
    subscriptionStats.forEach((s) => {
      monthlyRevenue += parseInt(s.count) * planPrices[s.plan as keyof typeof planPrices];
    });

    // Conversion rate (free to paid)
    const freeUsers = subscriptionStats.find((s) => s.plan === 'free')?.count || 0;
    const paidUsers = subscriptionStats
      .filter((s) => s.plan !== 'free')
      .reduce((sum, s) => sum + parseInt(s.count), 0);
    
    const conversionRate = (parseInt(freeUsers) + paidUsers) > 0 
      ? (paidUsers / (parseInt(freeUsers) + paidUsers)) * 100 
      : 0;

    return {
      subscriptionStats: subscriptionStats.map((s) => ({
        plan: s.plan,
        count: parseInt(s.count),
        revenue: parseInt(s.count) * planPrices[s.plan as keyof typeof planPrices],
      })),
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
      paidUsers,
      freeUsers: parseInt(freeUsers),
    };
  }

  /**
   * Get system health
   */
  async getSystemHealth() {
    const [totalSymbols, activeSymbols, totalMappings] = await Promise.all([
      this.symbolRepo.count(),
      this.symbolRepo.count({ where: { isActive: true } }),
      this.exchangeSymbolRepo.count({ where: { isActive: true } }),
    ]);

    // Check for recent alerts (system is working)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentAlerts = await this.alertRepo.count({
      where: { createdAt: MoreThanOrEqual(oneHourAgo) },
    });

    // Exchange coverage per symbol
    const exchangeCoverage = await this.exchangeSymbolRepo
      .createQueryBuilder('es')
      .select('es.exchange_id', 'exchangeId')
      .addSelect('COUNT(*)', 'count')
      .where('es.is_active = true')
      .groupBy('es.exchange_id')
      .getRawMany();

    return {
      symbolSync: {
        totalSymbols,
        activeSymbols,
        totalMappings,
        status: activeSymbols > 0 ? 'healthy' : 'warning',
      },
      alertSystem: {
        alertsLastHour: recentAlerts,
        status: recentAlerts > 0 ? 'healthy' : 'warning',
      },
      database: {
        status: 'healthy',
      },
      exchangeCoverage: exchangeCoverage.map(e => ({
        exchangeId: e.exchangeId,
        symbolCount: parseInt(e.count),
      })),
    };
  }

  /**
   * Get real-time monitoring data
   */
  async getRealTimeMonitoring() {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Recent alerts with details
    const recentAlerts = await this.alertRepo.find({
      where: { createdAt: MoreThanOrEqual(oneHourAgo) },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    // Alert statistics
    const alertsLast5Min = recentAlerts.filter(a => a.createdAt >= fiveMinutesAgo).length;
    const alertsLast1Hour = recentAlerts.length;
    const alertsLast24Hours = await this.alertRepo.count({
      where: { createdAt: MoreThanOrEqual(oneDayAgo) },
    });

    // Spread analysis
    const avgSpread = recentAlerts.length > 0
      ? recentAlerts.reduce((sum, a) => sum + Number(a.spreadPercent), 0) / recentAlerts.length
      : 0;

    const maxSpread = recentAlerts.length > 0
      ? Math.max(...recentAlerts.map(a => Number(a.spreadPercent)))
      : 0;

    // Top opportunities by spread
    const topOpportunities = recentAlerts
      .sort((a, b) => Number(b.spreadPercent) - Number(a.spreadPercent))
      .slice(0, 10)
      .map(a => ({
        symbol: a.symbol,
        spread: Number(a.spreadPercent),
        buyExchange: a.buyExchange,
        sellExchange: a.sellExchange,
        buyPrice: Number(a.buyPrice),
        sellPrice: Number(a.sellPrice),
        potentialProfit: Number(a.potentialProfit || 0),
        timestamp: a.createdAt,
      }));

    // Exchange pair frequency in alerts
    const exchangePairFrequency: Record<string, number> = {};
    recentAlerts.forEach(a => {
      const pair = `${a.buyExchange}-${a.sellExchange}`;
      exchangePairFrequency[pair] = (exchangePairFrequency[pair] || 0) + 1;
    });

    // Symbol frequency in alerts
    const symbolFrequency: Record<string, number> = {};
    recentAlerts.forEach(a => {
      symbolFrequency[a.symbol] = (symbolFrequency[a.symbol] || 0) + 1;
    });

    return {
      timestamp: now.toISOString(),
      alerts: {
        last5Min: alertsLast5Min,
        last1Hour: alertsLast1Hour,
        last24Hours: alertsLast24Hours,
        avgSpread: Math.round(avgSpread * 100) / 100,
        maxSpread: Math.round(maxSpread * 100) / 100,
      },
      topOpportunities,
      exchangePairFrequency: Object.entries(exchangePairFrequency)
        .map(([pair, count]) => ({ pair, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      symbolFrequency: Object.entries(symbolFrequency)
        .map(([symbol, count]) => ({ symbol, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      recentAlerts: recentAlerts.slice(0, 20).map(a => ({
        id: a.id,
        symbol: a.symbol,
        spread: Number(a.spreadPercent),
        buyExchange: a.buyExchange,
        sellExchange: a.sellExchange,
        timestamp: a.createdAt,
      })),
    };
  }

  /**
   * Get system usage statistics
   */
  async getUsageStats() {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // API call statistics (from logs if available)
    const [alertsToday, alertsThisWeek, alertsThisMonth] = await Promise.all([
      this.alertRepo.count({ where: { createdAt: MoreThanOrEqual(dayAgo) } }),
      this.alertRepo.count({ where: { createdAt: MoreThanOrEqual(weekAgo) } }),
      this.alertRepo.count({ where: { createdAt: MoreThanOrEqual(monthAgo) } }),
    ]);

    // Database size estimation (approximate)
    const [userCount, alertCount, symbolCount] = await Promise.all([
      this.userRepo.count(),
      this.alertRepo.count(),
      this.symbolRepo.count(),
    ]);

    // Active users (users with alerts in last 7 days)
    const activeUsers = await this.alertRepo
      .createQueryBuilder('alert')
      .select('DISTINCT alert.userId', 'userId')
      .where('alert.createdAt >= :weekAgo', { weekAgo })
      .getRawMany();

    return {
      timestamp: now.toISOString(),
      alerts: {
        today: alertsToday,
        thisWeek: alertsThisWeek,
        thisMonth: alertsThisMonth,
      },
      database: {
        users: userCount,
        alerts: alertCount,
        symbols: symbolCount,
        estimatedSize: 'N/A', // Would need DB-specific queries
      },
      users: {
        total: userCount,
        active: activeUsers.length,
        activePercentage: userCount > 0 ? Math.round((activeUsers.length / userCount) * 100) : 0,
      },
    };
  }

  /**
   * Get user behavior analytics
   */
  async getUserBehaviorAnalytics() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Active users by time period
    const [activeLastWeek, activeLastMonth] = await Promise.all([
      this.alertRepo
        .createQueryBuilder('alert')
        .select('COUNT(DISTINCT alert.user_id)', 'count')
        .where('alert.created_at >= :weekAgo', { weekAgo })
        .getRawOne(),
      this.alertRepo
        .createQueryBuilder('alert')
        .select('COUNT(DISTINCT alert.user_id)', 'count')
        .where('alert.created_at >= :monthAgo', { monthAgo })
        .getRawOne(),
    ]);

    // User activity distribution
    const userActivityRaw = await this.alertRepo
      .createQueryBuilder('alert')
      .select('alert.user_id', 'userId')
      .addSelect('COUNT(*)', 'alertCount')
      .where('alert.created_at >= :monthAgo', { monthAgo })
      .groupBy('alert.user_id')
      .getRawMany();

    const activityBuckets = {
      inactive: 0,  // 0 alerts
      low: 0,       // 1-10 alerts
      medium: 0,    // 11-50 alerts
      high: 0,      // 51-200 alerts
      veryHigh: 0,  // 200+ alerts
    };

    const totalUsers = await this.userRepo.count();
    const usersWithAlerts = new Set(userActivityRaw.map(u => u.userId));

    activityBuckets.inactive = totalUsers - usersWithAlerts.size;

    userActivityRaw.forEach(u => {
      const count = parseInt(u.alertCount);
      if (count <= 10) activityBuckets.low++;
      else if (count <= 50) activityBuckets.medium++;
      else if (count <= 200) activityBuckets.high++;
      else activityBuckets.veryHigh++;
    });

    // Coin popularity
    const coinPopularity = await this.userCoinRepo
      .createQueryBuilder('uc')
      .select('uc.symbol', 'symbol')
      .addSelect('COUNT(*)', 'userCount')
      .where('uc.is_active = true')
      .groupBy('uc.symbol')
      .orderBy('userCount', 'DESC')
      .limit(20)
      .getRawMany();

    // Exchange popularity
    const exchangePopularity = await this.userExchangeRepo
      .createQueryBuilder('ue')
      .select('ue.exchange_id', 'exchangeId')
      .addSelect('COUNT(*)', 'userCount')
      .where('ue.is_active = true')
      .groupBy('ue.exchange_id')
      .orderBy('userCount', 'DESC')
      .getRawMany();

    // Retention analysis
    const retentionByWeek: { week: number; retained: number; total: number }[] = [];
    for (let week = 1; week <= 4; week++) {
      const weekStart = new Date(now.getTime() - week * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - (week - 1) * 7 * 24 * 60 * 60 * 1000);
      
      const usersCreatedBeforeWeek = await this.userRepo.count({
        where: { createdAt: LessThanOrEqual(weekStart) },
      });

      const activeInWeek = await this.alertRepo
        .createQueryBuilder('alert')
        .select('COUNT(DISTINCT alert.user_id)', 'count')
        .innerJoin('alert.user', 'user')
        .where('alert.created_at BETWEEN :weekStart AND :weekEnd', { weekStart, weekEnd })
        .andWhere('user.created_at <= :weekStart', { weekStart })
        .getRawOne();

      retentionByWeek.push({
        week,
        retained: parseInt(activeInWeek?.count || '0'),
        total: usersCreatedBeforeWeek,
      });
    }

    return {
      activeUsers: {
        lastWeek: parseInt(activeLastWeek?.count || '0'),
        lastMonth: parseInt(activeLastMonth?.count || '0'),
        total: totalUsers,
      },
      activityDistribution: activityBuckets,
      coinPopularity: coinPopularity.map(c => ({
        symbol: c.symbol,
        userCount: parseInt(c.userCount),
      })),
      exchangePopularity: exchangePopularity.map(e => ({
        exchangeId: e.exchangeId,
        userCount: parseInt(e.userCount),
      })),
      retention: retentionByWeek.map(r => ({
        week: r.week,
        rate: r.total > 0 ? Math.round((r.retained / r.total) * 100) : 0,
        retained: r.retained,
        total: r.total,
      })),
    };
  }

  /**
   * Get alert analytics
   */
  async getAlertAnalytics(days: number = 7) {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Alerts by hour of day
    const alertsByHour = await this.alertRepo
      .createQueryBuilder('alert')
      .select("EXTRACT(HOUR FROM alert.created_at)", 'hour')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(alert.spread_percent)', 'avgSpread')
      .where('alert.created_at >= :startDate', { startDate })
      .groupBy("EXTRACT(HOUR FROM alert.created_at)")
      .orderBy('hour', 'ASC')
      .getRawMany();

    // Alerts by symbol
    const alertsBySymbol = await this.alertRepo
      .createQueryBuilder('alert')
      .select('alert.symbol', 'symbol')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(alert.spread_percent)', 'avgSpread')
      .addSelect('MAX(alert.spread_percent)', 'maxSpread')
      .where('alert.created_at >= :startDate', { startDate })
      .groupBy('alert.symbol')
      .orderBy('count', 'DESC')
      .limit(20)
      .getRawMany();

    // Alerts by exchange pair
    const alertsByExchangePair = await this.alertRepo
      .createQueryBuilder('alert')
      .select("CONCAT(alert.buy_exchange, ' → ', alert.sell_exchange)", 'pair')
      .addSelect('COUNT(*)', 'count')
      .addSelect('AVG(alert.spread_percent)', 'avgSpread')
      .where('alert.created_at >= :startDate', { startDate })
      .groupBy("CONCAT(alert.buy_exchange, ' → ', alert.sell_exchange)")
      .orderBy('count', 'DESC')
      .limit(15)
      .getRawMany();

    // Spread distribution
    const spreadRanges = [
      { min: 0, max: 0.5, label: '0-0.5%' },
      { min: 0.5, max: 1, label: '0.5-1%' },
      { min: 1, max: 2, label: '1-2%' },
      { min: 2, max: 5, label: '2-5%' },
      { min: 5, max: 100, label: '5%+' },
    ];

    const spreadDistribution = await Promise.all(
      spreadRanges.map(async range => {
        const count = await this.alertRepo
          .createQueryBuilder('alert')
          .where('alert.created_at >= :startDate', { startDate })
          .andWhere('alert.spread_percent >= :min', { min: range.min })
          .andWhere('alert.spread_percent < :max', { max: range.max })
          .getCount();
        return { label: range.label, count };
      })
    );

    // Daily summary
    const dailySummary: { date: string; count: number; avgSpread: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const result = await this.alertRepo
        .createQueryBuilder('alert')
        .select('COUNT(*)', 'count')
        .addSelect('AVG(alert.spread_percent)', 'avgSpread')
        .where('alert.created_at >= :date', { date })
        .andWhere('alert.created_at < :nextDate', { nextDate })
        .getRawOne();

      dailySummary.push({
        date: dateStr,
        count: parseInt(result?.count || '0'),
        avgSpread: parseFloat(result?.avgSpread || '0'),
      });
    }

    return {
      byHour: alertsByHour.map(h => ({
        hour: parseInt(h.hour),
        count: parseInt(h.count),
        avgSpread: parseFloat(h.avgSpread),
      })),
      bySymbol: alertsBySymbol.map(s => ({
        symbol: s.symbol,
        count: parseInt(s.count),
        avgSpread: parseFloat(s.avgSpread),
        maxSpread: parseFloat(s.maxSpread),
      })),
      byExchangePair: alertsByExchangePair.map(p => ({
        pair: p.pair,
        count: parseInt(p.count),
        avgSpread: parseFloat(p.avgSpread),
      })),
      spreadDistribution,
      dailySummary,
    };
  }

  /**
   * Get exchange status for all exchanges
   */
  async getExchangeStatus() {
    const exchanges = Object.keys(SUPPORTED_EXCHANGES);
    
    // Get symbol count per exchange
    const symbolCounts = await this.exchangeSymbolRepo
      .createQueryBuilder('es')
      .select('es.exchange_id', 'exchangeId')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN es.is_active = true THEN 1 ELSE 0 END)', 'active')
      .groupBy('es.exchange_id')
      .getRawMany();

    // Get user count per exchange
    const userCounts = await this.userExchangeRepo
      .createQueryBuilder('ue')
      .select('ue.exchange_id', 'exchangeId')
      .addSelect('COUNT(*)', 'count')
      .where('ue.is_active = true')
      .groupBy('ue.exchange_id')
      .getRawMany();

    // Get alert count per exchange (as buy or sell)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const buyAlertCounts = await this.alertRepo
      .createQueryBuilder('alert')
      .select('alert.buy_exchange', 'exchangeId')
      .addSelect('COUNT(*)', 'count')
      .where('alert.created_at >= :oneDayAgo', { oneDayAgo })
      .groupBy('alert.buy_exchange')
      .getRawMany();

    const sellAlertCounts = await this.alertRepo
      .createQueryBuilder('alert')
      .select('alert.sell_exchange', 'exchangeId')
      .addSelect('COUNT(*)', 'count')
      .where('alert.created_at >= :oneDayAgo', { oneDayAgo })
      .groupBy('alert.sell_exchange')
      .getRawMany();

    const symbolCountMap = new Map(symbolCounts.map(s => [s.exchangeId, s]));
    const userCountMap = new Map(userCounts.map(u => [u.exchangeId, parseInt(u.count)]));
    const buyAlertMap = new Map(buyAlertCounts.map(a => [a.exchangeId, parseInt(a.count)]));
    const sellAlertMap = new Map(sellAlertCounts.map(a => [a.exchangeId, parseInt(a.count)]));

    return exchanges.map(exchangeId => {
      const symbolInfo = symbolCountMap.get(exchangeId);
      const info = SUPPORTED_EXCHANGES[exchangeId];
      return {
        exchangeId,
        name: info.name,
        emoji: info.emoji,
        symbols: {
          total: parseInt(symbolInfo?.total || '0'),
          active: parseInt(symbolInfo?.active || '0'),
        },
        users: userCountMap.get(exchangeId) || 0,
        alerts24h: {
          asBuy: buyAlertMap.get(exchangeId) || 0,
          asSell: sellAlertMap.get(exchangeId) || 0,
          total: (buyAlertMap.get(exchangeId) || 0) + (sellAlertMap.get(exchangeId) || 0),
        },
        status: parseInt(symbolInfo?.active || '0') > 0 ? 'active' : 'inactive',
      };
    });
  }

  /**
   * Get paginated symbols list
   */
  async getSymbols(
    page: number = 1,
    limit: number = 50,
    search?: string,
    status?: 'active' | 'inactive' | 'all',
    sortBy: string = 'symbol',
    sortOrder: 'ASC' | 'DESC' = 'ASC',
  ): Promise<{ symbols: any[]; total: number; pages: number }> {
    let query = this.symbolRepo.createQueryBuilder('symbol');

    if (search) {
      query = query.andWhere(
        '(symbol.symbol ILIKE :search OR symbol.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status === 'active') {
      query = query.andWhere('symbol.is_active = true');
    } else if (status === 'inactive') {
      query = query.andWhere('symbol.is_active = false');
    }

    const total = await query.getCount();
    const pages = Math.ceil(total / limit);

    // Build query with optional exchange count subquery
    let symbolsQuery = this.symbolRepo
      .createQueryBuilder('symbol')
      .where(search ? '(symbol.symbol ILIKE :search OR symbol.name ILIKE :search)' : '1=1', { search: `%${search}%` })
      .andWhere(status === 'active' ? 'symbol.is_active = true' : status === 'inactive' ? 'symbol.is_active = false' : '1=1');

    // Handle exchangeCount sorting with subquery
    if (sortBy === 'exchangeCount') {
      symbolsQuery = symbolsQuery
        .addSelect(
          subQuery => subQuery
            .select('COUNT(*)')
            .from('exchange_symbols', 'es')
            .where('es.symbol_id = symbol.id')
            .andWhere('es.is_active = true'),
          'exchange_count'
        )
        .orderBy('exchange_count', sortOrder);
    } else {
      // Map frontend sort fields to database columns
      const sortFieldMap: Record<string, string> = {
        symbol: 'symbol.symbol',
        name: 'symbol.name',
        isActive: 'symbol.is_active',
        updatedAt: 'symbol.updated_at',
      };
      const dbSortField = sortFieldMap[sortBy] || 'symbol.symbol';
      symbolsQuery = symbolsQuery.orderBy(dbSortField, sortOrder);
    }

    const symbols = await symbolsQuery
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Get exchange mappings for each symbol
    const symbolIds = symbols.map(s => s.id);
    const mappings = await this.exchangeSymbolRepo
      .createQueryBuilder('es')
      .where('es.symbol_id IN (:...symbolIds)', { symbolIds: symbolIds.length > 0 ? symbolIds : [''] })
      .getMany();

    const mappingsBySymbol = new Map<string, typeof mappings>();
    mappings.forEach(m => {
      const existing = mappingsBySymbol.get(m.symbolId) || [];
      existing.push(m);
      mappingsBySymbol.set(m.symbolId, existing);
    });

    return {
      symbols: symbols.map(s => ({
        id: s.id,
        symbol: s.symbol,
        name: s.name,
        isActive: s.isActive,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        exchangeMappings: (mappingsBySymbol.get(s.id) || []).map(m => ({
          exchangeId: m.exchangeId,
          exchangeSymbol: m.exchangeSymbol,
          isActive: m.isActive,
        })),
        exchangeCount: (mappingsBySymbol.get(s.id) || []).filter(m => m.isActive).length,
      })),
      total,
      pages,
    };
  }

  /**
   * Get symbol details with all exchange mappings
   */
  async getSymbolDetails(symbolId: string) {
    const symbol = await this.symbolRepo.findOne({ where: { id: symbolId } });
    if (!symbol) return null;

    const mappings = await this.exchangeSymbolRepo.find({
      where: { symbolId },
      order: { exchangeId: 'ASC' },
    });

    // Get user count monitoring this symbol
    const userCount = await this.userCoinRepo.count({
      where: { symbol: symbol.symbol, isActive: true },
    });

    // Get alert count for this symbol
    const alertCount = await this.alertRepo.count({
      where: { symbol: symbol.symbol },
    });

    return {
      ...symbol,
      exchangeMappings: mappings.map(m => ({
        id: m.id,
        exchangeId: m.exchangeId,
        exchangeSymbol: m.exchangeSymbol,
        isActive: m.isActive,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
      stats: {
        userCount,
        alertCount,
        exchangeCount: mappings.filter(m => m.isActive).length,
      },
    };
  }

  /**
   * Update symbol
   */
  async updateSymbol(symbolId: string, data: { name?: string; isActive?: boolean }) {
    const symbol = await this.symbolRepo.findOne({ where: { id: symbolId } });
    if (!symbol) return null;

    if (data.name !== undefined) symbol.name = data.name;
    if (data.isActive !== undefined) symbol.isActive = data.isActive;

    return this.symbolRepo.save(symbol);
  }

  /**
   * Toggle symbol active status
   */
  async toggleSymbolStatus(symbolId: string) {
    const symbol = await this.symbolRepo.findOne({ where: { id: symbolId } });
    if (!symbol) return null;

    symbol.isActive = !symbol.isActive;
    return this.symbolRepo.save(symbol);
  }

  /**
   * Update exchange symbol mapping
   */
  async updateExchangeSymbol(mappingId: string, data: { exchangeSymbol?: string; isActive?: boolean }) {
    const mapping = await this.exchangeSymbolRepo.findOne({ where: { id: mappingId } });
    if (!mapping) return null;

    if (data.exchangeSymbol !== undefined) mapping.exchangeSymbol = data.exchangeSymbol;
    if (data.isActive !== undefined) mapping.isActive = data.isActive;

    return this.exchangeSymbolRepo.save(mapping);
  }

  /**
   * Get revenue metrics
   */
  async getRevenueMetrics() {
    const planPrices = {
      free: 0,
      basic: 9.99,
      pro: 29.99,
      whale: 99.99,
    };

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Current MRR
    const currentSubscriptions = await this.userRepo
      .createQueryBuilder('user')
      .select('user.plan', 'plan')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.plan')
      .getRawMany();

    let currentMRR = 0;
    currentSubscriptions.forEach((s) => {
      currentMRR += parseInt(s.count) * planPrices[s.plan as keyof typeof planPrices];
    });

    // New subscriptions this month
    const newPaidThisMonth = await this.userRepo.count({
      where: {
        createdAt: MoreThanOrEqual(thisMonthStart),
        plan: MoreThan(PlanType.FREE as any), // Exclude free
      },
    });

    // Churn estimate (users who downgraded to free this month - simplified)
    // In reality, you'd track plan changes in a separate table

    // LTV estimate (simple: avg subscription duration * avg revenue per user)
    const avgRevenuePerPaidUser = currentMRR / 
      currentSubscriptions
        .filter(s => s.plan !== 'free')
        .reduce((sum, s) => sum + parseInt(s.count), 0) || 0;

    // Projected annual revenue
    const projectedAnnualRevenue = currentMRR * 12;

    return {
      mrr: Math.round(currentMRR * 100) / 100,
      arr: Math.round(projectedAnnualRevenue * 100) / 100,
      newPaidUsersThisMonth: newPaidThisMonth,
      avgRevenuePerPaidUser: Math.round(avgRevenuePerPaidUser * 100) / 100,
      subscriptionBreakdown: currentSubscriptions.map(s => ({
        plan: s.plan,
        count: parseInt(s.count),
        revenue: Math.round(parseInt(s.count) * planPrices[s.plan as keyof typeof planPrices] * 100) / 100,
        percentage: Math.round((parseInt(s.count) / currentSubscriptions.reduce((sum, x) => sum + parseInt(x.count), 0)) * 100),
      })),
    };
  }
}

