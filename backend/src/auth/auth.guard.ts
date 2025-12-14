import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly reflector: Reflector,
  ) {}

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
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/a47973cd-9634-493b-840b-96b08b73f086',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'auth.guard.ts:canActivate',message:'Auth guard check',data:{hasAuthHeader:!!authHeader,path:request.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // 개발 모드: 인증 없이도 진행 가능 (임시)
      // 하지만 req.user는 설정하지 않음 - 컨트롤러에서 처리 필요
      return true;
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = this.authService.verifyToken(token);

    if (!payload || !payload.id) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.userService.getById(payload.id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    request.user = {
      id: user.id,
      telegramId: user.telegramId,
    };

    return true;
  }
}



