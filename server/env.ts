// server/env.ts
// ⚠️ process.env를 읽는 어떤 모듈보다도 먼저 import 되어야 합니다.
// (index.ts / app.ts 최상단에서 `import './env'`)
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
