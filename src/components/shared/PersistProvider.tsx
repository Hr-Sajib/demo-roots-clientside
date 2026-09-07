// src/components/PersistProvider.tsx
"use client";

import { PersistGate } from "redux-persist/integration/react";
import { persistor } from "@/redux/store";
import { ReactNode } from "react";

export default function PersistProvider({ children }: { children: ReactNode }) {
  // PersistGate rehydrates the redux store from localStorage on the
  // client. We deliberately pass `loading={null}` so rehydration
  // happens silently — every dashboard page already shows its own
  // Loading component while it waits for its own queries, so a
  // separate "Restoring session…" indicator on top of that would be
  // redundant noise on every navigation/refresh.
  return (
    <PersistGate loading={null} persistor={persistor}>
      {children}
    </PersistGate>
  );
}