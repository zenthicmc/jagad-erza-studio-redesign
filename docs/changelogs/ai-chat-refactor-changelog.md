# AI Chat - Major Refactor Changelog

**Date:** March 12, 2026
**Commit:** `c42b216` fix(ai-chat): Major Changes

---

## Summary

Complete architectural refactor of the AI Chat feature. All WebSocket event handling
has been moved out of React component lifecycle into a standalone `ChatService`
singleton. This resolves ~20 bugs related to streaming state loss on navigation,
refresh, and reconnection.

---

## Architecture Changes

### New: `ChatService` Singleton (`src/lib/chat-service.ts`)

A service layer that owns all WebSocket event handling outside of React. This is
the core of the refactor -- callbacks now survive component unmount, navigation,
and reconnection.

**Responsibilities:**
- WebSocket lifecycle management (`init`, `shutdown`)
- Sending messages (`sendMessage`)
- Handling all WS events (`handleWsProgress`, `handleWsCompleted`, `handleWsError`)
- Temp-to-real chat ID migration when server assigns a real ID to a new chat
- Orphaned state cleanup on app init (stale streaming state from prior sessions)
- Reconnection recovery (re-registers callbacks for in-flight chats)
- Router injection (`setRouter`) so the service can update the URL without React

### Refactored: `ChatSocket` (`src/lib/chat-socket.ts`)

The WebSocket singleton was rewritten with the following improvements:

- **Dynamic WS URL:** Uses `NEXT_PUBLIC_API_URL` environment variable instead of hardcoded URL
- **Promise-based connection:** `waitForConnection(timeout)` replaces arbitrary 1-second delays
- **Per-chat callback routing:** `registerChat(chatId, callbacks)` / `unregisterChat(chatId)` with a `senderChatId` parameter on `send()` to route errors to the correct chat
- **Chat migration:** `migrateChat(oldId, newId)` moves callbacks when temp ID resolves to real ID
- **Callback cleanup:** `disconnect()` now clears all callbacks to prevent stale closures
- **Reconnection hook:** `onReconnect` callback notifies `ChatService` to re-register
- **Greedy match fix:** `findCallbacks()` only falls back to temp-ID matching when exactly one temp callback exists

### Refactored: `ChatStore` (`src/stores/chat-store.ts`)

Zustand store changes to support per-chat state:

- **Per-chat typing state:** `typingChats: Record<string, boolean>` replaces global `isTyping`
- **Per-chat response text:** `responseTexts: Record<string, string>` replaces global `responseText`
- **Streaming tracking:** `streamingChatIds: Set<string>` tracks which chats are actively streaming
- **Pending messages:** `pendingMessages: Map<string, PendingMessageData>` tracks in-flight sends
- **Pending migration:** `migratePendingMessage(oldId, newId, patch)` for temp-to-real migration
- **LocalStorage persistence:** `pendingMessages` and `streamingChatIds` are persisted and rehydrated via custom `merge` function so orphan cleanup works after refresh
- **Legacy compatibility:** Global `isTyping` / `responseText` getters remain as computed values from `activeChatId` for consumers not yet migrated

### New: Navigation Guard (`src/lib/navigation-guard.ts`)

A lightweight global guard pattern that any page can register to block navigation.
Used by the AI chat layout to prevent language switching (which triggers a refresh)
while streaming.

- `setNavigationGuard(fn)` -- register a guard, returns unregister function
- `checkNavigationGuard()` -- returns `true` if navigation is allowed

---

## Bug Fixes

| #  | Bug | Root Cause | Fix |
|----|-----|------------|-----|
| 1  | Streaming state lost on page refresh | `pendingMessages` / `streamingChatIds` were in-memory only | Persisted to localStorage with custom rehydration; orphan cleanup on init |
| 2  | `disconnect()` on layout unmount kills active stream | Layout called `chatSocket.disconnect()` on unmount | Removed disconnect on unmount; `ChatService.shutdown()` checks streaming state |
| 3  | `disconnect()` doesn't clear callbacks | Stale closures could fire after disconnect | `chatCallbacks.clear()` in `disconnect()` |
| 4  | Callbacks tied to React component lifecycle | All WS handlers were `useCallback` hooks in `ChatInput` | Moved to `ChatService` singleton outside React |
| 5  | `isSending` was global, not per-chat | Single boolean blocked all chats | Uses `streamingChatIds` set for per-chat streaming state |
| 6  | Error dispatched to wrong chat | First callback in map received all errors | `senderChatId` parameter routes errors to correct chat |
| 7  | Error from server `chat_id` field ignored | Error handler didn't check `data.result.chat_id` | `handleEvent` uses `chat_id` from server event |
| 8  | Greedy temp-ID matching | Any incoming event matched any temp callback | `findCallbacks` only matches temp-ID when exactly 1 temp entry exists |
| 9  | Reconnect doesn't re-register callbacks | After WS reconnect, no callbacks existed | `onReconnect` hook triggers `ChatService.handleReconnect()` |
| 10 | Temp-to-real ID migration loses streaming content | Migration didn't preserve streaming/typing state | Proper migration sequence in `handleWsProgress` |
| 12 | `beforeunload` gap | Only checked `streamingChatIds`, not `pendingMessages` | `isProcessing` checks both `streamingChatIds.size > 0` and `pendingMessages.size > 0` |
| 14 | Hardcoded WebSocket URL | WS URL was hardcoded to production | Uses `NEXT_PUBLIC_API_URL` env var |
| 15 | Arbitrary 1-second wait before sending | `setTimeout(1000)` hoped connection was ready | `waitForConnection()` promise with configurable timeout |
| 16 | Global `isTyping` state | Single boolean for all chats | Per-chat `typingChats: Record<string, boolean>` |
| 17 | Global `responseText` state | Single string for all chats | Per-chat `responseTexts: Record<string, string>` |
| 19 | Orphaned streaming state on unmount | No cleanup for interrupted streams | `cleanupOrphanedState()` runs on `ChatService.init()` |
| -- | Stuck "Thinking..." bubble after navigation | `isLoading` placeholder message never removed from `chatHistory` | `cleanupOrphanedState()` also scrubs `isLoading: true` messages from history |
| -- | Duplicate React key warning | `handleWsCompleted` could insert a message ID already present from sidebar fetch | Deduplication by `id` using a `Set` after replacing the loading placeholder |
| -- | Language switch during streaming causes data loss | `intlRouter.replace()` triggers refresh, bypassing link click interception | Navigation guard blocks language switch; shows leave warning modal |

---

## UI Changes

### Chat Input (`src/components/chat/chat-input.tsx`)

**Before:** ~762 lines with all WebSocket handlers, state management, and UI in one component.
**After:** ~440 lines. Thin UI layer only.

- All WebSocket event handlers removed (moved to `ChatService`)
- `handleSubmit` calls `chatService.sendMessage()` instead of managing WS directly
- Send button is disabled while the current chat is streaming (`!isCurrentChatStreaming`)
- Stop button removed (backend does not support stream cancellation)
- Input stays locked until AI response completes

### Chat Messages (`src/components/chat/chat-messages.tsx`)

- Uses per-chat `responseTexts[chatId]` and `typingChats[chatId]` instead of global `isTyping` / `responseText`

### Chat History Sidebar (`src/components/chat/chat-history-sidebar.tsx`)

- Removed unused `setResponseText` calls

### AI Chat Layout (`src/app/[locale]/(app)/ai-chat/layout.tsx`)

- Uses `chatService.init(locale)` instead of `chatSocket.connect/disconnect`
- Wires Next.js router to `ChatService` via `setRouter()`
- `isProcessing` derived from both `streamingChatIds` and `pendingMessages`
- Leave warning modal blocks in-app navigation and language switching while streaming
- `beforeunload` handler prevents browser refresh/close while streaming
- Registers global navigation guard for programmatic navigation (e.g. language switcher)

### Language Switcher (`src/components/ui/language-switcher.tsx`)

- Calls `checkNavigationGuard()` before switching locale
- If guard returns `false` (e.g. AI is streaming), the switch is silently blocked and the leave warning modal is shown by the guard

### AI Chat Page (`src/app/[locale]/(app)/ai-chat/[[...id]]/page.tsx`)

- Removed `lastVisitedChatId` redirect: navigating to `/ai-chat` always shows a fresh new chat

---

## Translation Changes

Added keys in both `src/messages/en.json` and `src/messages/id.json`:

| Key | EN | ID |
|-----|----|----|
| `chat.stopGenerating` | Stop generating | Hentikan pembuatan |
| `chat.leaveWarningTitle` | Leave chat? | Tinggalkan chat? |
| `chat.leaveWarningDescription` | AI is still processing... | AI masih memproses... |
| `chat.leaveWarningConfirm` | Leave | Tinggalkan |
| `chat.leaveWarningCancel` | Stay | Tetap di sini |

---

## Files Changed

| File | Status | Lines |
|------|--------|-------|
| `src/lib/chat-service.ts` | **New** | 435 |
| `src/lib/navigation-guard.ts` | **New** | 34 |
| `src/lib/chat-socket.ts` | Refactored | 322 |
| `src/stores/chat-store.ts` | Refactored | 408 |
| `src/components/chat/chat-input.tsx` | Refactored | 440 |
| `src/components/chat/chat-messages.tsx` | Modified | minor |
| `src/components/chat/chat-history-sidebar.tsx` | Modified | minor |
| `src/app/[locale]/(app)/ai-chat/layout.tsx` | Refactored | 149 |
| `src/app/[locale]/(app)/ai-chat/[[...id]]/page.tsx` | Modified | minor |
| `src/components/ui/language-switcher.tsx` | Modified | minor |
| `src/messages/en.json` | Modified | +5 keys |
| `src/messages/id.json` | Modified | +5 keys |

---

## Design Decisions

### Why a singleton service instead of React context?

WebSocket callbacks must survive component unmount. React context providers are
tied to the component tree -- when the layout unmounts (e.g. navigating away from
`/ai-chat`), all context is destroyed. A plain singleton lives in module scope
and persists for the entire page lifetime.

### Why no stop button?

The backend does not support cancelling an in-progress stream. A client-side stop
button would only hide the UI feedback while the server continues generating. This
creates a state mismatch where stale server events arrive and corrupt the next
conversation. Instead, the send button is disabled while streaming, preventing the
user from sending a new message until the current response completes.

### Why persist `pendingMessages` and `streamingChatIds` to localStorage?

These are normally in-memory only. But if the user refreshes mid-stream, the WS
connection dies and the streaming state becomes orphaned. By persisting these
values, `cleanupOrphanedState()` can detect and clean them up on the next app init,
removing stuck "Thinking..." bubbles and resetting the UI to a clean state.

### Why a global navigation guard instead of prop drilling?

The `LanguageSwitcher` component is rendered in the app header, landing header, and
auth pages. Passing a callback prop from the AI chat layout through the header to
the switcher would require threading props through multiple unrelated components.
A global guard (simple function registration) keeps the components decoupled while
allowing any page to opt in to navigation blocking.
