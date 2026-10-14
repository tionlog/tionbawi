# 요리사 야바위

Vite vanilla-ts 프로젝트입니다.

```sh
npm install
npm run dev
npm run build
```

## 현재 동작

- 시작 화면에서 가운데 덮개 아래의 소금빵이 보입니다. 구름에 마우스를 올리면 작은 안내 문구가 나타나고, 벗어나면 사라집니다. 첫 3초가 지난 뒤 그릇 영역에서 마우스를 왕복해서 비비거나 터치 드래그하면 0.35초의 텀을 두고 덮개가 닫힌 뒤 약 2초간 섞입니다. 이때 빵은 보이지 않으며, 그릇 옆에 작은 ‘휙휙’ 문구가 나타납니다. 다시 시작하면 3초 대기도 함께 초기화됩니다.
- 섞기가 끝나면 덮개 하나를 선택합니다. 이 브라우저 세션의 첫 선택은 실패하고, 이후 선택은 성공·실패를 무작위로 결정합니다. ‘다시할래’로 시작 화면에 돌아옵니다.
- 얼굴 보기, 스크롤 또는 첫 섞기 동작 시 카메라 접근을 요청합니다. 모든 카메라 화면은 `src/camera.ts`의 공통 셀피 방향 설정으로 보여주며, MediaPipe 얼굴 특징점으로 움직이는 얼굴을 모자 아래로 맞추고 사람 분할 모델로 목과 배경을 분리합니다. 권한이 없거나 얼굴을 놓치면 요리사의 기본 얼굴로 돌아갑니다. 영상은 브라우저 안에서만 처리하고 서버에 전송하거나 저장하지 않습니다. 실제 카메라·조명·얼굴 각도에 따라 합성 품질은 달라집니다.
- 실패하면 선택한 그릇 위에 행운의 편지가 나타납니다. 편지를 클릭하면 코멘트 입력창에 커서가 놓이고 입력 영역이 강조됩니다. 실패 화면에서 이름과 코멘트를 입력해 Supabase에 저장할 수 있습니다. 저장된 코멘트는 페이지 아래 말풍선 목록에 나타나고, 새 코멘트는 성공 응답 직후 추가됩니다.
- 성공하면 `success.png`를 바탕으로 한 전신 요리사가 사용자 얼굴과 접시에 놓인 소금빵을 보여줍니다. 사용자 얼굴은 468개의 3D 특징점을 카메라 텍스처와 결합한 WebGL 메시로 모자와 목깃 사이에 맞춥니다. ‘한판 더~’는 홈으로 돌아가고 ‘맛있게 먹기 (입 벌리고 준비) →’는 `eat.html`로 이동합니다. 전면 카메라가 화면을 채우고, 입을 벌리고 있으면 입 부분이 확대되며 소금빵이 반복해서 회전하며 입으로 들어갑니다. 입을 닫으면 입술 윤곽을 따라 크기가 다른 빵가루가 남습니다. 좌측 상단 ‘처음으로’는 홈으로 돌아갑니다.
- 첫 터치부터 섞이는 동안 효과음이 재생됩니다. 브라우저가 최초 hover 소리를 차단하면 화면을 한 번 클릭해 오디오를 활성화해야 합니다.
- 효과음 MP3는 `public/audio/shuffle.mp3`에 넣습니다. 파일이 없으면 짧은 합성 효과음이 재생됩니다.

## Supabase 연결

`supabase/schema.sql`을 해당 프로젝트의 SQL Editor에서 한 번 실행하세요. 현재 제공된 공개 키만으로는 테이블을 생성할 수 없습니다. 로컬 연결값은 `.env.local`에 설정되어 있으며 Git에서 제외됩니다. 다른 환경에서는 `.env.example`을 참고하세요.

코멘트 요청에 `404 / PGRST205`가 나오면 연결 키 문제가 아니라 `public.suhsih_comments` 테이블이 해당 프로젝트에 없는 상태입니다. Supabase 대시보드에서 프로젝트 `rtrxnbyoismgrutqihiq`를 선택한 다음 **SQL Editor → New query**에 `supabase/schema.sql` 전체를 붙여 넣고 **Run**을 누르세요. 이후 **Table Editor**에서 `suhsih_comments`가 보이는지 확인하고 사이트를 새로고침하면 됩니다. 이 SQL은 여러 번 실행해도 테이블의 기존 코멘트를 삭제하지 않습니다.

공개용 publishable 키만 클라이언트에 넣으세요. 서비스 역할 키는 넣지 마세요. SQL은 익명 방문자에게 코멘트 읽기·쓰기만 허용하고, 길이 제한을 데이터베이스에서도 검사합니다. 공개 쓰기이므로 운영 시 스팸 방지가 필요할 수 있습니다.

## 에셋

- `public/chef.png`: 원본 은색 덮개 질감
- `public/chef-stage-face.png`: 폭신한 복장을 바탕으로 만든 요리사와 기본 얼굴
- `public/success.png`: 사용자가 제공한 성공 화면 캐릭터 원본
- `public/success-stage.png`: 카메라 얼굴 합성을 위해 원본에서 표정만 지운 파생 이미지
- `public/salt-bread.png`: `sgbread.jpeg`를 바탕으로 만든 투명 배경 소금빵
- `public/models/`: 로컬 실행·배포용 MediaPipe 얼굴 특징점 및 사람 분할 모델과 WASM

이미지 에셋은 built-in imagegen으로 만들었습니다. 실제 프롬프트는 `docs/asset-prompts.md`에 기록했습니다.

카메라는 localhost 또는 HTTPS에서 작동합니다. `vite.config.ts`는 GitHub Pages 하위 경로를 위해 상대 경로로 빌드합니다.

## GitHub Pages 배포

이 프로젝트는 GitHub의 `tionlog/tionbawi` 저장소에 연결되어 있습니다. `vite.config.ts`의 상대 경로 설정(`base: './'`)으로 `/tionbawi/` 아래에서도 HTML, 번들, 모델 파일을 불러옵니다. 공개 주소는 `https://tionlog.github.io/tionbawi/`입니다. `.github/workflows/deploy.yml`은 `main` 브랜치로 push될 때 `npm ci`와 `npm run build`를 실행한 뒤 `dist` 폴더를 Pages에 배포합니다.

GitHub에서 최초 한 번 다음 설정이 필요합니다.

1. 저장소의 **Settings → Secrets and variables → Actions → New repository secret**에서 다음 두 항목을 추가합니다. 값은 로컬 `.env.local`에 있는 것을 사용합니다.
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
2. 저장소의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정합니다. `Deploy from a branch`에서 `main / (root)`를 사용하면 Vite가 빌드되기 전의 HTML과 TypeScript가 게시되어 화면이 비어 보입니다.
3. `main`에 push하면 **Actions → Deploy to GitHub Pages**가 빌드한 파일을 게시합니다. 작업이 성공하면 `https://tionlog.github.io/tionbawi/`에서 확인합니다.

이후에는 프로젝트 폴더에서 변경사항을 commit하고 `main`에 push할 때마다 자동 배포됩니다.

```sh
git add .
git commit -m "Update site"
git push
```

`.env.local`은 `.gitignore`에 포함되어 push되지 않습니다. 공개용 Supabase publishable key만 Actions secret으로 등록하세요. 서비스 역할 키는 브라우저용 사이트에 사용하지 마세요.

## 글꼴

사이트 전체에 Galmuri11 2.40.3의 기본·굵은 픽셀 글꼴을 적용했습니다. 글꼴은 프로젝트에 포함되어 외부 글꼴 서버 요청 없이 로드됩니다. 제작자: quiple (https://quiple.dev/font/galmuri). SIL OFL 1.1 라이선스는 `public/fonts/Galmuri-LICENSE.txt`에 포함했습니다.
