import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  OnModuleInit,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';

interface CachedUser {
  id: string;
  telegramId: number;
  role: string;
  cachedAt: number;
}

@Injectable()
export class AuthGuard implements CanActivate, OnModuleInit {
  private readonly userCache = new Map<string, CachedUser>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly reflector: Reflector,
  ) {
    // Clean up expired cache entries every minute
    setInterval(() => this.cleanupCache(), 60 * 1000);
  }

  onModuleInit() {
    // Register cache invalidator with UserService
    this.userService.registerCacheInvalidator((userId: string) => {
      this.invalidateUserCache(userId);
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const cookieToken = request.cookies?.auth_token;

    // Try cookie first, then Authorization header (for backward compatibility)
    let token: string | null = null;

    if (cookieToken) {
      token = cookieToken;
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    }

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    const payload = this.authService.verifyToken(token);

    if (!payload || !payload.id) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    // Check cache first
    const cached = this.userCache.get(payload.id);
    if (cached && Date.now() - cached.cachedAt < this.CACHE_TTL) {
      request.user = {
        id: cached.id,
        telegramId: cached.telegramId,
        role: cached.role,
      };
      return true;
    }

    // Cache miss or expired - fetch from DB
    const user = await this.userService.getById(payload.id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Update cache
    this.userCache.set(payload.id, {
      id: user.id,
      telegramId: user.telegramId,
      role: user.role,
      cachedAt: Date.now(),
    });

    request.user = {
      id: user.id,
      telegramId: user.telegramId,
      role: user.role,
    };

    return true;
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [userId, cached] of this.userCache.entries()) {
      if (now - cached.cachedAt >= this.CACHE_TTL) {
        this.userCache.delete(userId);
      }
    }
  }

  // Public method to invalidate cache when user data changes
  public invalidateUserCache(userId: string): void {
    this.userCache.delete(userId);
  }
}



