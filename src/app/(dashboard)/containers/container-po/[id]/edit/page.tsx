'use client';

import { useParams } from "next/navigation";
import Loading from "@/redux/Shared/Loading";
import { useGetContainerPoByIdQuery } from "@/redux/api/containerPoApi";
import ContainerPoForm from "@/Features/containerPo/ContainerPoForm";
import AccessGate from "@/components/shared/AccessDenied";

function EditContainerPoBody(): React.ReactElement {
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data, isLoading, error } = useGetContainerPoByIdQuery(id ?? "", {
    skip: !id,
  });

  if (isLoading || !id) {
    return <Loading title="Loading Container PO..." />;
  }

  if (error || !data?.data) {
    return (
      <div className="p-6 text-red-500">
        Failed to load Container PO. It may have been deleted.
      </div>
    );
  }

  return <ContainerPoForm mode="edit" initialData={data.data} />;
}

export default function EditContainerPoPage(): React.ReactElement {
  // Editing a container PO requires the containerUpdate allowance.
  // Admin/manager bypass via the shared hook.
  return (
    <AccessGate allowance="containerUpdate" label="editing container purchase orders">
      <EditContainerPoBody />
    </AccessGate>
  );
}