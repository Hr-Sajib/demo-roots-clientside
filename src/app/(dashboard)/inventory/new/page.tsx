import AddProductPage from "@/Features/Inventory/AddProduct";
import AccessGate from "@/components/shared/AccessDenied";



export default function Product() {
  return (
    <AccessGate allowance="inventoryAdd" label="adding inventory">
      <div className="">
        <AddProductPage />
      </div>
    </AccessGate>
  );
}