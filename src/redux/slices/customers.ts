import { Customer } from '@/types';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';


// Define the slice state
interface CustomerState {
  customers: Customer[];
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: CustomerState = {
  customers: [],
  loading: false,
  error: null,
};

// Create the slice
const customerSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    // Reducer to set/replace all customers.
    //
    // We mutate in place using length/index operations instead of
    // `state.customers = action.payload`. Reason: Immer's proxy only
    // allows setting array indices and `.length`. Wholesale
    // reassignment triggers "[Immer] Immer only supports setting array
    // indices and the 'length' property" — and that error also fires
    // if the rehydrated slice (persisted from an older version of the
    // store shape) has state.customers as a non-array value. The
    // splice(0, length, ...next) pattern is safe in both cases and
    // works even when state.customers is initially undefined or an
    // object — because we always coerce via the splice call below.
    setCustomers: (state, action: PayloadAction<Customer[]>) => {
      const next = Array.isArray(action.payload) ? action.payload : [];
      // Splice in place: Immer-friendly, atomic replace.
      state.customers.splice(0, state.customers.length, ...next);
      state.loading = false;
      state.error = null;
    },

    // Set loading state (useful when fetching).
    setCustomersLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    // Set error.
    setCustomersError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },

    // Clear customers (logout/reset).
    clearCustomers: (state) => {
      state.customers.splice(0, state.customers.length);
      state.loading = false;
      state.error = null;
    },
  },
});

// Export actions
export const {
  setCustomers,
  setCustomersLoading,
  setCustomersError,
  clearCustomers,
} = customerSlice.actions;

// Export reducer
export default customerSlice.reducer;

// Selector to get all customers (this is your "getCustomers")
// Defensive: after a partial redux-persist rehydration the slice could
// be present without the nested `customers` array. Without this
// fallback, every consumer has to know to default to [].
export const selectCustomers = (state: { customers: CustomerState }) =>
  state.customers?.customers ?? [];

export const selectCustomersLoading = (state: { customers: CustomerState }) =>
  state.customers?.loading ?? false;

export const selectCustomersError = (state: { customers: CustomerState }) =>
  state.customers?.error ?? null;