import AddProspact from "@/Features/prospects/AddProspect";
import AccessGate from "@/components/shared/AccessDenied";

export default function Product() {
  return (
    <AccessGate allowance="prospectAdd" label="adding prospects">
      <div className="">
        <AddProspact />
      </div>
    </AccessGate>
  );
}