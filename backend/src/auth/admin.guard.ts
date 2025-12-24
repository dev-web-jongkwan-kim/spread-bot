import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { UserRole } from '../common/constants';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const cookieToken = request.cookies?.auth_token;

    // Try cookie first, then Authorization header
    let token: string | null = null;

    if (cookieToken) {
      token = cookieToken;
    } else if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
    }

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    const payload = this.authService.verifyToken(token);

    if (!payload || !payload.id) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.userService.getById(payload.id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check admin role
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    request.user = {
      id: user.id,
      telegramId: user.telegramId,
      role: user.role,
    };

    return true;
  }
}

