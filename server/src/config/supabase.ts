// src/config/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
// 👉 서버에서는 보통 SERVICE_ROLE_KEY 씀 (insert, delete 권한 필요할 때)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL 가 없습니다.');
} else if (!supabaseKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY 가 없습니다.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ⚠️ 아직 .js 인 라우트/유틸이 `const supabase = require(...)` 로 부르므로 CJS 호환 위해 export =
export = supabase;
