// redux/features/message/messageApi.ts
import { baseApi } from '@/redux/api/base';

export const messageApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // 1. Create or get conversation by phone number
    // ────────────────────────────────────────────────
    startOrGetConversation: builder.mutation({
      query: ({ phoneNumber }) => ({
        url: '/message/start',
        method: 'POST',
        body: { phoneNumber },
      }),
      invalidatesTags: (result, error, { phoneNumber }) => 
        result ? [
          { type: 'Conversation', id: phoneNumber },
          'Conversations', // refresh list too
        ] : [],
    }),

    // 2. Send message (general / inside conversation)
    // ────────────────────────────────────────────────
    sendMessage: builder.mutation({
      query: ({ phoneNumber, content, contentType = 'text', isSentByAdmin = false }) => ({
        url: '/message/message',
        method: 'POST',
        body: { phoneNumber, content, contentType, isSentByAdmin },
      }),
      invalidatesTags: (result, error, { phoneNumber }) => 
        result ? [
          { type: 'Conversation', id: phoneNumber },
          'Conversations',
        ] : [],
    }),

    // 3. Send outbound message to phone number (admin/system)
    // ────────────────────────────────────────────────
    sendOutboundMessage: builder.mutation({
      query: ({ phoneNumber, content, contentType = 'text' }) => ({
        url: '/message/send',
        method: 'POST',
        body: { phoneNumber, content, contentType },
      }),
      invalidatesTags: (result, error, { phoneNumber }) => 
        result ? [
          { type: 'Conversation', id: phoneNumber },
          'Conversations',
        ] : [],
    }),

    // 4. Get single conversation by phone number
    // ────────────────────────────────────────────────
    getConversationByPhone: builder.query({
      query: (phoneNumber: string) => ({
        url: `/message/${phoneNumber}`,
        method: 'GET',
      }),
      providesTags: (result, error, phoneNumber) => 
        result ? [{ type: 'Conversation', id: phoneNumber }] : ['Conversation'],
    }),

    // 5. Get all conversations (admin dashboard, with pagination)
    // ────────────────────────────────────────────────
    getAllConversations: builder.query({
      query: () => ({
        url: '/message',
        method: 'GET',
      }),
      providesTags: ['Conversations'],
    }),


    deleteConversation: builder.mutation({
      query: (phoneNumber: string) => ({
        url: `/message`,
        body: { phoneNumber },
        method: 'DELETE',
      }),       invalidatesTags: ['Conversations'],
})
  }),
});

// Export hooks
export const {
  useStartOrGetConversationMutation,
  useSendMessageMutation,
  useSendOutboundMessageMutation,
  useGetConversationByPhoneQuery,
  useLazyGetConversationByPhoneQuery,
  useGetAllConversationsQuery,
  useLazyGetAllConversationsQuery,
  useDeleteConversationMutation
} = messageApi;