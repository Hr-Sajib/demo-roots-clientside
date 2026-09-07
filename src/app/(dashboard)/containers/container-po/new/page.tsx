'use client';

import ContainerPoForm from "@/Features/containerPo/ContainerPoForm";
import AccessGate from "@/components/shared/AccessDenied";

export default function NewContainerPoPage(): React.ReactElement {
  // Creating a container PO requires the containerAdd allowance.
  // Admin/manager bypass via the shared hook.
  return (
    <AccessGate allowance="containerAdd" label="creating container purchase orders">
      <ContainerPoForm mode="create" />
    </AccessGate>
  );
}