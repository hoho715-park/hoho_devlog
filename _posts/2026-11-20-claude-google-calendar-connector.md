---
title: "Claude에 Google Calendar 커넥터 연결해서 일정 관리해 보기"
date: 2026-11-20 12:19:00 +0900
categories: [AI]
tags: [Claude, MCP, Google Calendar, 커넥터, 생산성]
description: "Claude에 Google Calendar 커넥터를 연결하고 일정 조회, 수정, 메모 추가, 알림 변경까지 직접 해 보면서 정리한 내용이다."
thumbnail: /assets/images/posts/claude-google-calendar-connector/thumbnail.svg
---

Claude에 Google Calendar 커넥터를 연결하면 채팅으로 내 캘린더를 읽고 고칠 수 있다.
직접 연결해서 조회부터 알림 변경까지 해 본 과정을 정리한다.

## 커넥터란?

커넥터는 Claude가 외부 앱을 도구(tool)로 쓸 수 있게 해 주는 연결이다. 내부적으로는 **MCP(Model Context Protocol)** 서버로 동작한다.
내가 자연어로 요청하면 Claude가 알맞은 도구를 골라 호출하고, 커넥터가 Google Calendar API로 실제 작업을 한다.

![Claude와 Google Calendar 커넥터의 동작 구조]({{ "/assets/images/posts/claude-google-calendar-connector/diagram-1.svg" | relative_url }})
*그림 1. 요청이 캘린더까지 전달되는 흐름*

> **한줄 정리**: 커넥터는 Claude가 내 앱을 직접 다룰 수 있게 해 주는 MCP 기반 도구 묶음이다.

## 연결 방법

1. Claude 채팅에서 Google Calendar 커넥터 카드의 **Connect**를 누른다.
2. Google 계정으로 로그인하고 캘린더 접근 권한을 허용한다.
3. 연결이 끝나면 채팅에서 바로 캘린더 도구를 쓸 수 있다.

로그인과 권한 허용은 사용자가 직접 해야 하고, Claude가 대신 해 주지 않는다.

## 커넥터가 제공하는 도구

도구는 크게 **읽기**와 **쓰기**로 나뉜다.

![읽기 도구와 쓰기 도구 비교]({{ "/assets/images/posts/claude-google-calendar-connector/diagram-2.svg" | relative_url }})
*그림 2. Google Calendar 커넥터의 도구 구성*

| 구분 | 도구 | 하는 일 |
|---|---|---|
| 읽기 | `list_calendars` | 내 캘린더 목록 확인 (개인, 공휴일 등) |
| 읽기 | `list_events` | 기간을 정해 일정 조회 |
| 읽기 | `search_events` | 키워드로 일정 검색 |
| 읽기 | `get_event` | 일정 하나의 상세 정보 |
| 읽기 | `suggest_time` | 참석자들의 빈 시간 추천 |
| 쓰기 | `create_event` | 일정 생성 |
| 쓰기 | `update_event` | 일정 수정 (날짜, 메모, 장소, 알림 등) |
| 쓰기 | `delete_event` | 일정 삭제 |
| 쓰기 | `respond_to_event` | 초대에 수락, 거절, 미정으로 응답 |

쓰기 도구는 실제 캘린더에 바로 반영되므로, 중요한 변경은 실행 전에 확인받는 식으로 쓰는 게 안전하다.

## 직접 해 본 것들

### 1. 일정 조회

"이번 주 일정 알려줘", "토요일 일정 확인해줘"처럼 말하면 `list_events`로 기간을 정해 조회한다.
결과를 표로 정리해 주고, **마감일이 출장 기간과 겹친다**처럼 일정끼리 충돌하는 부분도 짚어 준다.

### 2. 날짜 수정

이틀짜리로 잘못 등록된 학술대회 일정을 하루로 줄였다.
새로 만들지 않고 `update_event`로 원래 일정의 시작일과 종료일만 바꾼다.

종일 일정은 **종료일이 다음 날로 들어간다**는 점에 주의해야 한다.

```json
{
  "allDay": true,
  "startTime": "2026-11-20T00:00:00",
  "endTime": "2026-11-21T00:00:00"
}
```

### 3. 메모와 장소 추가

주최 측 안내문을 그대로 붙여넣고 "핵심만 정리해서 추가해줘"라고 하면 시간, 장소, 제공 사항, 오후 세션 진행 방식을 요약해서 메모(`description`)에 넣는다.
메모는 HTML을 지원해서 `<ul>`, `<b>`로 목록과 강조를 넣을 수 있다. 장소(`location`)를 따로 넣으면 지도와 연결된다.

> **한줄 정리**: 안내문, 공지, 메일을 붙여넣으면 핵심만 뽑아서 일정에 정리해 넣을 수 있다.

### 4. 알림을 당일 아침 8시로 바꾸기

종일 일정의 기본 알림(30분 전)은 **일정 시작 시각인 당일 00:00을 기준**으로 계산된다. 그래서 실제로는 전날 밤 23:30에 울린다.
당일 아침 8시에 알림을 받으려면 시작 시각보다 **480분 뒤**여야 하므로, 알림 값으로 `-480`을 넣었다.

![종일 일정 알림 시점 타임라인]({{ "/assets/images/posts/claude-google-calendar-connector/diagram-3.svg" | relative_url }})
*그림 3. 종일 일정은 당일 00:00이 기준이다*

```json
{
  "overrideReminders": [
    { "method": "popup", "minutes": -480 }
  ]
}
```

API가 이 값을 저장해 줬지만, 공식 문서에 나오는 방식은 아니다. 그래서 실제로 알림이 오는지 앱에서 확인해야 한다.

## 알게 된 점

- 종일 일정이 '한가함(transparent)'으로 등록돼 있으면 빈 시간을 찾을 때 그 시간을 막지 않는다.
- 일정 하나하나의 알림은 커넥터로 바꿀 수 있지만, **앞으로 만들 일정의 기본 알림**은 Google 캘린더 설정에서 직접 바꿔야 한다.
- 이미 지난 시각의 알림은 바꿔도 의미가 없으니, 오늘 일정처럼 시간이 지난 건 빼고 적용했다.

## 정리

- Google Calendar 커넥터는 MCP 기반이고, Claude가 읽기와 쓰기 도구로 캘린더를 다룬다.
- 조회, 날짜 수정, 메모와 장소 추가, 알림 변경을 모두 채팅으로 할 수 있다.
- 종일 일정의 알림은 당일 00:00 기준이라서 당일 아침 알림은 음수 분(`-480`)으로 설정했다.
- 쓰기 작업은 캘린더에 바로 반영되니, 실행 전에 확인하고 실행 후에는 앱에서 결과를 확인한다.
