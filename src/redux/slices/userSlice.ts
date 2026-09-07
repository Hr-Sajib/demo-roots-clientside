import { createSlice, PayloadAction } from "@reduxjs/toolkit";

/**
 * Logged-in user shape, mirroring the `userData` field in the login
 * response (see src/redux/api/admin/adminApi.ts → LoginResponseData).
 *
 * All fields are optional because the backend only populates what the
 * user has set in their profile. The slice is intentionally permissive
 * — if the schema grows, add fields here and types stay accurate.
 */
export interface CurrentUser {
  _id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  image?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: number;
  documentLink?: string;
  documentExpiryDate?: string | Date;
  documentExpiryReminderEmailSentOrNot?: boolean;
  allowances?: {
    mainDashBorad?: boolean;
    prospectSee?: boolean;
    prospectAdd?: boolean;
    prospectUpdate?: boolean;
    prospectDelete?: boolean;
    customerSee?: boolean;
    customerAdd?: boolean;
    customerUpdate?: boolean;
    customerDelete?: boolean;
    orderSee?: boolean;
    orderAdd?: boolean;
    orderUpdate?: boolean;
    orderDelete?: boolean;
    inventorySee?: boolean;
    inventoryAdd?: boolean;
    inventoryUpdate?: boolean;
    inventoryDelete?: boolean;
    containerSee?: boolean;
    containerAdd?: boolean;
    containerUpdate?: boolean;
    containerDelete?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface UserState {
  data: CurrentUser | null;
}

const initialState: UserState = {
  data: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<CurrentUser>) => {
      state.data = action.payload;
    },
    /**
     * Patch a partial update onto the current user without overwriting
     * missing fields. Useful when a profile edit returns the updated
     * user and we want to merge it into store without round-tripping
     * the whole object.
     */
    patchUser: (state, action: PayloadAction<Partial<CurrentUser>>) => {
      if (!state.data) {
        // No existing user to patch; ignore. Callers should use setUser.
        return;
      }
      state.data = { ...state.data, ...action.payload };
    },
    clearUser: (state) => {
      state.data = null;
    },
  },
});

export const { setUser, patchUser, clearUser } = userSlice.actions;

// Selectors — preferred over reading localStorage from components.
export const selectCurrentUser = (state: { user: UserState }) =>
  state.user.data;

export const selectUserRole = (state: { user: UserState }) =>
  state.user.data?.role?.toLowerCase() ?? null;

export const selectUserId = (state: { user: UserState }) =>
  state.user.data?._id ?? null;

export default userSlice.reducer;