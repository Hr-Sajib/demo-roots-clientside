import EditCustomer from "@/Features/Customers/EditCustomer";
import AccessGate from "@/components/shared/AccessDenied";

export default function EditContainer(): React.ReactElement {
    return (
        <AccessGate allowance="customerUpdate" label="editing customers">
            <div>
                <EditCustomer />
            </div>
        </AccessGate>
    );
}