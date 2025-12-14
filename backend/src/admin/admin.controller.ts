import {
  Controller,
  Get,
  Put,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminService } from './admin.service';
import { SymbolService } from '../symbol/symbol.service';
import { CoinGeckoService } from '../coingecko/coingecko.service';
import { DataRetentionService } from '../data-retention/data-retention.service';
import { PlanType, UserRole } from '../common/constants';

@Controller('api/admin')
@UseGuards(AdminGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly adminService: AdminService,
    private readonly symbolService: SymbolService,
    private readonly coinGeckoService: CoinGeckoService,
    private readonly dataRetentionService: DataRetentionService,
  ) {}

  /**
   * Get dashboard overview statistics
   */
  @Get('dashboard')
  async getDashboard() {
    this.logger.log('[ADMIN] Getting dashboard stats');
    const stats = await this.adminService.getDashboardStats();
    return { success: true, data: stats };
  }

  /**
   * Get user growth chart data
   */
  @Get('charts/user-growth')
  async getUserGrowthChart(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    const data = await this.adminService.getUserGrowthData(daysNum);
    return { success: true, data };
  }

  /**
   * Get alert trend chart data
   */
  @Get('charts/alert-trend')
  async getAlertTrendChart(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 30;
    const data = await this.adminService.getAlertTrendData(daysNum);
    return { success: true, data };
  }

  /**
   * Get subscription analytics
   */
  @Get('subscriptions')
  async getSubscriptionAnalytics() {
    const data = await this.adminService.getSubscriptionAnalytics();
    return { success: true, data };
  }

  /**
   * Get system health status
   */
  @Get('system-health')
  async getSystemHealth() {
    const health = await this.adminService.getSystemHealth();
    return { success: true, data: health };
  }

  /**
   * Get paginated user list
   */
  @Get('users')
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('plan') plan?: PlanType,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 20;
    
    const result = await this.adminService.getUsers(
      pageNum,
      limitNum,
      search,
      plan,
      sortBy || 'createdAt',
      sortOrder || 'DESC',
    );

    return { success: true, ...result };
  }

  /**
   * Get user details
   */
  @Get('users/:id')
  async getUserDetails(@Param('id') id: string) {
    const user = await this.adminService.getUserDetails(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { success: true, data: user };
  }

  /**
   * Update user role
   */
  @Put('users/:id/role')
  async updateUserRole(
    @Param('id') id: string,
    @Body('role') role: UserRole,
  ) {
    if (!Object.values(UserRole).includes(role)) {
      throw new BadRequestException('Invalid role');
    }

    const user = await this.adminService.updateUserRole(id, role);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.logger.log(`[ADMIN] Updated user ${id} role to ${role}`);
    return { success: true, data: user };
  }

  /**
   * Update user plan
   */
  @Put('users/:id/plan')
  async updateUserPlan(
    @Param('id') id: string,
    @Body('plan') plan: PlanType,
  ) {
    if (!Object.values(PlanType).includes(plan)) {
      throw new BadRequestException('Invalid plan');
    }

    const user = await this.adminService.updateUserPlan(id, plan);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.logger.log(`[ADMIN] Updated user ${id} plan to ${plan}`);
    return { success: true, data: user };
  }

  /**
   * Trigger symbol sync from Binance
   */
  @Post('sync/symbols')
  async syncSymbols() {
    this.logger.log('[ADMIN] Triggering symbol sync');
    try {
      await this.symbolService.syncAll();
      return { success: true, message: 'Symbol sync completed' };
    } catch (error) {
      this.logger.error(`[ADMIN] Symbol sync failed: ${error.message}`);
      throw new BadRequestException('Symbol sync failed');
    }
  }

  /**
   * Trigger CoinGecko sync
   */
  @Post('sync/coingecko')
  async syncCoinGecko() {
    this.logger.log('[ADMIN] Triggering CoinGecko sync');
    try {
      const updatedIds = await this.coinGeckoService.updateCoinGeckoIds();
      const result = await this.coinGeckoService.syncAllMappings();
      return { 
        success: true, 
        message: 'CoinGecko sync completed',
        updatedIds,
        ...result,
      };
    } catch (error) {
      this.logger.error(`[ADMIN] CoinGecko sync failed: ${error.message}`);
      throw new BadRequestException('CoinGecko sync failed');
    }
  }

  /**
   * Get real-time monitoring data
   */
  @Get('monitoring')
  async getRealTimeMonitoring() {
    const data = await this.adminService.getRealTimeMonitoring();
    return { success: true, data };
  }

  /**
   * Get system usage statistics
   */
  @Get('usage')
  async getUsageStats() {
    const data = await this.adminService.getUsageStats();
    return { success: true, data };
  }

  /**
   * Get user behavior analytics
   */
  @Get('analytics/users')
  async getUserBehaviorAnalytics() {
    const data = await this.adminService.getUserBehaviorAnalytics();
    return { success: true, data };
  }

  /**
   * Get alert analytics
   */
  @Get('analytics/alerts')
  async getAlertAnalytics(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    const data = await this.adminService.getAlertAnalytics(daysNum);
    return { success: true, data };
  }

  /**
   * Get exchange status
   */
  @Get('exchanges')
  async getExchangeStatus() {
    const data = await this.adminService.getExchangeStatus();
    return { success: true, data };
  }

  /**
   * Trigger data retention cleanup
   */
  @Post('data-retention/cleanup')
  async triggerDataRetentionCleanup(@Body() body: { retentionDays?: number }) {
    const result = await this.dataRetentionService.cleanupAlerts(body.retentionDays || 90);
    return { success: true, result };
  }

  /**
   * Get revenue metrics
   */
  @Get('revenue')
  async getRevenueMetrics() {
    const data = await this.adminService.getRevenueMetrics();
    return { success: true, data };
  }

  /**
   * Get paginated symbols list
   */
  @Get('symbols')
  async getSymbols(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'inactive' | 'all',
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 50;
    
    const result = await this.adminService.getSymbols(
      pageNum,
      limitNum,
      search,
      status || 'all',
      sortBy || 'symbol',
      sortOrder || 'ASC',
    );

    return { success: true, ...result };
  }

  /**
   * Get symbol details
   */
  @Get('symbols/:id')
  async getSymbolDetails(@Param('id') id: string) {
    const symbol = await this.adminService.getSymbolDetails(id);
    if (!symbol) {
      throw new NotFoundException('Symbol not found');
    }
    return { success: true, data: symbol };
  }

  /**
   * Update symbol
   */
  @Put('symbols/:id')
  async updateSymbol(
    @Param('id') id: string,
    @Body() body: { name?: string; isActive?: boolean },
  ) {
    const symbol = await this.adminService.updateSymbol(id, body);
    if (!symbol) {
      throw new NotFoundException('Symbol not found');
    }

    this.logger.log(`[ADMIN] Updated symbol ${id}: ${JSON.stringify(body)}`);
    return { success: true, data: symbol };
  }

  /**
   * Toggle symbol active status
   */
  @Put('symbols/:id/toggle')
  async toggleSymbolStatus(@Param('id') id: string) {
    const symbol = await this.adminService.toggleSymbolStatus(id);
    if (!symbol) {
      throw new NotFoundException('Symbol not found');
    }

    this.logger.log(`[ADMIN] Toggled symbol ${id} to ${symbol.isActive ? 'active' : 'inactive'}`);
    return { success: true, data: symbol };
  }

  /**
   * Update exchange symbol mapping
   */
  @Put('exchange-symbols/:id')
  async updateExchangeSymbol(
    @Param('id') id: string,
    @Body() body: { exchangeSymbol?: string; isActive?: boolean },
  ) {
    const mapping = await this.adminService.updateExchangeSymbol(id, body);
    if (!mapping) {
      throw new NotFoundException('Exchange symbol mapping not found');
    }

    this.logger.log(`[ADMIN] Updated exchange symbol ${id}: ${JSON.stringify(body)}`);
    return { success: true, data: mapping };
  }
}

