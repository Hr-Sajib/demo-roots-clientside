
import Cookies from "js-cookie";
import baseApi from "./base";

// Interface for the assignedSalesPerson object
interface AssignedSalesPerson {
  _id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  password?: string; // Optional, as it might not always be returned
}

// Interface for packageDimensions within productObjId
interface PackageDimensions {
  length: number;
  width: number;
  height: number;
  unit: string;
}

// Interface for productObjId within quotedList
interface ProductObjId {
  _id: string;
  name: string;
  isDeleted: boolean;
  competitorPrice: number;
  packetSize: string;
  weight: number;
  weightUnit: string;
  categoryId: string;
  reorderPointOfQuantity: number;
  salesPrice: number;
  purchasePrice: number;
  barcodeString: string;
  itemNumber: string;
  quantity: number;
  warehouseLocation: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  incomingQuantity: number;
  packageDimensions: PackageDimensions;
}

// Interface for quotedList items
interface QuotedListItem {
  productObjId?: ProductObjId;
  itemNumber: string;
  itemName: string;
  price: number;
  _id: string;
}

// Interface for followUpActivities
interface FollowUpActivity {
  activity: string;
  activityDate: string;
  activityMedium: string;
  _id: string;
}

// Main Prospect interface
interface Prospect {
  _id: string;
  storeName: string;
  storePhone: string;
  storePersonEmail: string;
  storePersonName: string;
  storePersonPhone: string;
  salesTaxId: string;
  shippingAddress: string;
  shippingState: string;
  shippingZipcode: string;
  shippingCity: string;
  miscellaneousDocImage: string;
  leadSource: string;
  note: string;
  status: string;
  assignedSalesPerson: AssignedSalesPerson;
  followUpActivities: FollowUpActivity[];
  quotedList: QuotedListItem[];
  competitorStatement: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

// Interface for the API response
interface ProspectsResponse {
  success: boolean;
  message: string;
  data: Prospect[];
}

// Interface for a single prospect response
interface ProspectResponse {
  success: boolean;
  message: string;
  data: Prospect;
}

// Interface for the AddProspect request payload with optional _id for updates
export interface AddProspectRequest {
  _id?: string;
  storeName: string;
  storePhone: string;
  storePersonEmail: string;
  storePersonName: string;
  storePersonPhone: string;
  salesTaxId?: string;
  shippingAddress: string;
  shippingState: string;
  shippingZipcode: string;
  shippingCity: string;
  miscellaneousDocImage?: string;
  leadSource: string;
  note?: string;
  status: string;
  competitorStatement?: string;
  assignedSalesPerson?: string | AssignedSalesPerson; // Allow string ID or object
  followUpActivities?: FollowUpActivity[];
}

const prospectApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProspects: builder.query<ProspectsResponse, void>({
      query: () => ({
        url: "/prospect",
        method: "GET",
        headers: {
          Authorization: `Bearer ${Cookies.get("token")}`,
        },
        providesTags: ["PROSPECT"],
      }),
    }),
    getProspectById: builder.query<ProspectResponse, string>({
      query: (id) => ({
        url: `/prospect/${id}`,
        method: "GET",
        headers: {
          Authorization: `Bearer ${Cookies.get("token")}`,
        },
      }),
    }),
    addProspect: builder.mutation<Prospect, AddProspectRequest>({
      query: (body) => ({
        url: "/prospect",
        method: "POST",
        body,
        headers: {
          Authorization: `Bearer ${Cookies.get("token")}`,
        },
        invalidatesTags: ["PROSPECT"],
      }),
    }),
    convertProspect: builder.mutation<Prospect, string>({
      query: (id) => ({
        url: `/prospect/${id}/make-customer`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${Cookies.get("token")}`,
        },
        invalidatesTags: ["PROSPECT"],
      }),
    }),
    updateProspect: builder.mutation({
      query: ({ _id, ...body }) => ({
        url: `/prospect/${_id}`,
        method: "PATCH",
        body,
        headers: {
          Authorization: `Bearer ${Cookies.get("token")}`,
        },
        invalidatesTags: ["PROSPECT"],
      }),
    }),
    deleteProspect: builder.mutation<{ success: boolean; message?: string }, string>({
      query: (id) => ({
        url: `/prospect/${id}`,
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${Cookies.get("token")}`,
        },
        invalidatesTags: ["PROSPECT"],
      }),
    }),
    sendEmail: builder.mutation<{ success: boolean; message?: string }, string>({
      query: (id) => ({
        url: `/prospect/${id}/send-quote`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${Cookies.get("token")}`,
        },
        invalidatesTags: ["PROSPECT"],
      }),
    }),
  }),
});

export const { useGetProspectsQuery, useGetProspectByIdQuery, useAddProspectMutation, useConvertProspectMutation, useUpdateProspectMutation, useDeleteProspectMutation, useSendEmailMutation } = prospectApi;
export default prospectApi;

// import baseApi from "../../baseApi";
// import Cookies from "js-cookie";

// // Interface for the assignedSalesPerson object
// interface AssignedSalesPerson {
//   _id: string;
//   email: string;
//   role: string;
//   createdAt: string;
//   updatedAt: string;
//   __v: number;
//   password?: string; // Optional, as it might not always be returned
// }

// // Interface for packageDimensions within productObjId
// interface PackageDimensions {
//   length: number;
//   width: number;
//   height: number;
//   unit: string;
// }

// // Interface for productObjId within quotedList
// interface ProductObjId {
//   _id: string;
//   name: string;
//   isDeleted: boolean;
//   competitorPrice: number;
//   packetSize: string;
//   weight: number;
//   weightUnit: string;
//   categoryId: string;
//   reorderPointOfQuantity: number;
//   salesPrice: number;
//   purchasePrice: number;
//   barcodeString: string;
//   itemNumber: string;
//   quantity: number;
//   warehouseLocation: string;
//   createdAt: string;
//   updatedAt: string;
//   __v: number;
//   incomingQuantity: number;
//   packageDimensions: PackageDimensions;
// }

// // Interface for quotedList items
// interface QuotedListItem {
//   productObjId?: ProductObjId;
//   itemNumber: string;
//   itemName: string;
//   price: number;
//   _id: string;
// }

// // Interface for followUpActivities
// interface FollowUpActivity {
//   activity: string;
//   activityDate: string;
//   activityMedium: string;
//   _id: string;
// }

// // Main Prospect interface
// interface Prospect {
//   _id: string;
//   storeName: string;
//   storePhone: string;
//   storePersonEmail: string;
//   storePersonName: string;
//   storePersonPhone: string;
//   salesTaxId: string;
//   shippingAddress: string;
//   shippingState: string;
//   shippingZipcode: string;
//   shippingCity: string;
//   miscellaneousDocImage: string;
//   leadSource: string;
//   note: string;
//   status: string;
//   assignedSalesPerson: AssignedSalesPerson;
//   followUpActivities: FollowUpActivity[];
//   quotedList: QuotedListItem[];
//   competitorStatement: string;
//   isDeleted: boolean;
//   createdAt: string;
//   updatedAt: string;
//   __v: number;
// }

// // Interface for the API response
// interface ProspectsResponse {
//   success: boolean;
//   message: string;
//   data: Prospect[];
// }

// // Interface for a single prospect response
// interface ProspectResponse {
//   success: boolean;
//   message: string;
//   data: Prospect;
// }

// // Interface for the AddProspect request payload with optional _id for updates
// export interface AddProspectRequest {
//   _id?: string; // Added for identifying the prospect to update, made optional
//   storeName: string;
//   storePhone: string;
//   storePersonEmail: string;
//   storePersonName: string;
//   storePersonPhone: string;
//   salesTaxId?: string;
//   shippingAddress: string;
//   shippingState: string;
//   shippingZipcode: string;
//   shippingCity: string;
//   miscellaneousDocImage?: string;
//   leadSource: string;
//   note?: string;
//   status: string;
//   competitorStatement?: string;
//   assignedSalesPerson?: AssignedSalesPerson;
//   followUpActivities?: FollowUpActivity[];
// }

// const prospectApi = baseApi.injectEndpoints({
//   endpoints: (builder) => ({
//     getProspects: builder.query<ProspectsResponse, void>({
//       query: () => ({
//         url: "/prospects",
//         method: "GET",
//         headers: {
//           Authorization: `Bearer ${Cookies.get("token")}`, // Correct usage of backticks
//         },
//         providesTags: ["PROSPECT"],
//       }),
//     }),
//     getProspectById: builder.query<ProspectResponse, string>({
//       query: (id) => ({
//         url: `/prospect/${id}`,
//         method: "GET",
//         headers: {
//           Authorization: `Bearer ${Cookies.get("token")}`, // Use token for auth if required
//         },
//       }),
//     }),
//     addProspect: builder.mutation<Prospect, AddProspectRequest>({
//       query: (body) => ({
//         url: "/prospects",
//         method: "POST",
//         body,
//         headers: {
//           Authorization: `Bearer ${Cookies.get("token")}`, // Correct usage of backticks
//         },
//         invalidatesTags: ["PROSPECT"], // Invalidate cache after adding a prospect
//       }),
//     }),
//     convertProspect: builder.mutation<Prospect, string>({
//       query: (id) => ({
//         url: `/prospect/${id}/make-customer`, // Correct usage of backticks
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${Cookies.get("token")}`, // Correct usage of backticks
//         },
//         invalidatesTags: ["PROSPECT"], // Invalidate cache after converting a prospect
//       }),
//     }),
//     updateProspect: builder.mutation<Prospect, { _id: string } & AddProspectRequest>({
//       query: ({ _id, ...body }) => ({
//         url: `/prospect/${_id}`, // Corrected: use backticks
//         method: "PATCH",
//         body,
//         headers: {
//           Authorization: `Bearer ${Cookies.get("token")}`, // Corrected: use backticks
//         },
//         invalidatesTags: ["PROSPECT"], // Invalidate cache after updating a prospect
//       }),
//     }),
//     deleteProspect: builder.mutation<{ success: boolean; message?: string }, string>({
//       query: (id) => ({
//         url: `/prospect/${id}`, // Corrected: Use backticks for template literals
//         method: "DELETE",
//         headers: {
//           Authorization: `Bearer ${Cookies.get("token")}`, // Corrected: Use backticks
//         },
//         invalidatesTags: ["PROSPECT"], // Invalidate cache after deleting a prospect
//       }),
//     }),
//     sendEmail: builder.mutation<{ success: boolean; message?: string }, string>({
//       query: (id) => ({
//         url: `/prospect/${id}/send-quote`, // Corrected: Use backticks for template literals
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${Cookies.get("token")}`, // Corrected: Use backticks
//         },
//         invalidatesTags: ["PROSPECT"], // Invalidate cache after sending an email (if it affects prospect list)
//       }),
//     }),
//   }),
// });

// export const { useGetProspectsQuery, useGetProspectByIdQuery, useAddProspectMutation, useConvertProspectMutation, useUpdateProspectMutation, useDeleteProspectMutation, useSendEmailMutation } = prospectApi;
// export default prospectApi;

// // // prospactApi.ts
// // import baseApi from "../../baseApi";
// // import Cookies from "js-cookie";
// // // Assuming these interfaces are defined in a file like src/types/index.ts or src/types.ts
// // // Adjust the path "@/types" if your alias is different or if it's a direct relative path
// // import {
// //     FollowUpActivity, // <--- Import it from your central types file
// //     AddProspectRequest, // <--- Import it from your central types file
// //     QuotedListItem, // <--- Import it from your central types file
// //     // ... any other interfaces that live in src/types and are used here
// // } from "@/types"; // Make sure this path is correct for your project setup

// // // Interface for the assignedSalesPerson object (if it's only used here, keep it, otherwise move to types)
// // interface AssignedSalesPerson {
// //     _id: string;
// //     email: string;
// //     role: string;
// //     createdAt: string;
// //     updatedAt: string;
// //     __v: number;
// //     password?: string;
// // }

// // // Interface for packageDimensions within productObjId (move to central types if used elsewhere)
// // interface PackageDimensions {
// //     length: number;
// //     width: number;
// //     height: number;
// //     unit: string;
// // }

// // // Interface for productObjId within quotedList (move to central types if used elsewhere)
// // interface ProductObjId {
// //     _id: string;
// //     name: string;
// //     isDeleted: boolean;
// //     competitorPrice: number;
// //     packetSize: string;
// //     weight: number;
// //     weightUnit: string;
// //     categoryId: string;
// //     reorderPointOfQuantity: number;
// //     salesPrice: number;
// //     purchasePrice: number;
// //     barcodeString: string;
// //     itemNumber: string;
// //     quantity: number;
// //     warehouseLocation: string;
// //     createdAt: string;
// //     updatedAt: string;
// //     __v: number;
// //     incomingQuantity: number;
// //     packageDimensions: PackageDimensions;
// // }

// // // Interface for quotedList items (move to central types if used elsewhere)
// // // Note: QuotedListItem needs ProductObjId defined or imported
// // // If QuotedListItem, ProductObjId, PackageDimensions are only used within Prospect,
// // // you might embed them or keep them here if it helps organization.
// // // However, if they are reused, move them to central types.
// // // For now, let's assume QuotedListItem is now imported and ProductObjId is defined locally or imported.
// // // For this example, let's keep QuotedListItem definition here assuming ProductObjId is also here or imported.
// // // BUT the best practice is to move all shared interfaces to a single types file.

// // // Main Prospect interface (move to central types if used elsewhere)
// // interface Prospect {
// //     _id: string;
// //     storeName: string;
// //     storePhone: string;
// //     storePersonEmail: string;
// //     storePersonName: string;
// //     storePersonPhone: string;
// //     salesTaxId: string;
// //     shippingAddress: string;
// //     shippingState: string;
// //     shippingZipcode: string;
// //     miscellaneousDocImage: string;
// //     leadSource: string;
// //     note: string;
// //     status: string;
// //     assignedSalesPerson: AssignedSalesPerson;
// //     followUpActivities: FollowUpActivity[]; // This will now correctly refer to the imported type
// //     quotedList: QuotedListItem[]; // This will now correctly refer to the imported type
// //     competitorStatement: string;
// //     isDeleted: boolean;
// //     createdAt: string;
// //     updatedAt: string;
// //     __v: number;
// // }

// // // Interface for the API response (move to central types if used elsewhere)
// // interface ProspectsResponse {
// //     success: boolean;
// //     message: string;
// //     data: Prospect[];
// // }

// // // Interface for a single prospect response (move to central types if used elsewhere)
// // interface ProspectResponse {
// //     success: boolean;
// //     message: string;
// //     data: Prospect;
// // }

// // const prospectApi = baseApi.injectEndpoints({
// //   endpoints: (builder) => ({
// //     getProspects: builder.query<ProspectsResponse, void>({
// //       query: () => ({
// //         url: "/prospects",
// //         method: "GET",
// //         headers: {
// //           Authorization: `Bearer ${Cookies.get("token")}`, // Correct usage of backticks
// //         },
// //          providesTags: ["PROSPECT"]
// //       }),
    
// //     }),
// //     getProspectById: builder.query<ProspectResponse, string>({
// //       query: (id) => ({
// //         url: `/prospect/${id}`,
// //         method: "GET",
// //         headers: {
// //           Authorization: `Bearer ${Cookies.get("token")}`, // Use token for auth if required
// //         },
// //       }),
// //     }),
// //     addProspect: builder.mutation<Prospect, AddProspectRequest>({
// //       query: (body) => ({
// //         url: "/prospects",
// //         method: "POST",
// //         body,
// //         headers: {
// //           Authorization: `Bearer ${Cookies.get("token")}`, // Correct usage of backticks
// //         },
// //         invalidatesTags: ["PROSPECT"],
// //       }),
      
// //     }),
// //     convertProspect: builder.mutation<Prospect, string>({
// //       query: (id) => ({
// //         url: `/prospect/${id}/make-customer`, // Correct usage of backticks
// //         method: "POST",
// //         headers: {
// //           Authorization: `Bearer ${Cookies.get("token")}`, // Correct usage of backticks
// //         },
// //          invalidatesTags: ["PROSPECT"],
// //       }),
     
// //     }),
// //     updateProspect: builder.mutation<Prospect, Partial<AddProspectRequest> & { _id: string }>({
// //       query: ({ _id, ...body }) => ({
// //         url: `/prospect/${_id}`, // Corrected: use backticks
// //         method: "PATCH",
// //         body,
// //         headers: {
// //           Authorization: `Bearer ${Cookies.get("token")}`, // Corrected: use backticks
// //         },
// //          invalidatesTags: ["PROSPECT"], // Added for cache invalidation on update
// //       }),
     
// //     }),

// //      deleteProspect: builder.mutation<{ success: boolean; message?: string }, string>({
// //       query: (id) => ({
// //         url: `/prospect/${id}`, // Corrected: Use backticks for template literals
// //         method: "DELETE",
// //         headers: {
// //           Authorization: `Bearer ${Cookies.get("token")}`, // Corrected: Use backticks
// //         },
// //          invalidatesTags: ["PROSPECT"], // Add this to re-fetch prospects after deletion
// //       }),
 

    
// //   }),
// //   }),
// // });

// // export const { useGetProspectsQuery, useGetProspectByIdQuery,  useAddProspectMutation, useConvertProspectMutation, useUpdateProspectMutation,useDeleteProspectMutation } = prospectApi;
// // export default prospectApi;