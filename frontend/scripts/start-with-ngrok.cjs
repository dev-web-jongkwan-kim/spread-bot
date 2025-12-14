#!/usr/bin/env node

const { spawn } = require('child_process');
const { join } = require('path');
const { readFileSync } = require('fs');
const https = require('https');
const http = require('http');

const rootDir = join(__dirname, '..');

// 환경 변수 로드
const envFile = join(rootDir, '.env');
let port = 3032;
let ngrokAuthtoken = null;

try {
  const envContent = readFileSync(envFile, 'utf-8');
  const portMatch = envContent.match(/VITE_PORT=(\d+)/);
  if (portMatch) {
    port = parseInt(portMatch[1], 10);
  }
  
  const tokenMatch = envContent.match(/NGROK_AUTHTOKEN=(.+)/);
  if (tokenMatch) {
    ngrokAuthtoken = tokenMatch[1].trim();
  }
} catch (e) {
  // .env 파일이 없으면 기본값 사용
}

// 환경 변수에서도 확인 (우선순위 높음)
if (process.env.NGROK_AUTHTOKEN) {
  ngrokAuthtoken = process.env.NGROK_AUTHTOKEN;
}

console.log(`🚀 Starting Vite dev server on port ${port}...`);

// Vite 서버 시작
const vite = spawn('npm', ['run', 'dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
});

vite.on('error', (err) => {
  console.error('Failed to start Vite:', err);
  process.exit(1);
});

// Vite 서버가 준비될 때까지 대기 후 ngrok 시작
setTimeout(() => {
  (async () => {
    try {
      console.log('🌐 Starting ngrok tunnel...');
      
      if (!ngrokAuthtoken) {
        throw new Error('NGROK_AUTHTOKEN not found. Please set it in .env file or environment variable.');
      }

      // ngrok 바이너리 직접 사용 (백그라운드 실행)
      const ngrokCmd = spawn('ngrok', ['http', port.toString(), '--authtoken', ngrokAuthtoken, '--log=stdout'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        detached: false,
      });

      let ngrokUrl = null;
      let hasError = false;

      // ngrok API를 통해 URL 가져오기 (4040 포트)
      const fetchNgrokUrl = () => {
        const maxAttempts = 20;
        let attempts = 0;
        
        const tryFetch = () => {
          attempts++;
          
          const req = http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
              data += chunk;
            });
            
            res.on('end', () => {
              try {
                const json = JSON.parse(data);
                if (json.tunnels && json.tunnels.length > 0) {
                  const httpsTunnel = json.tunnels.find(t => t.proto === 'https');
                  if (httpsTunnel && !ngrokUrl) {
                    ngrokUrl = httpsTunnel.public_url;
                    console.log('\n✅ ngrok tunnel established!');
                    console.log(`📱 Public URL: ${ngrokUrl}`);
                    console.log(`🔗 Local URL: http://localhost:${port}`);
                    console.log('\n💡 Update Telegram Bot domain in BotFather:');
                    console.log(`   /setdomain ${new URL(ngrokUrl).hostname}\n`);
                    return;
                  }
                }
              } catch (e) {
                // JSON 파싱 실패, 계속 시도
              }
              
              if (attempts < maxAttempts && !ngrokUrl && !hasError) {
                setTimeout(tryFetch, 500);
              } else if (!ngrokUrl && !hasError) {
                console.log('💡 ngrok이 시작되었지만 URL을 가져올 수 없습니다.');
                console.log('   브라우저에서 http://127.0.0.1:4040 을 열어 URL을 확인하세요.');
              }
            });
          });
          
          req.on('error', () => {
            // API가 아직 준비되지 않음
            if (attempts < maxAttempts && !hasError) {
              setTimeout(tryFetch, 500);
            }
          });
          
          req.setTimeout(1000, () => {
            req.destroy();
            if (attempts < maxAttempts && !hasError) {
              setTimeout(tryFetch, 500);
            }
          });
        };
        
        setTimeout(tryFetch, 2000); // 2초 후 시작
      };

      ngrokCmd.stdout.on('data', (data) => {
        const output = data.toString();
        // stdout은 로그만 출력
      });

      ngrokCmd.stderr.on('data', (data) => {
        const error = data.toString();
        if (error.includes('ERROR') || error.includes('ERR_')) {
          hasError = true;
          console.error('❌ ngrok error:', error);
          
          // 치명적 에러인 경우 프로세스 종료
          if (error.includes('ERR_NGROK_121') || error.includes('too old')) {
            console.error('\n💡 ngrok-agent 버전이 너무 오래되었습니다.');
            console.error('   ngrok 바이너리를 완전히 재설치하세요:');
            console.error('   1. brew uninstall ngrok');
            console.error('   2. brew install ngrok/ngrok/ngrok');
            console.error('   3. 또는 https://ngrok.com/download 에서 최신 버전 다운로드');
            ngrokCmd.kill();
            vite.kill();
            process.exit(1);
          }
        }
      });

      ngrokCmd.on('error', (err) => {
        hasError = true;
        console.error('❌ Failed to start ngrok:', err.message);
        console.log('💡 Make sure ngrok is installed: brew install ngrok/ngrok/ngrok');
        console.log('   Or download from: https://ngrok.com/download');
      });

      // ngrok이 시작된 후 API를 통해 URL 가져오기
      setTimeout(() => {
        if (!hasError) {
          fetchNgrokUrl();
        }
      }, 2000);

      // 종료 시 정리
      const cleanup = () => {
        console.log('\n🛑 Shutting down...');
        ngrokCmd.kill();
        vite.kill();
        process.exit(0);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
    } catch (error) {
      console.error('❌ Failed to start ngrok:', error.message);
      console.log('💡 Make sure NGROK_AUTHTOKEN is set in your .env file');
      console.log('   Get your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken');
    }
  })();
}, 3000); // 3초 대기 (Vite 서버 시작 시간)

