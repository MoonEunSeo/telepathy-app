@echo off
echo [structure create.]

:: 폴더 생성
mkdir src\pages
mkdir src\components
mkdir src\services
mkdir src\contexts
mkdir src\hooks

:: 페이지 파일 생성
type nul > src\pages\index.jsx
type nul > src\pages\login.jsx
type nul > src\pages\signup.jsx
type nul > src\pages\onboarding.jsx
type nul > src\pages\qna.jsx
type nul > src\pages\terms.jsx
type nul > src\pages\feedback.jsx
type nul > src\pages\report.jsx
type nul > src\pages\admin.jsx

:: 컴포넌트 파일 생성
type nul > src\components\Modal.jsx
type nul > src\components\OnboardingImage.jsx
type nul > src\components\WordInputBox.jsx
type nul > src\components\ChatBubble.jsx
type nul > src\components\EmotionSelector.jsx
type nul > src\components\FeedbackResultModal.jsx
type nul > src\components\WordMatchResultModal.jsx
type nul > src\components\ReportForm.jsx

:: 서비스(API) 파일 생성
type nul > src\services\authService.js
type nul > src\services\kcpService.js
type nul > src\services\nicknameService.js
type nul > src\services\sessionService.js
type nul > src\services\chatService.js
type nul > src\services\feedbackService.js
type nul > src\services\reportService.js
type nul > src\services\adminService.js
type nul > src\services\wordRecommendationService.js
type nul > src\services\telepathyService.js
type nul > src\services\accountService.js

:: 상태관리 context 파일 생성
type nul > src\contexts\AuthContext.jsx
type nul > src\contexts\ModalContext.jsx
type nul > src\contexts\SessionContext.jsx

echo [complete]
pause