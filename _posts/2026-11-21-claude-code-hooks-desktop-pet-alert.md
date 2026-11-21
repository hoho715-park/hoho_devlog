---
layout: post
title: "Claude Code 작업이 끝나면 데스크톱 펫이 알려주게 만들기 (Hooks 활용)"
date: 2026-11-21 11:54:00 +0900
categories: [AI]
tags: [Claude Code, Hooks, Swift, macOS, 자동화]
description: "Claude Code에 일을 맡기고 다른 작업을 하다 보면 끝난 줄 모르는 문제가 있었다. Stop·Notification 훅으로 맥 데스크톱 펫 몽글이가 작업 완료를 알려주게 만든 과정을 정리했다."
thumbnail: /assets/images/posts/claude-code-hooks-desktop-pet-alert/thumbnail.svg
---

Claude Code에 작업을 맡겨 두고 다른 일을 하다 보면, 작업이 끝났는지 알 수가 없었다.
그래서 지난번에 만든 맥 데스크톱 펫 **몽글이**가 Claude Code 작업이 끝나면 알려주도록 붙여 봤다.

## 불편했던 점

VS Code의 Claude Code 창에 "포트폴리오 히어로 문구 바꿔줘" 같은 일을 맡기면 몇 분씩 걸린다. 그동안 다른 창에서 작업을 하는데, 문제는 **끝났다는 신호가 없다**는 것이다.

- 끝났는지 보려고 VS Code를 계속 왔다 갔다 한다.
- 반대로 깜빡하면 작업은 이미 끝났는데 한참 놀려 두게 된다.
- 중간에 "이 명령 실행해도 될까요?" 같은 **권한 확인**에서 멈춰 있는 경우도 있었다.

![알림 전후 작업 흐름 비교]({{ "/assets/images/posts/claude-code-hooks-desktop-pet-alert/diagram-2.svg" | relative_url }})
*그림 1. 알림이 없으면 계속 확인하러 가야 하고, 알림이 있으면 신호가 올 때만 돌아가면 된다*

## 해결 아이디어: Claude Code 훅 + 몽글이

Claude Code에는 **훅(Hooks)** 기능이 있다. 특정 시점에 내가 정한 셸 명령을 자동으로 실행해 주는 기능이다. 이걸로 "작업이 끝나면 몽글이에게 신호 보내기"를 만들었다.

> **한줄 정리**: Claude Code 훅이 파일에 한 줄을 남기고, 몽글이가 그 파일을 지켜보다가 새 줄이 생기면 알림을 띄운다.

![훅에서 몽글이 알림까지의 흐름]({{ "/assets/images/posts/claude-code-hooks-desktop-pet-alert/diagram-1.svg" | relative_url }})
*그림 2. Stop 훅 → notify.sh → events.jsonl → 몽글이 → 알림 카드 → VS Code*

사용한 훅은 두 가지다.

| 훅 | 실행되는 때 | 몽글이 반응 |
|---|---|---|
| `Stop` | Claude Code가 답변(작업)을 마쳤을 때 | 초록 카드 "작업 끝났어요!" + 띵 소리 |
| `Notification` | 권한 승인 등 내 확인이 필요할 때 | 주황 카드 "확인이 필요해요!" |

## 1. 훅이 실행할 스크립트 만들기

훅은 실행될 때 세션 정보(작업 폴더 `cwd` 등)를 **stdin으로 JSON**을 넘겨준다. 이걸 받아서 `~/.deskpet/events.jsonl`에 한 줄로 덧붙이는 스크립트를 만들었다.

```bash
#!/bin/bash
# 사용: notify.sh done | ask
KIND="${1:-done}"
DIR="$HOME/.deskpet"
mkdir -p "$DIR"
PAYLOAD="$(cat | tr -d '\n\r')"
[ -z "$PAYLOAD" ] && PAYLOAD='{}'
APP="${__CFBundleIdentifier:-}"   # 훅을 실행한 앱 (VS Code 등)
printf '{"kind":"%s","app":"%s","time":%s,"hook":%s}\n' "$KIND" "$APP" "$(date +%s)" "$PAYLOAD" >> "$DIR/events.jsonl"
exit 0
```

- `cwd`의 마지막 폴더 이름(예: `portfolio`)을 프로젝트 이름으로 보여준다.
- 맥에서는 앱이 실행한 프로세스에 `__CFBundleIdentifier` 환경 변수가 따라온다. 그래서 VS Code에서 돌던 Claude Code라면 `com.microsoft.VSCode`가 찍힌다. 나중에 **열기** 버튼을 누를 때 이 값으로 그 앱을 앞으로 가져온다.
- 훅이 오래 걸리면 Claude Code가 기다리게 되니까, 파일에 한 줄 쓰고 바로 `exit 0` 한다.

## 2. settings.json에 훅 등록하기

훅은 `~/.claude/settings.json`에 등록한다.

```json
{
  "hooks": {
    "Stop": [
      { "hooks": [{ "type": "command", "command": "bash \"$HOME/.deskpet/notify.sh\" done" }] }
    ],
    "Notification": [
      { "hooks": [{ "type": "command", "command": "bash \"$HOME/.deskpet/notify.sh\" ask" }] }
    ]
  }
}
```

직접 고치다가 기존 설정을 날릴까 봐 `install-hooks.sh`를 만들었다. 이 스크립트는 다음 일을 한다.

- `notify.sh`를 `~/.deskpet/`에 복사한다. 프로젝트 폴더를 옮겨도 훅이 깨지지 않게 하기 위해서다.
- 기존 `settings.json`을 `settings.json.bak`으로 **백업**한다.
- 원래 있던 설정과 훅은 그대로 두고, 몽글이 훅만 **추가**한다.
- 이미 등록돼 있으면 다시 추가하지 않는다. 그래서 여러 번 실행해도 안전하다.

> **주의**: 훅 설정은 세션을 시작할 때 읽힌다. 이미 열려 있는 Claude Code 창은 새로 시작해야 적용된다.

## 3. 몽글이가 파일 지켜보기

몽글이(Swift)에서는 1초마다 `events.jsonl`의 크기를 확인하고, 지난번에 읽은 위치 이후의 새 줄만 읽는다.

```swift
private func poll() {
    let size = fileSize()
    if size < offset { offset = 0 }                        // 파일이 비워졌으면 처음부터
    guard size > offset, let h = try? FileHandle(forReadingFrom: url) else { return }
    defer { try? h.close() }
    try? h.seek(toOffset: offset)
    let data = h.readDataToEndOfFile()
    guard let lastNL = data.lastIndex(of: 0x0A) else { return }   // 줄바꿈까지만 처리
    let complete = data[data.startIndex...lastNL]
    offset += UInt64(complete.count)
    // 한 줄씩 JSON 파싱 → 알림 카드 띄우기
}
```

## 신경 쓴 부분

| 문제 | 해결 |
|---|---|
| 앱을 켜자마자 예전 기록이 알림으로 쏟아짐 | 시작할 때 파일 끝 위치부터 읽기 시작 |
| 아직 쓰는 중인 줄을 읽으면 JSON이 깨짐 | 마지막 줄바꿈까지만 처리하고 나머지는 다음 번에 |
| 작업이 끝나고 한참 뒤 "입력을 기다리는 중" 알림이 또 옴 | `Notification` 중에 "waiting for your input" 메시지는 무시 (`Stop`과 중복) |
| 같은 프로젝트 알림이 계속 쌓임 | 같은 프로젝트는 최신 알림 하나만 남김 |
| 기록 파일이 계속 커짐 | 500KB를 넘으면 파일을 비움 |
| 어느 앱을 열어야 할지 모름 | `__CFBundleIdentifier`로 훅을 실행한 앱을 기록 (없으면 VS Code) |

## 한계

이 방법은 **Claude Code**에서만 된다. claude.ai나 Claude 앱의 일반 채팅 답변에는 이런 훅 기능이 없어서, 몽글이가 답변이 끝났는지 알 수 없다.

## 테스트 방법

```bash
# 1) 빌드 + 훅 설치
bash ~/Projects/DeskPet/build.sh && bash ~/Projects/DeskPet/install-hooks.sh

# 2) Claude Code 없이 신호만 흉내 내기
echo '{"cwd":"'$HOME'/Projects/portfolio"}' | bash ~/.deskpet/notify.sh done

# 3) 기록이 남았는지 확인
tail -3 ~/.deskpet/events.jsonl
```

몽글이를 우클릭해서 **알림 테스트**로 화면을 먼저 확인했다. 그다음 Claude Code 새 세션에 짧은 일을 시켜서 실제 알림이 오는지 확인하는 순서로 테스트했다.

## 정리

- Claude Code에 일을 맡기고 다른 작업을 하면 **끝난 줄 모르는 문제**가 있었다.
- `Stop` 훅(작업 완료)과 `Notification` 훅(확인 필요)으로 신호를 받을 수 있다.
- 훅 → 파일에 한 줄 기록 → 펫이 1초마다 확인하는 단순한 구조로 연결했다.
- `__CFBundleIdentifier`로 훅을 실행한 앱을 알아내서 **열기** 버튼 한 번에 돌아갈 수 있다.
- 훅 설정은 세션을 시작할 때 읽히니까, 설치한 뒤에는 Claude Code를 새로 시작해야 한다.
