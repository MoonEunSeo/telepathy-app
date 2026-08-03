import { SolapiMessageService } from 'solapi';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`환경변수 ${name} 가 없습니다.`);
  return value;
}

/**
 * 발송 수단을 서비스에서 분리한다.
 *
 * 이유 두 가지 —
 *   ① 검증 스크립트를 돌릴 때마다 실제 문자가 나가면 안 된다 (건당 과금이다)
 *   ② 업체를 바꿔도 service 코드가 바뀌지 않는다
 */
export interface SmsSender {
  send(to: string, text: string): Promise<void>;
}

class SolapiSender implements SmsSender {
  private service = new SolapiMessageService(
    requireEnv('SOLAPI_API_KEY'),
    requireEnv('SOLAPI_API_SECRET'),
  );

  async send(to: string, text: string): Promise<void> {
    await this.service.send({ to, from: requireEnv('SENDER_PHONE'), text });
  }
}

/** 로컬·검증용. 실제로 쏘지 않고 콘솔에만 남긴다. */
class ConsoleSender implements SmsSender {
  async send(to: string, text: string): Promise<void> {
    console.log(`📨 [SMS 생략] ${to} — ${text}`);
  }
}

// 지연 생성한다. 모듈을 import 하는 것만으로 Solapi 키를 요구하면,
// 문자를 보내지 않는 검증 스크립트까지 키가 없으면 죽는다.
let cached: SmsSender | null = null;

export function smsSender(): SmsSender {
  if (!cached) {
    cached = process.env.SMS_DRIVER === 'console' ? new ConsoleSender() : new SolapiSender();
  }
  return cached;
}
