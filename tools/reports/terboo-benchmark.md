# Terboo Benchmark (v4 §45)

- generated: 2026-10-04T03:30:05.115Z
- runs per scenario: 20
- simulated provider latency: 800 ms · simulated scraper latency: 1200 ms (external services are simulated; every other stage is the real kernel)
- values: p50 / p95 in ms · «bot overhead» = total − provider − scraper = time spent inside the bot itself

| scenario | TTFB | provider | context | memory | routing | scraper | total | bot overhead | calls |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| chat (model) | 804.5 / 881.3 | 801.1 / 801.5 | 0.5 / 43.9 | 0.1 / 7.4 | 0.2 / 6.9 | — / — | 804.6 / 881.4 | 3.5 / 69.5 | 1 |
| scraper fast path (no model) | 1202.3 / 1204.4 | — / — | 0.6 / 1 | 0.1 / 0.2 | 0.2 / 0.3 | 1201.1 / 1202.9 | 1202.3 / 1204.4 | 2.3 / 4.4 | 0 |
| follow-up: audio of last link (no model) | 1202 / 1203 | — / — | 0.7 / 0.9 | 0.1 / 1.1 | 0 / 0 | 1201.1 / 1201.5 | 1202 / 1203 | 2 / 3 | 0 |
| memory: what do you know (no model) | 0.4 / 1.4 | — / — | 0.2 / 0.5 | 0 / 0.2 | 0.1 / 0.3 | — / — | 0.4 / 1.4 | 0.4 / 1.4 | 0 |

## Where the time goes

- **chat (model)**: total 804.6 ms, dominated by provider (801.1 ms); pipeline: intent:open:chat → context:private → memory:0/0 → capability:commands:8 → strategy:chat → permission:chat → tool:provider → verify:text → response:answered
- **scraper fast path (no model)**: total 1202.3 ms, dominated by scraper (1201.1 ms); pipeline: intent:tool:tiktok → context:private → memory:0/0 → capability:scraper-registry → strategy:tool → permission:public → tool:scraper:tiktok → verify:delivered:1 → response:answered
- **follow-up: audio of last link (no model)**: total 1202 ms, dominated by scraper (1201.1 ms); pipeline: intent:tool:ytdl → context:private → memory:2/0 → capability:scraper-registry → strategy:followup-tool:variant:mp3 → permission:public → tool:scraper:tiktok → verify:delivered:1 → response:answered
- **memory: what do you know (no model)**: total 0.4 ms, dominated by bot overhead (0.4 ms); pipeline: intent:memory → context:private → memory:0/0 → capability:memory-engine → strategy:memory → permission:own-memory → tool:memory:show → response:answered
