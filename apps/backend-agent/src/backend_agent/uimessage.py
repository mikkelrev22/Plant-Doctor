"""Encode a LangGraph run into the AI SDK UI Message Stream wire format.

This is the contract the mobile app's ``useChat`` consumes. The format is SSE:
each event is a ``data: <json>\\n\\n`` line, terminated by the literal
``data: [DONE]\\n\\n``. The response must carry the
``x-vercel-ai-ui-message-stream: v1`` header.

Part shapes (per https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol):

* start            -> {"type":"start","messageId":"..."}
* start-step       -> {"type":"start-step"}
* text-start       -> {"type":"text-start","id":"<text-block-id>"}
* text-delta       -> {"type":"text-delta","id":"<text-block-id>","delta":"..."}
* text-end         -> {"type":"text-end","id":"<text-block-id>"}
* tool-input-start -> {"type":"tool-input-start","toolCallId":"...",
                      "toolName":"..."}
* tool-input-available -> {"type":"tool-input-available","toolCallId":"...",
                          "toolName":"...","input":{...}}
* tool-output-available -> {"type":"tool-output-available","toolCallId":"...",
                           "output":<any>}
* data-<type>      -> {"type":"data-yesno","data":{...}}   (custom interactive parts)
* finish-step      -> {"type":"finish-step"}
* finish           -> {"type":"finish","finishReason":"stop","usage":{...}}
* error            -> {"type":"error","errorText":"..."}
* [DONE]           -> literal "data: [DONE]\\n\\n"

NOTE: the ``finish`` / ``usage`` field shape is the one most likely to need a
tweak — confirm it against a JS ``createUIMessageStreamResponse`` capture during
the verification spike if ``useChat`` rejects the stream.
"""

import json
from collections.abc import Iterator
from uuid import uuid4


def _sse(payload: str) -> str:
    return f"data: {payload}\n\n"


class UIStream:
    """Stateful encoder that opens/closes text blocks and tool calls correctly."""

    def __init__(self) -> None:
        self._text_id: str | None = None
        self.emitted_text: bool = False

    # --- low level ---------------------------------------------------------
    def emit(self, obj: dict) -> str:
        return _sse(json.dumps(obj, ensure_ascii=False, default=str))

    # --- message / step lifecycle -----------------------------------------
    def start(self, message_id: str) -> str:
        return self.emit({"type": "start", "messageId": message_id})

    def start_step(self) -> str:
        return self.emit({"type": "start-step"})

    def finish_step(self) -> str:
        return self._close_text() + self.emit({"type": "finish-step"})

    # --- text --------------------------------------------------------------
    def text_delta(self, delta: str) -> str:
        out: list[str] = []
        if self._text_id is None:
            self._text_id = f"txt_{uuid4().hex}"
            out.append(self.emit({"type": "text-start", "id": self._text_id}))
        out.append(
            self.emit({"type": "text-delta", "id": self._text_id, "delta": delta})
        )
        self.emitted_text = True
        return "".join(out)

    def _close_text(self) -> str:
        if self._text_id is None:
            return ""
        out = self.emit({"type": "text-end", "id": self._text_id})
        self._text_id = None
        return out

    # --- tools -------------------------------------------------------------
    def tool_start(self, tool_call_id: str, tool_name: str, tool_input: object) -> str:
        # ``dynamic: True`` is required: the AI SDK stream parser keys off it
        # (process-ui-message-stream.ts `tool-input-start` / `tool-input-available`)
        # to create a ``dynamic-tool`` UI part. Without it the SDK makes a static
        # ``tool-<name>`` part, which the mobile chat doesn't render — so the
        # tool call is silently invisible. The agent runs its tools server-side
        # (no `tools` option on `useChat`), so every tool call is dynamic.
        out = self._close_text()
        out += self.emit(
            {
                "type": "tool-input-start",
                "toolCallId": tool_call_id,
                "toolName": tool_name,
                "dynamic": True,
            }
        )
        out += self.emit(
            {
                "type": "tool-input-available",
                "toolCallId": tool_call_id,
                "toolName": tool_name,
                "input": tool_input,
                "dynamic": True,
            }
        )
        return out

    def tool_end(self, tool_call_id: str, output: object) -> str:
        return self.emit(
            {
                "type": "tool-output-available",
                "toolCallId": tool_call_id,
                "output": output,
            }
        )

    # --- custom interactive parts (data-*) ---------------------------------
    def custom(self, part_type: str, data: object) -> str:
        return self.emit({"type": f"data-{part_type}", "data": data})

    # --- terminal ----------------------------------------------------------
    def finish(self) -> str:
        out = self._close_text()
        out += self.emit(
            {
                "type": "finish",
                "finishReason": "stop",
                "usage": {
                    "promptTokens": 0,
                    "completionTokens": 0,
                    "totalTokens": 0,
                },
            }
        )
        return out

    def error(self, text: str) -> str:
        return self.emit({"type": "error", "errorText": text})

    def done(self) -> str:
        return _sse("[DONE]")


STREAM_HEADERS = {
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
    "x-vercel-ai-ui-message-stream": "v1",
}


def parse_chunks(stream: str) -> Iterator[dict | str]:
    """Parse an encoded stream back into parts — used by tests, not the server."""
    for line in stream.split("\n"):
        line = line.strip()
        if not line.startswith("data: "):
            continue
        payload = line[len("data: ") :]
        if payload == "[DONE]":
            yield "[DONE]"
            continue
        yield json.loads(payload)