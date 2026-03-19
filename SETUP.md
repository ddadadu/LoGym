# React + Vite-PWA 프로젝트 초기 세팅 가이드 (LoGym)

본 문서는 **LoGym** 프로젝트의 초기 프론트엔드 환경(React + Vite + PWA + Tailwind CSS) 구축 과정을 순차적으로 안내합니다. 팀원 혹은 개발 시 참조할 수 있도록 작성되었습니다.

---

## 1. React + Vite 프로젝트 생성

Vite를 사용하여 기존 CRA보다 빠르고 가벼운 React 개발 환경을 구성합니다. 현재 작업 중인 폴더(`LoGym`)를 최상위 경로로 지정하여 설치합니다.

```bash
# 터미널을 열고 LoGym 폴더 내부에서 실행
npm create vite@latest . -- --template react
# (또는 TypeScript 사용 시: npm create vite@latest . -- --template react-ts)

# 설정 완료 후 패키지 설치
npm install
```

## 2. PWA (Progressive Web App) 플러그인 설정

앱의 오프라인 대응 및 사용자 모바일/데스크톱 홈 화면 앱 설치(A2HS) 기능을 지원하기 위하여 `vite-plugin-pwa`를 세팅합니다.

### 2.1. 설치
```bash
npm install vite-plugin-pwa -D
```

### 2.2. `vite.config.js` 수정
설치 후 루트 디렉토리에 있는 `vite.config.js` (또는 `.ts`) 파일을 열어 PWA 옵션을 추가합니다.

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'LoGym - 피트니스 커뮤니티',
        short_name: 'LoGym',
        description: '사용자 참여형 장소 기반 운동 관리 및 피트니스 커뮤니티',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})
```
> **참고**: PWA가 정상 작동하려면 `public/` 폴더 내부에 명시된 해상도(`192x192`, `512x512`)의 아이콘 이미지를 반드시 배치해야 합니다.

## 3. Tailwind CSS 설치 및 설정

모바일 우선 개발 및 반응형 디자인을 위해 유틸리티 CSS 프레임워크인 Tailwind CSS를 설정합니다.

### 3.1. 설치
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```
위 명령어를 실행하면 `tailwind.config.js`와 `postcss.config.js` 파일이 생성됩니다.

### 3.2. `tailwind.config.js` 수정
템플릿 파일들의 경로를 Tailwind 컴파일러에 전달합니다.
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### 3.3. `src/index.css` 수정
기존 코드를 모두 지우고 Tailwind CSS의 `base`, `components`, `utilities` 지시어를 최상단에 추가합니다.
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* 아래에 글로벌 적용이 필요한 CSS 추가 가능 */
```

## 4. 추가 라이브러리 설치 (요구사항 반영)

개발 명세서에 명시된 기능 구현을 지원하기 위한 패키지 라이브러리 설치 목록입니다. 필요에 따라 선택적으로 설치를 진행해 주세요.

```bash
# 1. 페이지 라우팅 지원
npm install react-router-dom

# 2. 백엔드/DB 연동 (Supabase)
npm install @supabase/supabase-js

# 3. 달력 기반 운동 데이터 시각화 (React FullCalendar)
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/interaction

# 4. 카카오 맵 API (선택적 SDK 래핑 라이브러리)
npm install react-kakao-maps-sdk
```

## 5. 로컬 서버 실행 및 확인

모든 초기 환경 구성이 끝났습니다. 아래 명령어를 통해 프로젝트를 실행하여 접속해 봅니다.

```bash
npm run dev
```

서버 실행 후, 터미널에 나타나는 주소(`http://localhost:5173/` 등)에 들어가 정상적으로 애플리케이션이 표시되는지 확인합니다. PWA 지원은 크롬 등 브라우저의 개발자 도구(Application 탭 > Manifest) 내에서 정상 등록 여부를 점검할 수 있습니다.
