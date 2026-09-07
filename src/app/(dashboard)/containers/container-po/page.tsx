'use client';

import ContainerPoTable from "@/Features/containerPo/ContainerPoTable";
import AccessGate from "@/components/shared/AccessDenied";

export default function ContainerPoListPage(): React.ReactElement {
  // Container POs share the container management allowance bucket
  // (the server schema doesn't have a separate containerPoSee flag).
  // Admin/manager bypass via the shared hook.
  return (
    <AccessGate allowance="containerSee" label="Container Purchase Orders">
      <ContainerPoTable />
    </AccessGate>
  );
}