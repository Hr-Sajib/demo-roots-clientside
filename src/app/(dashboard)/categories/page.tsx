import Categories from "@/Features/Categories/CategoriesPage";
import AccessGate from "@/components/shared/AccessDenied";

export default function OrderManagement(): React.ReactElement {
    return (
        <AccessGate allowance="containerSee" label="categories">
            <div>
                <Categories />
            </div>
        </AccessGate>
    );
}