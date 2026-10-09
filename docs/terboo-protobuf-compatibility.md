# Terboo — Protobuf Compatibility (Baileys 7.0.0-rc14)

> Generated from the installed runtime, not from documentation or snippets.
> Evidence: `tests/terboo-protobuf.test.mjs`, `tools/terboo-dependency-truth.mjs`,
> `docs/terboo-runtime-dependency-truth.json`.

## 1. What the runtime actually ships

| Item | Value (verified) |
|---|---|
| Package | `@whiskeysockets/baileys` `7.0.0-rc14` (requested = locked = installed, no alias, no fork) |
| WAProto | `node_modules/@whiskeysockets/baileys/WAProto/index.js` — static code generated for `protobufjs/minimal.js` |
| protobufjs | `7.6.6` |
| `Type.fromObject()` | **present** (498 generated converters). Converts nested plain objects, enum *names* → numbers, base64 → bytes; throws `"… object expected"` on type errors. |
| `Type.create()` | present (498). Assigns properties only — **no conversion**. |
| `Type.verify()` | **absent** (minimal build). |
| `decodeAndHydrate` | **absent** in rc14 — not used by Terboo. |

Inside rc14 itself:

- `generateWAMessageFromContent()` ends with `WAProto.Message.create(message)` and quotes with
  `proto.Message.create(...)`. **The message send path is `create` + `encode`**, not `fromObject`.
- `fromObject` is still used by Baileys for auth/handshake (`ClientPayload`, `AppStateSyncKeyData`).

Consequence: `.fromObject()` is *not forbidden* by rc14, so a blind `fromObject → create`
replacement was **not** performed. But since the real transport encodes plain objects through
`create`, any payload must already have the wire types (numeric enums, `Buffer`/`Uint8Array`
bytes). The test proves the hazard on this runtime:

```
create({ buttonsMessage: { headerType: "IMAGE" } })  →  headerType encoded as 0 (silently)
fromObject(  … same …  )                             →  headerType encoded as 4
```

## 2. Migration performed

| Before (v4.0) | After (v5.0) |
|---|---|
| 24 direct `proto.Message.InteractiveMessage.*.fromObject(...)` calls + 8 `.create(...)` in 5 plugins (`search/اطار`, `search/بنتر_فيد`, `owner/نشر`, `tools/صرف_العملات`, `panel/انشاء_خادم`) | **0** in production. The wrappers only boxed plain strings/booleans/uploaded media, so they were unwrapped to plain objects — byte-identical on the rc14 `create` path. |
| Each plugin decided payload shapes itself | Central builder `src/lib/terboo-interactive-builder.js` (numeric enums only; asserted by test) |
| No validation before relay | `validateMessage()` in `src/lib/terboo-wa-capabilities.js`: ① `fromObject` strict type check (throws on wrong shapes) ② `create → encode → decode` (the rc14 transport path) ③ critical fields survive (body, button count, valid `buttonParamsJson`, cards). |

The only two modules allowed to touch converters are the documented adapters:
`terboo-interactive-builder.js#protoMessage` (fromObject when present, else create) and
`terboo-wa-capabilities.js#validateMessage`. `tests/terboo-protobuf.test.mjs` fails on any
other `.fromObject(` in production code and on any plugin building proto types by hand.

`src/lib/terboo-socket.js` keeps `proto.WebMessageInfo.create(copy)` for message copy/forward —
that *is* the rc14 path and it round-trips in the test.

## 3. Round-trip matrix (create → encode → decode)

| Message | Checked fields |
|---|---|
| `InteractiveMessage.Body` / `Footer` | text (incl. Arabic + symbols) |
| `InteractiveMessage.Header` | title, subtitle, hasMediaAttachment |
| `InteractiveMessage.NativeFlowMessage` | buttons, `single_select` sections → row id |
| `InteractiveMessage.CarouselMessage` | cards count |
| `InteractiveMessage` | `cta_copy` params |
| `ButtonsMessage` / `ListMessage` | buttonId / rowId |
| `ExtendedTextMessage` | code text byte-exact, `@lid` mentions |
| `InteractiveResponseMessage.NativeFlowResponseMessage` | `paramsJson.id` |
| `WebMessageInfo` (from `generateWAMessageFromContent` with quote) | key.remoteJid, body, `contextInfo.stanzaId` |
| relay through `installWhatsAppCompat` | `biz › interactive[type=native_flow]` node attached |

## 4. Rules for new code

1. Build interactive payloads with `terboo-interactive-builder.js` (`button.*`, `nativeFlow`, `carousel`, `header.*`).
2. Never pass enum names as strings; never pass base64 where bytes are expected.
3. Do not call `.fromObject()` / `.create()` in plugins. If a raw proto object is genuinely needed, use `protoMessage("Message.X", value)`.
4. Send through `sock.sendMessage`/`sock.relayMessage` — the socket boundary validates, resolves LID targets, attaches `biz` nodes and converts legacy buttons.
