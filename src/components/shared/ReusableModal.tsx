// components/ReusableModal.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ReusableModalProps } from "@/types";

export function ReusableModal({
  open,
  onOpenChange,
  trigger,
  title,
  children,
}: ReusableModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="!max-w-7xl w-full h-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {/* <DialogClose asChild>
            <button className="absolute right-4 top-4 text-gray-500 hover:text-gray-700">
              ×
            </button>
          </DialogClose> */}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
