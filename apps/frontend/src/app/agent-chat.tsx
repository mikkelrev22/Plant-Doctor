import { FormEvent, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

import { chatAgent } from '../api/backend-py';
import type { ChatMessage } from '../types/backend-py';

const THREAD_STORAGE_KEY = 'plant-doctor-agent-thread-id';

export function AgentChatPage() {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const storedThreadId = sessionStorage.getItem(THREAD_STORAGE_KEY);
    if (storedThreadId) {
      setThreadId(storedThreadId);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = input.trim();
    if (!message || loading) {
      return;
    }

    setLoading(true);
    setError(null);
    setInput('');

    try {
      const response = await chatAgent({
        message,
        thread_id: threadId,
      });
      setThreadId(response.thread_id);
      sessionStorage.setItem(THREAD_STORAGE_KEY, response.thread_id);
      setMessages(response.result.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Agent request failed');
    } finally {
      setLoading(false);
    }
  }

  function startNewConversation() {
    setThreadId(null);
    setMessages([]);
    setError(null);
    sessionStorage.removeItem(THREAD_STORAGE_KEY);
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Plant doctor agent</h1>
        <p>Multi-turn ReAct workflow with tool use and conversation memory.</p>
        {threadId ? <p className="meta">Thread: {threadId}</p> : null}
      </header>

      <div className="card chat-panel">
        <div className="chat-toolbar">
          <button type="button" className="secondary" onClick={startNewConversation}>
            New conversation
          </button>
        </div>

        <div className="chat-messages" aria-live="polite">
          {messages.length === 0 ? (
            <p className="placeholder">
              Ask about symptoms, care, or paste an image URL in your message.
            </p>
          ) : (
            messages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                className={`chat-message chat-message-${message.role}`}
              >
                <strong>{formatRole(message.role)}</strong>
                {message.role === 'ai' ? (
                  <div className="chat-markdown">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{message.content}</p>
                )}
              </article>
            ))
          )}
        </div>

        <form className="chat-form" onSubmit={handleSubmit}>
          <label className="sr-only" htmlFor="agent-message">
            Message
          </label>
          <textarea
            id="agent-message"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="My pothos has brown spots on the leaves..."
            rows={3}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            {loading ? 'Thinking...' : 'Send'}
          </button>
        </form>
      </div>

      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}

function formatRole(role: string): string {
  switch (role) {
    case 'human':
      return 'You';
    case 'ai':
      return 'Agent';
    case 'tool':
      return 'Tool';
    default:
      return role;
  }
}
