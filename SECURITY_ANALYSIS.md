# CryptoSpreadBot 보안 분석 보고서

## 분석 일자
2024년 12월

---

## 1. 현재 구현된 보안 기능

| 기능 | 상태 | 구현 위치 |
|------|------|----------|
| **Rate Limiting** | ✅ 구현됨 | `app.module.ts` - 100req/분 |
| **Helmet 보안 헤더** | ✅ 구현됨 | `main.ts` - CSP, XSS 보호 등 |
| **CORS 제한** | ✅ 구현됨 | `main.ts` - 프로덕션에서 화이트리스트만 허용 |
| **입력 유효성 검사** | ⚠️ 부분 | `ValidationPipe` 설정됨, 하지만 DTO 미사용 |
| **JWT 인증** | ⚠️ 취약 | Base64 인코딩만 사용 (실제 JWT 아님) |
| **권한 분리** | ✅ 구현됨 | `AuthGuard`, `AdminGuard` |
| **웹훅 서명 검증** | ✅ 구현됨 | LemonSqueezy HMAC 검증 |
| **에러 마스킹** | ✅ 구현됨 | 프로덕션에서 내부 에러 숨김 |
| **Sentry 에러 추적** | ✅ 구현됨 | 500 에러 자동 보고 |

---

## 2. 🔴 심각한 보안 취약점

### 2.1 인증 우회 가능 (Critical)

**파일**: `backend/src/auth/auth.guard.ts`

```typescript
// auth.guard.ts:36-39
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  // 개발 모드: 인증 없이도 진행 가능 (임시)
  return true;  // ← 인증 없이 통과!
}
```

- **문제**: 토큰 없이도 모든 API 접근 가능
- **영향**: 누구나 API 호출 가능
- **해결**: 프로덕션에서는 반드시 `UnauthorizedException` throw

### 2.2 JWT가 아닌 Base64 인코딩

**파일**: `backend/src/auth/auth.service.ts`

```typescript
generateToken(userId: string): string {
  const payload = { id: userId, exp: ... };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}
```

- **문제**: 서명이 없어 토큰 위조 가능
- **영향**: 다른 사용자로 위장 가능
- **해결**: `jsonwebtoken` 라이브러리로 실제 JWT 구현 필요

### 2.3 Telegram 로그인 검증 없음

**파일**: `backend/src/auth/auth.controller.ts`

```typescript
@Post('telegram')
async loginWithTelegram(@Body() telegramData: any) {
  // telegramData 검증 없이 바로 사용!
  const user = await this.userService.createOrUpdate(telegramData.id, ...);
}
```

- **문제**: Telegram 서명 검증 없음
- **영향**: 가짜 Telegram 데이터로 계정 생성/탈취 가능
- **해결**: Telegram Bot API 서명 검증 로직 추가 필요

---

## 3. 🟡 중간 수준 취약점

### 3.1 DTO 미사용으로 입력 검증 부족

```typescript
// 현재: 타입 없음
@Body() body: { symbol: string }

// 권장: DTO + class-validator
@Body() body: AddCoinDto
```

- **현황**: 대부분 API에서 `any` 또는 inline 타입 사용
- **영향**: 예상치 못한 데이터 입력 가능
- **해결**: 모든 API 엔드포인트에 DTO 클래스 생성

### 3.2 SQL Injection 위험

- **현황**: TypeORM 사용으로 대부분 안전
- **확인 필요**: 52개의 `createQueryBuilder`/`query`/`execute` 호출
- **권장**: Raw query 사용 시 파라미터 바인딩 필수

### 3.3 XSS 방어

- **현황**: 프론트엔드에서 사용자 입력 이스케이프 처리 필요
- **권장**: React의 기본 이스케이프 외 추가 검증

---

## 4. 🟢 양호한 부분

| 항목 | 상태 | 비고 |
|------|------|------|
| LemonSqueezy 웹훅 HMAC 검증 | ✅ | `crypto.timingSafeEqual` 사용 |
| Admin Guard 분리 | ✅ | 관리자 API 별도 보호 |
| 프로덕션 에러 마스킹 | ✅ | 내부 정보 노출 방지 |
| Health 엔드포인트 Public | ✅ | 적절한 설정 |
| ValidationPipe 설정 | ✅ | whitelist, forbidNonWhitelisted |

---

## 5. 보안 개선 필요 사항 (우선순위)

### 🔴 긴급 (배포 전 필수)

| 순위 | 항목 | 설명 |
|------|------|------|
| 1 | **AuthGuard 수정** | 인증 없이 통과하는 코드 제거 |
| 2 | **실제 JWT 구현** | jsonwebtoken 라이브러리로 교체 |
| 3 | **Telegram 로그인 검증** | Telegram 서명 검증 추가 |

### 🟡 중요 (배포 후 빠른 시일 내)

| 순위 | 항목 | 설명 |
|------|------|------|
| 4 | **DTO 클래스 생성** | 모든 API에 DTO + class-validator 적용 |
| 5 | **민감 데이터 로깅 제거** | 디버그 로그에서 토큰/비밀번호 제거 |
| 6 | **API 키 보호** | 외부 API 키 암호화 저장 |

### 🟢 권장

| 순위 | 항목 | 설명 |
|------|------|------|
| 7 | **IP 기반 차단** | 의심스러운 IP 자동 차단 |
| 8 | **로그인 시도 제한** | 연속 실패 시 잠금 |
| 9 | **보안 헤더 강화** | HSTS, X-Content-Type-Options 등 |

---

## 6. Telegram 로그인 검증 구현 예시

현재 누락된 Telegram 서명 검증 로직:

```typescript
import * as crypto from 'crypto';

function verifyTelegramAuth(data: any, botToken: string): boolean {
  const { hash, ...params } = data;
  
  // Telegram Bot Token의 SHA256 해시를 secret key로 사용
  const secret = crypto.createHash('sha256').update(botToken).digest();
  
  // 파라미터를 알파벳 순으로 정렬하여 체크 문자열 생성
  const checkString = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('\n');
  
  // HMAC-SHA256으로 서명 생성
  const hmac = crypto.createHmac('sha256', secret)
    .update(checkString)
    .digest('hex');
  
  // 타이밍 공격 방지를 위한 안전한 비교
  return crypto.timingSafeEqual(
    Buffer.from(hmac),
    Buffer.from(hash)
  );
}

// 사용 예시
@Post('telegram')
async loginWithTelegram(@Body() telegramData: any) {
  // 1. 서명 검증
  if (!verifyTelegramAuth(telegramData, this.config.telegramBotToken)) {
    throw new UnauthorizedException('Invalid Telegram auth data');
  }
  
  // 2. 인증 시간 검증 (5분 이내)
  const authDate = telegramData.auth_date * 1000;
  if (Date.now() - authDate > 5 * 60 * 1000) {
    throw new UnauthorizedException('Telegram auth data expired');
  }
  
  // 3. 사용자 생성/업데이트
  const user = await this.userService.createOrUpdate(telegramData.id, ...);
}
```

---

## 7. JWT 실제 구현 예시

현재 Base64 인코딩 대신 실제 JWT 구현:

```typescript
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  
  constructor(private readonly config: ConfigService) {
    this.jwtSecret = config.get('JWT_SECRET');
    if (!this.jwtSecret || this.jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters');
    }
  }

  generateToken(userId: string): string {
    return jwt.sign(
      { id: userId },
      this.jwtSecret,
      { expiresIn: '30d' }
    );
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      return null;
    }
  }
}
```

---

## 8. AuthGuard 수정 예시

인증 우회 제거:

```typescript
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

  // 토큰 없으면 무조건 거부
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedException('Authentication required');
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
```

---

## 9. 요약

| 카테고리 | 현재 상태 | 위험도 |
|----------|----------|--------|
| **인증** | ❌ 우회 가능 | 🔴 Critical |
| **토큰** | ❌ 위조 가능 | 🔴 Critical |
| **Telegram 검증** | ❌ 없음 | 🔴 Critical |
| **입력 검증** | ⚠️ 부분 | 🟡 Medium |
| **Rate Limiting** | ✅ 구현됨 | 🟢 Low |
| **CORS** | ✅ 구현됨 | 🟢 Low |
| **보안 헤더** | ✅ 구현됨 | 🟢 Low |

---

## 10. 결론

현재 상태로는 **프로덕션 배포 불가**합니다.

### 배포 전 필수 수정 사항:
1. AuthGuard의 인증 우회 코드 제거
2. 실제 JWT 라이브러리로 토큰 구현
3. Telegram 로그인 서명 검증 추가

### 예상 작업 시간:
- 긴급 수정 (1-3번): 약 2-4시간
- 중요 수정 (4-6번): 약 4-8시간
- 권장 수정 (7-9번): 약 4-6시간

