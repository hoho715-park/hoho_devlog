# hoho devlog

공부한 내용을 기록하는 Jekyll 블로그입니다. GitHub Pages로 무료 배포됩니다.

## ✍️ 새 글 쓰기

`_posts/` 폴더에 `YYYY-MM-DD-영문-제목.md` 파일을 만듭니다. (파일명은 영어로 써야 주소가 깔끔해요)

```markdown
---
title: "글 제목"
date: 2025-07-10 20:00:00 +0900
categories: [Network]        # 카테고리 1개 (없으면 '카테고리 없음'으로 표시)
tags: [TCP, 면접]             # 선택
thumbnail: /assets/images/my-image.png   # 선택: 목록 오른쪽 썸네일
description: "목록에 보일 요약"            # 선택: 없으면 본문 앞부분이 자동 표시
---

본문은 마크다운으로 작성합니다.
```

본문에 이미지를 넣을 때는 `assets/images/`에 파일을 넣고 이렇게 씁니다:

```markdown
![설명]({{ "/assets/images/my-image.png" | relative_url }})
```

## 🚀 GitHub Pages 배포

1. GitHub에서 새 저장소를 만듭니다.
   - 이름을 **`<내아이디>.github.io`** 로 하면 → `https://<내아이디>.github.io` 주소, `_config.yml`의 `baseurl: ""`
   - 다른 이름(예: `hoho_devlog`)으로 하면 → `https://<내아이디>.github.io/hoho_devlog`, `baseurl: "/hoho_devlog"`
2. `_config.yml`의 `url`, `baseurl`, `author`를 내 정보로 수정합니다.
3. 코드를 올립니다.
   ```bash
   git init
   git add .
   git commit -m "블로그 초기 세팅"
   git branch -M main
   git remote add origin https://github.com/<내아이디>/<저장소이름>.git
   git push -u origin main
   ```
4. 저장소 **Settings → Pages → Build and deployment**에서
   Source: **Deploy from a branch**, Branch: **main / (root)** 선택 후 Save.
5. 1~2분 뒤 위 주소에서 블로그가 열립니다. 이후에는 글을 push할 때마다 자동으로 반영됩니다.

## 💻 내 컴퓨터에서 미리보기 (선택)

Ruby 3 이상이 필요합니다. (macOS 기본 Ruby는 너무 오래됐어요)

```bash
brew install ruby
echo 'export PATH="/opt/homebrew/opt/ruby/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
bundle install
bundle exec jekyll serve
# → http://localhost:4000/hoho_devlog/
```

## 📁 구조

```
_config.yml        사이트 설정 (제목, 프로필, 주소)
_posts/            글 (마크다운)
_layouts/          페이지 틀 (홈, 글, 일반 페이지)
_includes/         헤더, 푸터, 글 카드, 검색창
assets/css/        디자인 (상단 :root 변수로 색상 변경)
assets/js/         다크모드, 검색, 카테고리 필터, 코드 복사
categories.html    카테고리별 글 목록
about.md           소개 페이지
```

## 기능

- 글 목록 (제목 · 요약 · 카테고리 · 날짜 · 썸네일), 페이지 나누기
- CATEGORY 드롭다운 + 카테고리 필터 페이지
- 전체 글 검색 (`/` 또는 `⌘K` 단축키)
- 다크 모드, 모바일 대응
- 코드 하이라이트 + 복사 버튼, 이전/다음 글
- RSS, sitemap, SEO 메타태그 자동 생성
