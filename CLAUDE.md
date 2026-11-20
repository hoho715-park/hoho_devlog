# hoho devlog — Claude Code 작업 규칙

Jekyll 블로그이며 GitHub Pages(main 브랜치, root)로 배포된다. 사용 법은 README.md 참고.

## 글 올리기 요청을 받았을 때
사용자는 `prompts/study-to-post.md`로 claude.ai에서 만든 프롬프트를 붙여넣는다.
그 안의 `<file path="...">...</file>` 블록을 각각 해당 경로에 파일로 저장한다.

1. **front matter 확인**: `title`, `date`, `categories`(1개), `tags`, `description`, `thumbnail`이 있어야 한다.
   - `date`는 `YYYY-MM-DD HH:MM:SS +0900` 형식. 시간이 없으면 지금 시각(한국 시간)을 넣는다.
   - 파일명 날짜와 `date`의 날짜가 같아야 한다. 같은 slug의 글이 이미 있으면 덮어쓰기 전에 물어본다.
2. **그림 확인**: 본문에서 참조하는 모든 이미지 파일이 실제로 존재하는지 확인한다.
   - 이미지 경로는 반드시 `{{ "/assets/images/posts/<slug>/파일" | relative_url }}` 형식 (baseurl 때문에 `/assets/...`만 쓰면 배포 후 깨진다).
   - SVG는 XML로 파싱되는지 확인한다 (`python3 -c "import xml.dom.minidom,sys; xml.dom.minidom.parse(sys.argv[1])" 파일`).
   - 사용자가 스크린샷 등 이미지를 직접 첨부하면 `assets/images/posts/<slug>/`에 저장하고 본문에 넣는다.
3. **카테고리**: 기존 카테고리(`grep -h '^categories' _posts/*.md`)와 비슷한 게 있으면 그 이름을 그대로 쓴다 (예: `network`와 `Network`를 섞지 않기).
4. 끝나면 만든 파일 목록과 `[검토 메모]` 내용을 사용자에게 알려준다.
5. commit/push는 사용자가 요청할 때만 한다.

## 폴더 규칙
- 글: `_posts/YYYY-MM-DD-<slug>.md` (파일명은 영문 소문자와 하이픈)
- 글 이미지: `assets/images/posts/<slug>/` (`thumbnail.svg`, `diagram-1.svg`, ...)
- 디자인 색상: `assets/css/style.css` 맨 위 `:root` 변수
