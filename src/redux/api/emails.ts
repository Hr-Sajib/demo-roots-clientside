// redux/api/emails.ts
import { baseApi } from "@/redux/api/base";

export const emailsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // 1. Fast overview list — Customers + Employees tabs
    getAllEmailInboxes: builder.query({
      query: () => ({
        url: "/email",
        method: "GET",
      }),
      providesTags: ["Emails"],
    }),

    // 2. Full history for a specific customer/employee
    getEmailsForTarget: builder.query({
      query: ({ targetType, targetId }: { targetType: string; targetId: string }) => ({
        url: `/email/${targetType}/${targetId}`,
        method: "GET",
      }),
      providesTags: (result, error, { targetType, targetId }) => [
        { type: "EmailThread", id: `${targetType}:${targetId}` },
      ],
    }),

    // 3. Send a custom email to a specific customer/employee, with
    //    optional file attachments, order-invoice attachments, an aging
    //    report attachment, and/or a rich HTML body (from the compose
    //    box's image-paste-enabled editor).
    sendCustomEmail: builder.mutation({
      query: ({
        targetType,
        targetId,
        subject,
        bodyText,
        bodyHtml,
        attachments,
        orderIds,
        includeAgingReport,
      }) => {
        const formData = new FormData();
        formData.append("targetType", targetType);
        formData.append("targetId", targetId);
        formData.append("subject", subject);
        formData.append("bodyText", bodyText);
        if (bodyHtml) formData.append("bodyHtml", bodyHtml);
        if (orderIds && orderIds.length > 0) {
          formData.append("orderIds", JSON.stringify(orderIds));
        }
        if (includeAgingReport) formData.append("includeAgingReport", "true");
        (attachments as File[] | undefined)?.forEach((file) =>
          formData.append("attachments", file),
        );

        return {
          url: "/email/send",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: (result, error, { targetType, targetId }) => [
        "Emails",
        { type: "EmailThread", id: `${targetType}:${targetId}` },
      ],
    }),

    // 3b. Upload one pasted/dropped compose-box image, returning its real
    //     S3 URL so it can be embedded directly into the message body.
    uploadEmbeddedImage: builder.mutation<{ data: { url: string } }, File>({
      query: (file) => {
        const formData = new FormData();
        formData.append("image", file);
        return {
          url: "/email/embed-image",
          method: "POST",
          body: formData,
        };
      },
    }),

    // 4. Send the same email to a list of target email addresses
    //    ("Bulk Mail"), with optional file attachments.
    sendBulkEmail: builder.mutation({
      query: ({ targetEmails, subject, bodyText, bodyHtml, attachments }) => {
        const formData = new FormData();
        formData.append("targetEmails", JSON.stringify(targetEmails));
        formData.append("subject", subject);
        formData.append("bodyText", bodyText);
        if (bodyHtml) formData.append("bodyHtml", bodyHtml);
        (attachments as File[] | undefined)?.forEach((file) =>
          formData.append("attachments", file),
        );

        return {
          url: "/email/send-bulk",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: ["Emails"],
    }),
  }),
});

export const {
  useGetAllEmailInboxesQuery,
  useGetEmailsForTargetQuery,
  useLazyGetEmailsForTargetQuery,
  useSendCustomEmailMutation,
  useSendBulkEmailMutation,
  useUploadEmbeddedImageMutation,
} = emailsApi;
