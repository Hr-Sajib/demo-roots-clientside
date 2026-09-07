import AddCustomers from "@/Features/Customers/AddCustomer";
import AccessGate from "@/components/shared/AccessDenied";

export default function Customers(): React.ReactElement {
    return (
        <AccessGate allowance="customerAdd" label="adding customers">
            <div>
                <AddCustomers />
            </div>
        </AccessGate>
    );
}