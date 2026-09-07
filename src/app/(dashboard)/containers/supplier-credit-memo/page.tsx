'use client';

import SupplierCreditMemoTable from "@/Features/supplierCreditMemo/SupplierCreditMemoTable";
import AccessGate from "@/components/shared/AccessDenied";

export default function SupplierCreditMemoListPage(): React.ReactElement {
  return (
    <AccessGate allowance="containerSee" label="Supplier Credit Memos">
      <SupplierCreditMemoTable />
    </AccessGate>
  );
}
