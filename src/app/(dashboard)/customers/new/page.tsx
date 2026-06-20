import { CustomerForm } from "@/components/customers/customer-form";

export const metadata = { title: "New Customer" };

export default function NewCustomerPage() {
  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Add Customer</h1>
        <p className="text-slate-500 text-sm mt-1">Create a new customer record</p>
      </div>
      <CustomerForm />
    </div>
  );
}
