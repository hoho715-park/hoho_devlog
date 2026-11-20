---
layout: post
title: "맥북에 나만의 데스크톱 펫 만들기 (SwiftUI + EventKit으로 일정·할 일 관리)"
date: 2026-11-20 20:04:00 +0900
categories: [Swift]
tags: [Swift, SwiftUI, EventKit, macOS, Claude]
description: "화면 오른쪽 아래에 늘 떠 있는 캐릭터가 오늘·내일 일정과 할 일 체크리스트를 보여주고, 클릭하면 Claude 앱을 여는 맥 데스크톱 펫을 Swift로 만든 기록이다."
thumbnail: /assets/images/posts/macos-desktop-pet-swiftui/thumbnail.svg
---

맥북 화면에 내 캐릭터가 하나 떠 있고, 누르면 Claude가 켜지고, 오늘 일정과 할 일을 알려주는 "나만의 펫"을 만들어 봤다.
Claude와 대화하면서 Swift 코드를 받아 직접 빌드했고, 중간에 생긴 삽질까지 같이 정리한다.

## 만들고 싶었던 것

- 화면 **오른쪽 아래**에 항상 떠 있는 캐릭터 (내가 그린 원숭이 그림)
- 캐릭터 **클릭 → Claude 앱 실행**, 드래그로 위치 이동
- **오늘 일정**: 구글 캘린더 일정을 보기 전용으로 표시
- **오늘 할 일**: 직접 적는 체크리스트. 내일이나 다른 날 할 일도 미리 적을 수 있게
- 말풍선은 **접고 펼치기** 가능. 접으면 원 버튼 두 개(파랑 = 일정, 주황 = 할 일)로 오늘·내일 내용만 살짝 보기

> **한줄 정리**: 투명한 떠 있는 창(NSPanel) 위에 SwiftUI로 캐릭터와 말풍선을 그리고, 데이터는 EventKit으로 맥 캘린더·미리알림에서 가져온다.

## 전체 구조

![데스크톱 펫 전체 구조]({{ "/assets/images/posts/macos-desktop-pet-swiftui/diagram-1.svg" | relative_url }})
*그림 1. 구글 캘린더 → 맥 캘린더 → EventKit → 앱으로 이어지는 데이터 흐름*

구글 캘린더 API를 직접 붙이지 않은 게 핵심이다. 맥 **시스템 설정 → 인터넷 계정**에 구글 계정을 추가하고 캘린더를 켜 두면, 구글 일정이 맥 기본 캘린더로 동기화된다. 앱은 맥 캘린더만 읽으면 되니까 OAuth 설정이 필요 없다.

| 역할 | 사용한 것 |
|---|---|
| 항상 떠 있는 투명 창 | `NSPanel` (AppKit) |
| 캐릭터·말풍선 화면 | SwiftUI (`NSHostingController`) |
| 일정 읽기 / 할 일 저장 | EventKit (`EKEvent`, `EKReminder`) |
| Claude 앱 실행 | `NSWorkspace` |
| 로그인 시 자동 실행 | `SMAppService` (ServiceManagement) |

## 항상 떠 있는 투명 창 만들기

테두리 없는 투명 창을 띄우고, 데스크톱(스페이스)을 바꿔도 따라오게 설정한다. `.nonactivatingPanel`을 쓰면 창을 클릭해도 다른 앱의 포커스를 뺏지 않는다.

```swift
let panel = PetPanel(contentRect: NSRect(x: 0, y: 0, width: 320, height: 400),
                     styleMask: [.borderless, .nonactivatingPanel],
                     backing: .buffered, defer: false)
panel.contentViewController = NSHostingController(rootView: RootView(store: store, ui: ui))
panel.isOpaque = false
panel.backgroundColor = .clear
panel.level = .floating                                    // 다른 창보다 위
panel.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenAuxiliary]
panel.orderFrontRegardless()
```

Dock에 아이콘이 안 뜨게 하려고 `Info.plist`에 `LSUIElement = true`를 넣었다.

## 구글 캘린더 일정 가져오기 (EventKit)

권한을 요청한 뒤, 오늘 0시부터 내일 0시까지의 일정을 가져온다. macOS 14부터는 권한 요청 함수가 `requestFullAccessToEvents`로 바뀌었다.

```swift
let start = Calendar.current.startOfDay(for: Date())
let end = Calendar.current.date(byAdding: .day, value: 1, to: start)!
let pred = store.predicateForEvents(withStart: start, end: end, calendars: nil)
let events = store.events(matching: pred)   // 구글 캘린더 일정도 여기 포함
```

- `Info.plist`에 `NSCalendarsFullAccessUsageDescription` 같은 권한 설명이 없으면 권한 창이 아예 안 뜬다.
- 일정 색은 `e.calendar.color`를 그대로 써서, 구글 캘린더에서 정한 색이 말풍선에도 나온다.
- 캘린더가 바뀌면 `.EKEventStoreChanged` 알림이 오고, 1분마다 타이머로도 새로고침한다.

## 할 일 체크리스트는 미리알림에 저장

일정은 보기만 하고, 할 일은 따로 체크리스트로 관리하고 싶었다. 저장 위치는 앱 내부, 맥 미리알림, 구글 Tasks 중에서 **맥 미리알림**으로 정했다. iCloud로 아이폰과 동기화되고, 구글 Tasks처럼 OAuth가 필요 없기 때문이다.

```swift
let r = EKReminder(eventStore: store)
r.title = "이력서 수정"
r.calendar = todoList()   // '몽글이 할 일' 목록 (없으면 새로 만듦)
r.dueDateComponents = Calendar.current.dateComponents([.year, .month, .day], from: targetDay)
try store.save(r, commit: true)
```

- **매일 새로 시작**: 마감일이 오늘인 할 일만 보여준다. 어제 못 끝낸 건 미리알림 앱에는 남지만 말풍선에서는 빠진다.
- **다른 날 할 일 추가**: 입력칸 옆 날짜 버튼으로 내일, 모레, 다음 주 월요일을 고르거나 달력에서 날짜를 고른다. 2주 안의 할 일은 "📌 다가오는 할 일"에서 미리 볼 수 있다.
- 체크하면 `isCompleted`를 바꿔 실제 미리알림에서도 완료 처리된다.

## 클릭하면 Claude 실행

드래그와 클릭을 하나의 `DragGesture`로 구분했다. 손을 뗄 때 마우스가 4pt 미만으로 움직였으면 클릭으로 본다.

```swift
if dist < 4 {
    Launcher.openClaude()   // NSWorkspace로 번들 ID를 찾아 실행, 실패하면 open -a Claude
} else {
    panel.saveAnchor()      // 드래그였다면 위치 저장
}
```

## 삽질 기록

| 증상 | 원인 | 해결 |
|---|---|---|
| `@State` 매크로 플러그인을 못 찾는다는 빌드 오류 | 최신 SDK에서 `@State`가 매크로로 바뀌었는데, 커맨드라인 도구(swiftc)만 있으면 매크로 플러그인이 없다 | `@State` 대신 `ObservableObject` + `@Published` 클래스로 상태를 옮김 |
| 빌드는 성공했는데 펫이 안 보임 | 처음 켤 때 SwiftUI 크기가 0으로 잡혀서, 오른쪽 아래 좌표를 계산하면 창이 화면 오른쪽 **바깥**에 생김 | `fittingSize`로 크기를 직접 정하고, 화면 밖으로 나가면 다시 안쪽으로 당김 |
| 말풍선을 접으면 펫이 위로 올라감 | 창 크기가 바뀔 때 기본으로 **왼쪽 위** 모서리가 고정됨 | `setFrame`을 오버라이드해서 **오른쪽 아래** 모서리를 고정 |

![창 크기 변경 시 고정점 비교]({{ "/assets/images/posts/macos-desktop-pet-swiftui/diagram-2.svg" | relative_url }})
*그림 2. 왼쪽 위가 고정되면 펫이 따라 올라가고, 오른쪽 아래를 고정하면 펫은 제자리에 있다*

```swift
final class PetPanel: NSPanel {
    var anchor: NSPoint?   // 오른쪽 아래 모서리

    override func setFrame(_ frameRect: NSRect, display flag: Bool) {
        var r = frameRect
        if let a = anchor, r.size != frame.size {
            r.origin = NSPoint(x: a.x - r.width, y: a.y)   // 크기가 바뀌면 오른쪽 아래 기준으로 다시 배치
        }
        super.setFrame(r, display: flag)
    }
}
```

> **한줄 정리**: AppKit 좌표계는 원점이 왼쪽 아래라서, "어느 모서리를 고정할지"는 직접 정해 줘야 한다.

## 빌드 방법

Xcode 프로젝트 없이 `swiftc` 한 줄로 빌드하고, `.app` 폴더 구조를 직접 만들었다.

```bash
swiftc -parse-as-library -O Sources/DeskPet.swift -o DeskPet.app/Contents/MacOS/DeskPet
cp Info.plist DeskPet.app/Contents/
cp -R Resources/. DeskPet.app/Contents/Resources/   # 캐릭터 그림 pet.png
codesign --force --deep --sign - DeskPet.app        # 임시(ad-hoc) 서명
```

임시 서명이라 다시 빌드할 때마다 캘린더·미리알림 권한을 다시 물어볼 수 있다.

## 정리

- 투명 `NSPanel` + SwiftUI로 늘 떠 있는 데스크톱 펫을 만들 수 있다.
- 구글 캘린더는 맥 **인터넷 계정**으로 동기화하고 EventKit으로 읽으면 OAuth 없이 연동된다.
- 할 일은 `EKReminder`로 미리알림에 저장해서 아이폰과도 동기화했다.
- 커맨드라인으로 빌드하면 `@State` 같은 SwiftUI 매크로가 안 될 수 있다.
- 창 크기가 바뀔 때는 고정할 모서리를 직접 정해야 위치가 안 튄다.
