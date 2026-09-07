import AllGetProducts from "@/Features/Inventory/ProductTable";
import AccessGate from "@/components/shared/AccessDenied";

export default function Inventory(): React.ReactElement {
    return (
        <AccessGate allowance="inventorySee" label="inventory">
            <div>
                <AllGetProducts />
            </div>
        </AccessGate>
    );
}