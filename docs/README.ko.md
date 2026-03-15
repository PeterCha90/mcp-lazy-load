<pre>
███╗   ███╗ ██████╗██████╗       ██╗      █████╗ ███████╗██╗   ██╗
████╗ ████║██╔════╝██╔══██╗      ██║     ██╔══██╗╚══███╔╝╚██╗ ██╔╝
██╔████╔██║██║     ██████╔╝█████╗██║     ███████║  ███╔╝  ╚████╔╝
██║╚██╔╝██║██║     ██╔═══╝ ╚════╝██║     ██╔══██║ ███╔╝    ╚██╔╝
██║ ╚═╝ ██║╚██████╗██║           ███████╗██║  ██║███████╗   ██║
╚═╝     ╚═╝ ╚═════╝╚═╝           ╚══════╝╚═╝  ╚═╝╚══════╝   ╚═╝
</pre>

# mcp-lazy 🫠

[English](../README.md)

> MCP 컨텍스트 윈도우 토큰 사용량을 90% 이상 절감합니다. 명령어 한 줄이면 끝.

- MCP 서버들은 시작할 때 모든 툴 정의를 컨텍스트 윈도우에 로딩합니다 — 사용하기도 전에요. 서버가 5~10개면 컨텍스트 윈도우의 30~50%를 차지할 수 있습니다. **mcp-lazy**는 모든 MCP 서버를 하나의 경량 프록시로 묶어서, 필요할 때만 툴을 로딩합니다.

<center>

`시작 시 82개 툴이 로딩됨`
![Before mcp-lazy](../public/before.png)

👇 `mcp-lazy 적용 후 단 2개`

![After mcp-lazy](../public/after.png)

</center>

## 빠른 시작

사용하는 에이전트에 맞게 하나를 선택하세요:

```bash
npx mcp-lazy add --cursor        # Cursor
npx mcp-lazy add --codex         # Codex
npx mcp-lazy add --antigravity   # Antigravity
npx mcp-lazy add --opencode      # Opencode
npx mcp-lazy add --all           # 또는 한번에 전부 등록
```

그 다음 툴 캐시를 사전 구축합니다 (권장):

```bash
npx mcp-lazy init
```

- `add` 명령어가 에이전트의 기존 MCP 설정을 읽어서 모든 서버 정의를 `~/.mcp-lazy/servers.json`에 저장하고, 에이전트 설정을 mcp-lazy 프록시 항목 하나로 교체합니다.
- `init`은 툴 캐시를 사전 구축하여 첫 에이전트 세션이 즉시 시작되도록 합니다. 실행하지 않으면 첫 세션에서 서버 접속에 시간이 소요됩니다.

  > **Tip:** 새로운 MCP 서버를 설치했다면 `npx mcp-lazy add --<agent>`를 다시 실행하세요 — 추가 작업 없이 반영됩니다.

<br>

## 작동 원리

```
mcp-lazy 적용 전:
  에이전트 → MCP서버A (50툴) + 서버B (30툴) + 서버C (20툴)
           = 시작 시 100개 툴 전부 로딩 (~67,000 토큰)

mcp-lazy 적용 후:
  에이전트 → mcp-lazy 프록시 (2개 툴만, ~350 토큰)
                  ↓ 필요할 때만
             서버A / B / C (on-demand 로딩)
             URL 서버 (Notion, Slack 등) — mcp-remote 브릿지 경유
```

프록시는 단 2개의 툴만 노출합니다:

- **mcp_search_tools** — 키워드로 사용 가능한 툴 검색
- **mcp_execute_tool** — 툴 실행 (최초 호출 시 서버 자동 시작)

![mcp-lazy Architecture](../architecture.png)

<br>

## `add` 명령어가 하는 일

`npx mcp-lazy add --<agent>`를 실행하면:

1. 에이전트의 기존 MCP 서버 설정을 읽습니다
2. 모든 서버 정의를 추출합니다 (stdio 및 URL 기반 모두)
3. URL 서버(Notion, Slack 등 OAuth 인증이 필요한 서비스)를 `npx mcp-remote <url>` stdio 명령어로 자동 변환합니다
4. 모든 내용을 `~/.mcp-lazy/servers.json`에 저장합니다
5. 에이전트 설정을 mcp-lazy 프록시 항목 하나로 교체합니다

프록시는 실행 시 `~/.mcp-lazy/servers.json`을 읽습니다 — 설정 완료 후 모든 서버 정의는 이 파일에 저장됩니다.

<br>

## 지원 에이전트

| 에이전트    | 상태                   |
| ----------- | ---------------------- |
| Cursor      | ✓ 지원                 |
| Opencode    | ✓ 지원                 |
| Antigravity | ✓ 지원                 |
| Codex       | ✓ 지원                 |
| Claude Code | 네이티브 지원 (불필요) |

<br>

## 명령어

### `npx mcp-lazy add`

- 에이전트에 프록시를 등록합니다:

  ```bash
  npx mcp-lazy add --cursor        # Cursor에 등록
  npx mcp-lazy add --antigravity   # Antigravity에 등록
  npx mcp-lazy add --all           # 모든 에이전트에 등록
  ```

- 옵션:
  - `--cursor`, `--opencode`, `--antigravity`, `--codex` — 대상 에이전트
  - `--all` — 모든 에이전트에 등록

### `npx mcp-lazy init`

등록된 모든 서버에 접속하여 툴 캐시를 사전 구축합니다:

```bash
$ npx mcp-lazy init

mcp-lazy init — building tool cache...

  ✓ github-mcp         15 tools   342ms
  ✓ postgres-mcp       12 tools   518ms
  ✗ slack-mcp          connection timeout
  ✓ filesystem          8 tools   120ms

Cache saved: 35 tools from 3/4 servers in 1.2s
Ready! mcp-lazy serve will start instantly.
```

- 모든 서버에 병렬로 접속하여 툴 인덱스를 `~/.mcp-lazy/tool-cache.json`에 저장합니다
- `add` 실행 후 이 명령어를 실행하면 첫 에이전트 세션이 즉시 시작됩니다

### `npx mcp-lazy doctor`

- 설치 상태를 진단합니다:

  ```bash
  $ npx mcp-lazy doctor

  ✓ Node.js 18+ 설치됨
  ✓ 7개 MCP 서버 등록됨
    - github, notion, slack, postgres, filesystem, memory, puppeteer
  ✓ Cursor: 등록됨

  토큰 절감: 67,300 → 350 (99.5% 절감)
  ```

<br>

## URL 및 OAuth 지원

일부 MCP 서버는 URL로 호스팅되며 OAuth 인증이 필요합니다 (Notion, Slack, Linear 등). `add` 명령어는 이런 서버들을 `npx mcp-remote`를 사용하는 stdio 명령어로 자동 변환합니다:

```
URL 서버: https://mcp.notion.com/sse
         ↓ 자동 변환
stdio:   npx mcp-remote https://mcp.notion.com/sse
```

즉, 로컬 stdio 서버와 OAuth 인증이 필요한 원격 URL 서버 모두 수동 변환 없이 mcp-lazy를 통해 프록시됩니다.

<br>

## 검색 알고리즘

에이전트가 `mcp_search_tools("DB 쿼리 실행")`을 호출하면, 프록시가 등록된 모든 툴에서 가중치 기반 검색을 수행합니다:

| 매칭 유형         | 점수 |
| ----------------- | ---- |
| 툴 이름 정확 일치 | +1.0 |
| 툴 이름 부분 일치 | +0.8 |
| 설명 키워드 일치  | +0.6 |
| 서버 설명 일치    | +0.4 |

결과는 관련도 순으로 정렬되어 에이전트에 반환됩니다.

<br>

## FAQ

### Q: 최초 실행이 느립니다

- 첫 실행 시 mcp-lazy가 등록된 모든 MCP 서버에 접속하여 사용 가능한 툴을 수집하고 검색 인덱스를 구축합니다. 서버 수에 따라 10~30초 정도 소요될 수 있습니다.
- 이후에는 툴 인덱스가 `~/.mcp-lazy/tool-cache.json`에 캐시되어, 1초 이내로 시작됩니다.
- 서버 설정이 변경되면 캐시가 자동으로 갱신됩니다.
- `npx mcp-lazy init`을 설정 후 실행하면 캐시를 사전 구축하여 느린 첫 시작을 방지할 수 있습니다.

### Q: 설치 중 "Error: Unexpected error"가 발생합니다

- 설정 파일 디렉토리에 대한 읽기/쓰기 권한이 있는지 확인하세요. 예시:

  > Cursor: `~/.cursor/mcp.json` <br>
  > Codex: `~/.codex/config.toml` <br>
  > Opencode: `~/.config/opencode/config.json`<br>
  > Antigravity: `~/.gemini/antigravity/mcp_config.json`

- `ls -la` 명령어로 해당 경로의 권한을 확인하세요. 필요 시 `chmod 644 <경로>`로 수정할 수 있습니다.

### Q: mcp-lazy 설정 이후 새로운 MCP 서버를 추가했습니다. 어떻게 반영하나요?

- 새 서버를 에이전트의 MCP 설정에 평소처럼 추가한 뒤, add 명령어를 다시 실행하면 됩니다:

  ```bash
  npx mcp-lazy add --cursor    # 새 서버를 자동으로 감지하여 반영
  ```

- mcp-lazy가 새 서버를 감지하여 `~/.mcp-lazy/servers.json`에 추가하고, 프록시 설정은 그대로 유지합니다.

<br>

## 지원 범위

- mcp-lazy는 현재 **글로벌 MCP 설정만 지원**합니다 (예: `~/.cursor/mcp.json`). 프로젝트 레벨 MCP 설정 (예: 프로젝트 루트의 `.cursor/mcp.json`)은 아직 지원하지 않습니다.

<br>

## 요구사항

- Node.js 18+
- 기존 MCP 서버 설정 (글로벌 스코프)

## 라이선스

MIT
