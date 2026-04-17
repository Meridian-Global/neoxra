# CORE API

## Overview
Neoxra exposes a single streaming endpoint: apps POST an idea and receive agent outputs as Server-Sent Events (SSE).

## POST /api/run

### Request
JSON body:

- `idea`: `string`, required
- `voice_profile`: `string`, optional, defaults to `"default"`

Example:

```json
{
  "idea": "A post about why small teams should document decisions",
  "voice_profile": "default"
}
```

### Response
`Content-Type: text/event-stream`

Each SSE message is formatted as:

```text
event: <event_name>
data: <json_payload>
```

### Event Sequence
Events are emitted in this order:

1. `planner_started`
2. `planner_completed`
3. `instagram_pass1_started`
4. `instagram_pass1_completed`
5. `threads_pass1_started`
6. `threads_pass1_completed`
7. `linkedin_pass1_started`
8. `linkedin_pass1_completed`
9. `instagram_pass2_started`
10. `instagram_pass2_completed`
11. `threads_pass2_started`
12. `threads_pass2_completed`
13. `linkedin_pass2_started`
14. `linkedin_pass2_completed`
15. `critic_started`
16. `critic_completed`
17. `pipeline_completed`

### Event Payload Shapes
- `planner_started`, `instagram_pass1_started`, `threads_pass1_started`, `linkedin_pass1_started`, `instagram_pass2_started`, `threads_pass2_started`, `linkedin_pass2_started`, `critic_started`
  `{}` 
- `planner_completed`
  `{ "brief": Brief }`
- `instagram_pass1_completed`, `threads_pass1_completed`, `linkedin_pass1_completed`, `instagram_pass2_completed`, `threads_pass2_completed`, `linkedin_pass2_completed`
  `{ "thinking": string, "output": string }`
- `critic_completed`
  `{ "notes": string, "instagram_improved": string, "threads_improved": string, "linkedin_improved": string }`
- `pipeline_completed`
  `{ "brief": Brief, "instagram": string, "threads": string, "linkedin": string, "instagram_final": string, "threads_final": string, "linkedin_final": string, "critic_notes": string }`

## Data Models

### Brief
`Brief` has 7 string fields:

- `original_idea: str`
- `core_angle: str`
- `target_audience: str`
- `tone: str`
- `instagram_notes: str`
- `threads_notes: str`
- `linkedin_notes: str`

### AgentContext
`AgentContext` has 4 fields:

- `brief: Optional[Brief]`
- `instagram_output: Optional[str]`
- `threads_output: Optional[str]`
- `linkedin_output: Optional[str]`

## What Is NOT in Core
The core engine documented here is only the streaming run contract for `POST /api/run`.

- LinkedIn publishing is not part of core; it lives in app-layer code.
- Gmail idea scanning is not part of core; it lives in app-layer code.
- The Next.js frontend is not part of core; it lives in app-layer code.
