import EditContainerPage from "@/Features/containers/EditContainer";
import AccessGate from "@/components/shared/AccessDenied";

export default function EditContainer(): React.ReactElement {
    return (
        <AccessGate allowance="containerUpdate" label="editing containers">
            <div>
                <EditContainerPage />
            </div>
        </AccessGate>
    );
}