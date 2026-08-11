import { describe, expect, it } from 'vitest';
import {
  applyPart,
  initialResult,
  parseSseChunk,
  type AggregatedResult,
} from './agentStreamParser';

// A representative agent stream: a data-thread part, one tool call (input then
// output), one batched text-delta (the LLM is non-streaming), finish, [DONE].
// Each event is terminated by a blank line (`\n\n`) exactly as the server emits.
const SAMPLE_STREAM = [
  'data: {"type":"start","messageId":"msg_1"}',
  'data: {"type":"data-thread","data":{"thread_id":"tok_abc","chat_token":"tok_abc","plant_id":1,"plant_name":"Sunny","default_report_id":42}}',
  'data: {"type":"start-step"}',
  'data: {"type":"tool-input-start","toolCallId":"call_1","toolName":"look_at_photo","dynamic":true}',
  'data: {"type":"tool-input-available","toolCallId":"call_1","toolName":"look_at_photo","input":{"reportId":42,"query":"soil?"},"dynamic":true}',
  'data: {"type":"tool-output-available","toolCallId":"call_1","output":"Soil looks dry."}',
  'data: {"type":"text-delta","id":"txt_1","delta":"Yes, the soil looks dry — go ahead and trim."}',
  'data: {"type":"finish","finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0,"totalTokens":0}}',
  'data: [DONE]',
]
  .map((line) => `${line}\n\n`)
  .join('');

/** Feed the whole stream through parseSseChunk/applyPart, splitting it at
 *  `splitAt` to prove partial-event buffering works across chunk boundaries. */
function runStream(stream: string, splitAt: number): AggregatedResult {
  const chunk1 = stream.slice(0, splitAt);
  const chunk2 = stream.slice(splitAt);
  let state = initialResult;
  let buf = '';
  for (const chunk of [chunk1, chunk2]) {
    const { parts, rest } = parseSseChunk(chunk, buf);
    buf = rest;
    for (const part of parts) state = applyPart(state, part);
  }
  return state;
}

describe('agentStreamParser', () => {
  it('aggregates text, tool calls, thread, and done from a full stream', () => {
    const result = runStream(SAMPLE_STREAM, SAMPLE_STREAM.length);
    expect(result.done).toBe(true);
    expect(result.text).toBe('Yes, the soil looks dry — go ahead and trim.');
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]).toMatchObject({
      toolCallId: 'call_1',
      toolName: 'look_at_photo',
      input: { reportId: 42, query: 'soil?' },
      output: 'Soil looks dry.',
    });
    expect(result.thread).toEqual({
      thread_id: 'tok_abc',
      chat_token: 'tok_abc',
      plant_id: 1,
      plant_name: 'Sunny',
      default_report_id: 42,
    });
    expect(result.error).toBeUndefined();
  });

  it('produces the same result regardless of where the chunk splits', () => {
    const whole = runStream(SAMPLE_STREAM, SAMPLE_STREAM.length);
    // Split inside the middle of the tool-input-available JSON payload.
    const midPayload = runStream(SAMPLE_STREAM, SAMPLE_STREAM.indexOf('"toolName":"look_at_photo","input"'));
    // Split right on a blank-line boundary.
    const onBoundary = runStream(SAMPLE_STREAM, SAMPLE_STREAM.indexOf('\n\ndata: {"type":"start-step"}') + 1);
    expect(midPayload).toEqual(whole);
    expect(onBoundary).toEqual(whole);
  });

  it('captures an error part and still terminates on [DONE]', () => {
    const errorStream = [
      'data: {"type":"error","errorText":"Failed to start chat: boom"}',
      'data: [DONE]',
    ]
      .map((line) => `${line}\n\n`)
      .join('');
    const result = runStream(errorStream, errorStream.length);
    expect(result.error).toBe('Failed to start chat: boom');
    expect(result.done).toBe(true);
    expect(result.text).toBe('');
    expect(result.toolCalls).toEqual([]);
  });

  it('ignores malformed data lines without throwing', () => {
    const badStream = [
      'data: {not valid json',
      'data: {"type":"text-delta","id":"t","delta":"hi"}',
      'data: [DONE]',
    ]
      .map((line) => `${line}\n\n`)
      .join('');
    const result = runStream(badStream, badStream.length);
    expect(result.text).toBe('hi');
    expect(result.done).toBe(true);
  });

  it('maps multiple tool calls and matches outputs by toolCallId', () => {
    const multiStream = [
      'data: {"type":"tool-input-available","toolCallId":"a","toolName":"get_report_history","input":{"plantId":1}}',
      'data: {"type":"tool-input-available","toolCallId":"b","toolName":"look_at_photo","input":{"reportId":2}}',
      'data: {"type":"tool-output-available","toolCallId":"b","output":"photo b"}',
      'data: {"type":"tool-output-available","toolCallId":"a","output":"history a"}',
      'data: [DONE]',
    ]
      .map((line) => `${line}\n\n`)
      .join('');
    const result = runStream(multiStream, multiStream.length);
    expect(result.toolCalls).toEqual([
      { toolCallId: 'a', toolName: 'get_report_history', input: { plantId: 1 }, output: 'history a' },
      { toolCallId: 'b', toolName: 'look_at_photo', input: { reportId: 2 }, output: 'photo b' },
    ]);
  });
});