import type { MarkdownStyleMap } from '@ronradtke/react-native-markdown-display';
import { theme } from '@/constants/theme';

/**
 * Themed style overrides for assistant markdown text.
 *
 * Passed to `<Markdown style={markdownStyles} mergeStyle>`. `mergeStyle` is on
 * by default, so these merge with the library's built-in styles — we only
 * override the tokens that should carry Plant-Doctor's leaf/cream palette and
 * typography. User-typed messages are plain text and never use this.
 *
 * Light-mode only (the app has no dark theme); `body.color` cascades to text
 * nodes, so a single `color` on `body` covers most prose.
 */
export const markdownStyles: MarkdownStyleMap = {
  body: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  heading1: { ...theme.typography.title, color: theme.colors.leafDark, marginTop: theme.spacing.sm },
  heading2: { ...theme.typography.subtitle, color: theme.colors.leafDark, marginTop: theme.spacing.sm },
  heading3: { fontSize: 16, fontWeight: '600', color: theme.colors.leafDark, marginTop: theme.spacing.xs },
  strong: { fontWeight: '700' },
  em: { fontStyle: 'italic' },
  paragraph: { marginTop: theme.spacing.xs, marginBottom: theme.spacing.xs },
  link: { color: theme.colors.leaf, textDecorationLine: 'underline' },
  blockquote: {
    backgroundColor: theme.colors.cream,
    borderColor: theme.colors.leafSoft,
    borderLeftWidth: 3,
    marginLeft: 0,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  code_inline: {
    backgroundColor: theme.colors.cream,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    padding: 2,
    paddingHorizontal: 4,
    color: theme.colors.leafDark,
  },
  code_block: {
    backgroundColor: theme.colors.cream,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radii.sm,
    color: theme.colors.leafDark,
  },
  fence: {
    borderColor: theme.colors.border,
    borderRadius: theme.radii.sm,
  },
  fence_code: {
    backgroundColor: theme.colors.cream,
  },
  fence_token: {
    color: theme.colors.leafDark,
  },
  list_item: { marginTop: 2, marginBottom: 2 },
  bullet_list_icon: { color: theme.colors.leaf },
  ordered_list_icon: { color: theme.colors.leaf },
  hr: { backgroundColor: theme.colors.border },
  table: { borderColor: theme.colors.border },
  tr: { borderColor: theme.colors.border },
};