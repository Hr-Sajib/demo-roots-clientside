
import CustomerTable from "@/Features/Customers/CustomerTable";
import AccessGate from "@/components/shared/AccessDenied";

export default function Customers(): React.ReactElement {
    return (
        <AccessGate allowance="customerSee" label="customer management">
            <div>
                <CustomerTable />
            </div>
        </AccessGate>
    );
}