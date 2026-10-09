# Terboo Benchmark (v4 §45)

- generated: 2026-10-08T09:50:52.705Z
- runs per scenario: 20
- simulated provider latency: 800 ms · simulated scraper latency: 1200 ms (external services are simulated; every other stage is the real kernel)
- values: p50 / p95 in ms · «bot overhead» = total − provider − scraper = time spent inside the bot itself

| scenario | TTFB | provider | context | memory | routing | scraper | total | bot overhead | calls |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| chat (model) | 805.2 / 845.1 | 801.2 / 801.9 | 0.5 / 21.9 | 0.2 / 5.4 | 0.4 / 7.8 | — / — | 805.3 / 845.2 | 4.1 / 43.7 | 1 |
| scraper fast path (no model) | 1202.4 / 1204.2 | — / — | 0.6 / 1.3 | 0.2 / 0.5 | 0.3 / 0.5 | 1201.2 / 1201.6 | 1202.4 / 1204.2 | 2.4 / 4.2 | 0 |
| follow-up: audio of last link (no model) | 1202.3 / 1202.9 | — / — | 0.8 / 1 | 0.1 / 0.1 | 0 / 0 | 1201.2 / 1201.9 | 1202.3 / 1202.9 | 2.3 / 2.9 | 0 |
| memory: what do you know (no model) | 0.6 / 1.6 | — / — | 0.2 / 0.4 | 0.1 / 0.1 | 0.2 / 0.8 | — / — | 0.6 / 1.6 | 0.6 / 1.6 | 0 |

## Where the time goes

- **chat (model)**: total 805.3 ms, dominated by provider (801.2 ms); pipeline: intent:open:chat → context:private → memory:0/0 → capability:commands:8 → strategy:chat → permission:chat → tool:provider → verify:text → response:answered
- **scraper fast path (no model)**: total 1202.4 ms, dominated by scraper (1201.2 ms); pipeline: intent:tool:tiktok → context:private → memory:0/0 → capability:scraper-registry → strategy:tool → permission:public → tool:scraper:tiktok → verify:delivered:1 → response:answered
- **follow-up: audio of last link (no model)**: total 1202.3 ms, dominated by scraper (1201.2 ms); pipeline: intent:tool:ytdl → context:private → memory:2/0 → capability:scraper-registry → strategy:followup-tool:variant:mp3 → permission:public → tool:scraper:tiktok → verify:delivered:1 → response:answered
- **memory: what do you know (no model)**: total 0.6 ms, dominated by bot overhead (0.6 ms); pipeline: intent:memory → context:private → memory:0/0 → capability:memory-engine → strategy:memory → permission:own-memory → tool:memory:show → response:answered
