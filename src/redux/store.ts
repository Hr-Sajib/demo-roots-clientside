import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import baseApi from './api/base';
import customerReducer from './slices/customers';
import userReducer from './slices/userSlice';

// Persist config covers both slices that need to survive a refresh.
// `whitelist` lists top-level reducer keys (must match the keys used in
// the reducer object below).
//
// IMPORTANT: we combineReducers the persisted slices first so that ONE
// persistReducer instance owns the localStorage key — otherwise two
// persistReducer() calls with the same config race and the last to
// write clobbers the other on every dispatch.
const appReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
  customers: customerReducer,
  user: userReducer,
});

const persistConfig = {
  key: 'root',
  storage,
  // Only persist `customers` and `user`; baseApi is intentionally
  // excluded so its cache rehydrates fresh on every load.
  whitelist: ['customers', 'user'],
  // The store shape changed in this restructure: previously there were
  // two separate persistReducer calls each writing under the same
  // "root" key, which caused one to clobber the other. The current
  // shape persists a combined `{customers, user}` object. We bump
  // version on any schema break and rely on `migrate` to drop fields
  // that no longer match the current slice shape — particularly the
  // `customers` array, which would otherwise feed Immer a non-array
  // and throw on the first setCustomers dispatch.
  version: 2,
  migrate: (state: any) => {
    // Coerce the persisted customers slice into the shape the current
    // slice expects. Anything we can't safely turn into an array of
    // customers is dropped — those records will be re-fetched from the
    // server on the next render of CustomerTable.
    if (state && state.customers) {
      const c = state.customers;
      if (c && Array.isArray(c.customers)) {
        // already shaped correctly — leave it
      } else if (Array.isArray(c)) {
        // older flat shape
        state.customers = { customers: c, loading: false, error: null };
      } else {
        state.customers = { customers: [], loading: false, error: null };
      }
    }
    return Promise.resolve(state);
  },
};

const rootReducer = persistReducer(persistConfig, appReducer);

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(baseApi.middleware),
});

setupListeners(store.dispatch);

// Export persistor for <PersistGate> in the root layout
export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;