'use client';

import ContainerTable from "@/Features/containers/ContainerTable";
import AccessGate from "@/components/shared/AccessDenied";

export default function Container(): React.ReactElement {
  return (
    <AccessGate allowance="containerSee" label="container management">
      <ContainerTable />
    </AccessGate>
  );
}