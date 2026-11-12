# LANTERNFALL 한글화 (비공식)

원작: **[LANTERNFALL](https://github.com/loktar00/lanternfall)** by [loktar00](https://github.com/loktar00)
원작 플레이: https://loktar00.github.io/lanternfall/

이 저장소는 원작자가 만든 공식 한글화가 **아닙니다**. 원작 게임을 한국어로 옮긴 비공식 팬 한글화입니다.
원작 저장소에는 라이선스가 명시되어 있지 않으며, 원 저작권자의 권리는 그대로 유지됩니다.
원 저작권자가 문제를 제기하면 이 공개본은 내려갈 수 있습니다.

## 플레이

`index.html` 하나로 동작하는 단일 페이지 게임입니다. 브라우저로 열면 바로 플레이할 수 있습니다.

- Enter / Space (또는 클릭): 타이틀 화면에서 시작
- 전투는 자동으로 진행되고, 영웅들은 쿨다운마다 스킬을 사용합니다
- Space: 랜턴 섬광 (위기의 웨이브에서 전장을 밝히고 파티를 강화)
- M: 메뉴 (파티/장비/캠프/가호/소리) · Esc: 패널 닫기 · C: 클로즈업 카메라
- `+` / `-`: 게임 속도 (1x, 2x, 4x) · F8: 소리 디버그 오버레이
- 소리는 페이지를 한 번 클릭해야 켜집니다 (브라우저 오디오 정책)

## 한글화 범위

영웅·몬스터·보스 이름, 스킬, 카드 31장, 장비/유물, 캠프/가호, 지역 이름, HUD, 메뉴 전체,
타이틀/결과 화면, 토스트와 전투 플로팅 텍스트까지 게임 내 표시 문자열 전체를 한국어로 옮겼습니다.
게임 타이틀(LANTERNFALL)과 빌드 표기는 원형을 유지했습니다.

## 빌드

```sh
sh tools/build.sh          # index.html 생성
sh tools/build.sh stage    # stage.html 생성
```

`python`과 `node`가 필요합니다. `three.min.js`와 `src/*.js`를 `src/head.html` 템플릿에 합쳐
하나의 페이지를 만듭니다. 한글 문자열은 빌드 시 `tools/ascii.py`가 `\uXXXX` 이스케이프로 변환합니다.

## 크레딧

- 원작 게임: loktar00 (저작권은 원 저작권자에게 있습니다)
- 3D 엔진: [three.js](https://threejs.org/) (MIT)
- 한글화: Instinct (비공식)
