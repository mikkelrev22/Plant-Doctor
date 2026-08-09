import { relations } from 'drizzle-orm';
import { agentEvents } from './agent-events';
import { chats } from './chats';
import { llmRequests, userEvents } from './logs';
import { plants } from './plants';
import { plantPhotos, plantReports } from './reports';
import {
  plantReportStressSigns,
  stressSigns,
  stressSignVariables,
  stressVariables,
} from './stress';
import { users } from './users';

export const userRelations = relations(users, ({ many }) => ({
  plants: many(plants),
  userEvents: many(userEvents),
  llmRequests: many(llmRequests),
  chats: many(chats),
  agentEvents: many(agentEvents),
}));

export const plantRelations = relations(plants, ({ one, many }) => ({
  user: one(users, {
    fields: [plants.userId],
    references: [users.id],
  }),
  reports: many(plantReports),
  photos: many(plantPhotos),
  userEvents: many(userEvents),
  llmRequests: many(llmRequests),
  chats: many(chats),
}));

export const plantReportRelations = relations(plantReports, ({ one, many }) => ({
  plant: one(plants, {
    fields: [plantReports.plantId],
    references: [plants.id],
  }),
  photos: many(plantPhotos),
  stressSigns: many(plantReportStressSigns),
  userEvents: many(userEvents),
  llmRequests: many(llmRequests),
  // Chats that were opened with this report as their default context.
  defaultChats: many(chats),
}));

export const plantPhotoRelations = relations(plantPhotos, ({ one }) => ({
  plant: one(plants, {
    fields: [plantPhotos.plantId],
    references: [plants.id],
  }),
  report: one(plantReports, {
    fields: [plantPhotos.plantReportId],
    references: [plantReports.id],
  }),
}));

export const stressVariableRelations = relations(
  stressVariables,
  ({ many }) => ({
    stressSigns: many(stressSignVariables),
  })
);

export const stressSignRelations = relations(stressSigns, ({ many }) => ({
  variables: many(stressSignVariables),
  reports: many(plantReportStressSigns),
}));

export const stressSignVariableRelations = relations(
  stressSignVariables,
  ({ one }) => ({
    stressSign: one(stressSigns, {
      fields: [stressSignVariables.stressSignId],
      references: [stressSigns.id],
    }),
    stressVariable: one(stressVariables, {
      fields: [stressSignVariables.stressVariableId],
      references: [stressVariables.id],
    }),
  })
);

export const plantReportStressSignRelations = relations(
  plantReportStressSigns,
  ({ one }) => ({
    report: one(plantReports, {
      fields: [plantReportStressSigns.plantReportId],
      references: [plantReports.id],
    }),
    stressSign: one(stressSigns, {
      fields: [plantReportStressSigns.stressSignId],
      references: [stressSigns.id],
    }),
  })
);

export const userEventRelations = relations(userEvents, ({ one }) => ({
  user: one(users, {
    fields: [userEvents.userId],
    references: [users.id],
  }),
  plant: one(plants, {
    fields: [userEvents.plantId],
    references: [plants.id],
  }),
  report: one(plantReports, {
    fields: [userEvents.plantReportId],
    references: [plantReports.id],
  }),
}));

export const llmRequestRelations = relations(llmRequests, ({ one, many }) => ({
  user: one(users, {
    fields: [llmRequests.userId],
    references: [users.id],
  }),
  plant: one(plants, {
    fields: [llmRequests.plantId],
    references: [plants.id],
  }),
  report: one(plantReports, {
    fields: [llmRequests.plantReportId],
    references: [plantReports.id],
  }),
  agentEvents: many(agentEvents),
}));

export const chatRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id],
  }),
  plant: one(plants, {
    fields: [chats.plantId],
    references: [plants.id],
  }),
  defaultReport: one(plantReports, {
    fields: [chats.defaultReportId],
    references: [plantReports.id],
    relationName: 'chat_default_report',
  }),
  agentEvents: many(agentEvents),
}));

export const agentEventRelations = relations(agentEvents, ({ one }) => ({
  user: one(users, {
    fields: [agentEvents.userId],
    references: [users.id],
  }),
  chat: one(chats, {
    fields: [agentEvents.chatId],
    references: [chats.id],
  }),
  llmRequest: one(llmRequests, {
    fields: [agentEvents.llmRequestId],
    references: [llmRequests.id],
  }),
}));