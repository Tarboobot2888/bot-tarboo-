# Terboo Benchmark — BEFORE (v4.0) vs AFTER (v5.0)

- generated: 2026-10-02T22:36:16.206Z
- runs per scenario: 5 (median shown) · simulated provider latency: 800 ms · simulated scraper: 1200 ms
- production defaults in both versions (the per-user rate limiter / concurrency controller is ON, as in the real bot)
- TTFR = time from the message arriving to the first visible output (reply or reaction) for the measured message

| scenario | TTFR before | TTFR after | model calls before → after | replies before → after | wasted replies before → after |
| --- | --- | --- | --- | --- | --- |
| single chat message | 803 ms | 804 ms | 1 → 1 | 1 → 1 | 0 → 0 |
| two quick messages (300 ms apart) | 4505 ms | 1310 ms | 2 → 2 | 2 → 1 | 5 → 0 |
| cancel while thinking | 4503 ms | 1 ms | 2 → 1 | 2 → 1 | 5 → 0 |
| TikTok link (deterministic tool) | 1 ms | 1 ms | 0 → 0 | 2 → 2 | 0 → 0 |
