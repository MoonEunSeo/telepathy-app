const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const token = req.cookies.token; // 쿠키에서 토큰 읽기
  if (!token) {
    return res.status(401).json({ success: false, message: "인증 필요" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // ✅ req.user 에 user_id, username 저장
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "유효하지 않은 토큰" });
  }
}

module.exports = authMiddleware;