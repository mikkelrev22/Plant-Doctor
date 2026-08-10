import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { ChatsListBody } from '@/components/chat/ChatsListBody';
import { useRequireAuth } from '@/hooks/use-require-auth';

/**
 * All-chats modal: lists a plant's saved chats so a past consultation can be
 * reopened. Registered with `presentation: 'modal'` in `_layout`, so on native
 * it renders as the real iOS/Android sheet (swipe-down / back to dismiss) — the
 * same mechanism as Add-plant. On web this route is a plain page fallback; the
 * primary web entry point is the `ChatsSheet` dialog on the Plant page.
 */
export default function ChatsScreen() {
  const user = useRequireAuth();
  const { plantId } = useLocalSearchParams<{ plantId: string }>();
  const id = Number(plantId);

  if (!user) return null;

  return (
    <Screen>
      <ChatsListBody
        plantId={id}
        onChatSelected={(chat) => {
          // Dismiss this modal sheet first so the chat opens as a full-screen
          // page on the root stack (over the plant page), not as a nested sheet
          // pushed inside the modal's own navigation context.
          router.dismiss();
          router.push({
            pathname: '/chat/[plantId]',
            params: { plantId: String(id), chatToken: chat.chatToken },
          });
        }}
      />
    </Screen>
  );
}