import { VialForm } from "@/components/vials/vial-form";

export const metadata = { title: "Add Vial" };

export default function NewVialPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Add Vial</h1>
      <VialForm />
    </div>
  );
}
