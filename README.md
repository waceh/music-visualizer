# MTK Music Visualizer

React + TypeScript + Vite, Web Audio API 및 Canvas 2D로 만든 MTK 음악 비주얼라이저 MVP입니다. 왼쪽 MTK 로고와 오른쪽 원형 스펙트럼을 실시간으로 렌더링합니다.

## 실행

Node.js 20.19+ 또는 22.12+ 환경을 사용하세요.

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

## 사용

1. 음악 파일을 선택합니다. MP3, WAV, OGG 등의 지원 여부는 브라우저의 오디오 코덱에 따라 다릅니다.
2. 재생 버튼을 누르면 Web Audio 분석이 시작됩니다. 재생/일시정지, 탐색, 음량을 조절할 수 있습니다.
3. 원형, 막대형, 건반형 비주얼라이저를 선택합니다. 건반형은 피아노 모양의 주파수 표시이며 음정/MIDI 감지가 아닙니다.
4. Neon Pulse, Midnight Synth, Ocean Chill 프리셋을 선택하거나 링 색상과 민감도를 직접 조절합니다.
5. 배경 이미지 또는 배경 색상을 변경하고 전체 화면으로 미리봅니다.

오디오와 이미지는 로컬 object URL을 사용하며 서버에 업로드되지 않습니다. 파일 교체 시 이전 URL을 해제합니다. 새로고침하면 선택한 파일과 설정은 초기화됩니다. 파일 선택 전에는 정적인 링이 표시됩니다.

## 구조

- `src/main.tsx`: UI, 오디오 그래프, Canvas 렌더링 및 리소스 수명 관리
- `src/presets.ts`: 프리셋, 주파수 에너지 계산, 시간 표시
- `src/style.css`: 반응형 스튜디오 화면
- `tests/presets.test.ts`: 주파수 분석 유틸리티와 시간/프리셋 검증

브라우저 자동재생 정책에 따라 사용자의 재생 버튼 클릭으로 AudioContext를 시작합니다. 하나의 media element source를 재사용하고, requestAnimationFrame 종료 및 object URL 정리를 수행합니다. 모바일에서는 로고와 링을 위아래로 배치합니다.

## 후속 단계: MP4 출력

현재 버전은 실시간 미리보기만 제공합니다. 후속 단계에서는 로고·배경·링을 단일 출력 Canvas에 합성하고 오디오를 함께 캡처해야 합니다. 먼저 `captureStream`과 `MediaRecorder`로 지원 형식과 동기화를 검증하고, MP4/H.264가 지원되지 않는 환경에는 서버 FFmpeg 또는 별도 인코딩 경로를 도입합니다. 이후 해상도·프레임률·진행률·취소, 장시간 메모리 사용, 음악별 프리셋 및 플레이리스트 전환을 구현합니다. 모든 브라우저에서 MP4 녹화를 지원한다고 가정하지 않습니다.
