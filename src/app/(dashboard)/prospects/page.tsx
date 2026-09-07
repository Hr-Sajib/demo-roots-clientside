import ProspectDetails from "@/Features/prospects/ProspectTable";
import AccessGate from "@/components/shared/AccessDenied";


export default function Prospact(): React.ReactElement {
    return (
        <AccessGate allowance="prospectSee" label="prospects">
            <div>
                <ProspectDetails />
            </div>
        </AccessGate>
    );
}