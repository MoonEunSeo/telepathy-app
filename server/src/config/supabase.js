/*const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = { supabase };*/

// src/config/supabase.js
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY; 
// 👉 서버에서는 보통 SERVICE_ROLE_KEY 씀 (insert, delete 권한 필요할 때)

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("SUPABASE_URL:", supabaseUrl);
console.log("SUPABASE_KEY length:", supabaseKey?.length);

module.exports = supabase; // ✅ 객체 그대로 export