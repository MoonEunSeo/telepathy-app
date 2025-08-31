// routes/user.routes.js
const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// 유저 수 가져오기
router.get('/count', async (req, res) => {
  const { count, error } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true }); 
    // head:true → 데이터는 안가져오고 count만

  if (error) return res.status(500).json({ error: error.message });
  res.json({ userCount: count });
});

module.exports = router;
