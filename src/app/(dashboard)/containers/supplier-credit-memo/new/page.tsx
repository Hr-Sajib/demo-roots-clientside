'use client';

import SupplierCreditMemoForm from "@/Features/supplierCreditMemo/SupplierCreditMemoForm";
import AccessGate from "@/components/shared/AccessDenied";

export default function NewSupplierCreditMemoPage(): React.ReactElement {
  // Creating a supplier credit memo requires the containerAdd allowance.
  // Admin/manager bypass via the shared hook.
  return (
    <AccessGate allowance="containerAdd" label="creating supplier credit memos">
      <SupplierCreditMemoForm mode="create" />
    </AccessGate>
  );
}
