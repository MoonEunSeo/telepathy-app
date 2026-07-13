// src/config/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL as string;
// 👉 서버에서는 보통 SERVICE_ROLE_KEY 씀 (insert, delete 권한 필요할 때)
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY) as string;

const supabase = createClient(supabaseUrl, supabaseKey);

// ⚠️ 아직 .js 인 라우트/유틸이 `const supabase = require(...)` 로 부르므로 CJS 호환 위해 export =
export = supabase;
