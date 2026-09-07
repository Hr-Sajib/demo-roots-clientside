'use client';

import { useParams } from "next/navigation";
import Loading from "@/redux/Shared/Loading";
import { useGetSupplierCreditMemoByIdQuery } from "@/redux/api/supplierCreditMemoApi";
import SupplierCreditMemoForm from "@/Features/supplierCreditMemo/SupplierCreditMemoForm";
import AccessGate from "@/components/shared/AccessDenied";

function EditSupplierCreditMemoBody(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data, isLoading, error } = useGetSupplierCreditMemoByIdQuery(id ?? "", {
    skip: !id,
  });

  if (isLoading || !id) {
    return <Loading title="Loading Supplier Credit Memo..." />;
  }

  if (error || !data?.data) {
    return (
      <div className="p-6 text-red-500">
        Failed to load Supplier Credit Memo. It may have been deleted.
      </div>
    );
  }

  return <SupplierCreditMemoForm mode="edit" initialData={data.data} />;
}

export default function EditSupplierCreditMemoPage(): React.ReactElement {
  // Editing a supplier credit memo requires the containerUpdate allowance.
  // Admin/manager bypass via the shared hook.
  return (
    <AccessGate allowance="containerUpdate" label="editing supplier credit memos">
      <EditSupplierCreditMemoBody />
    </AccessGate>
  );
}
