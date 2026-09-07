import AddContainerPage from "@/Features/containers/AddContainer";
import AccessGate from "@/components/shared/AccessDenied";

export default function Container(): React.ReactElement {
    return (
        <AccessGate allowance="containerAdd" label="adding containers">
            <div>
                <AddContainerPage />
            </div>
        </AccessGate>
    );
}