import CustomerDetailsPage from "@/Features/Customers/CustomerDetails";
import AccessGate from "@/components/shared/AccessDenied";

export default function EditContainer(): React.ReactElement {
    return (
        <AccessGate allowance="customerSee" label="customer details">
            <div>
                <CustomerDetailsPage />
            </div>
        </AccessGate>
    );
}