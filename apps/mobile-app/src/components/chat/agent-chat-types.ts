import type { UIMessage } from 'ai';
import type {
  AgentPhotoRequestPartData,
  AgentQuestionnairePartData,
  AgentThreadPartData,
  AgentYesNoPartData,
} from '@plant-doctor/api-types';

/**
 * Map of custom `data-*` part names → their `data` payload shapes, used to type
 * `useChat`'s `UIMessage` parts. Each key becomes a `data-<key>` part type on the
 * wire (emitted by `apps/backend-agent`); see `Agent*PartData` in api-types.
 *
 * Declared as a `type` (not `interface`) so it satisfies the AI SDK's
 * `UIDataTypes` (`Record<string, unknown>`) constraint — interfaces don't get an
 * implicit index signature and would fail that constraint.
 */
export type AgentChatData = {
  thread: AgentThreadPartData;
  yesno: AgentYesNoPartData;
  questionnaire: AgentQuestionnairePartData;
  'photo-request': AgentPhotoRequestPartData;
};

/** A `UIMessage` carrying our custom data parts (typed for the `parts` switch). */
export type AgentUIMessage = UIMessage<unknown, AgentChatData>;