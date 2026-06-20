"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z.object({
  customerType: z.enum([
    "RESIDENTIAL", "COMMERCIAL", "PROPERTY_MANAGEMENT",
    "HOTEL", "DORMITORY", "ASSISTED_LIVING", "GOVERNMENT", "OTHER",
  ]),
  companyName: z.string().optional(),
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  altPhone: z.string().optional(),
  billingAddressLine1: z.string().optional(),
  billingAddressLine2: z.string().optional(),
  billingCity: z.string().optional(),
  billingState: z.string().optional(),
  billingZip: z.string().optional(),
  notes: z.string().optional(),
  referralSource: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface CustomerFormProps {
  defaultValues?: Partial<FormData>;
  customerId?: string;
}

export function CustomerForm({ defaultValues, customerId }: CustomerFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerType: "RESIDENTIAL",
      ...defaultValues,
    },
  });

  const customerType = watch("customerType");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const url = customerId ? `/api/customers/${customerId}` : "/api/customers";
      const method = customerId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save customer");
      }

      const result = await res.json();
      toast.success(customerId ? "Customer updated" : "Customer created");
      router.push(`/customers/${result.data.id}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const isCommercial = customerType !== "RESIDENTIAL";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={customerType}
            onValueChange={(v) => setValue("customerType", v as FormData["customerType"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="RESIDENTIAL">Residential</SelectItem>
              <SelectItem value="COMMERCIAL">Commercial</SelectItem>
              <SelectItem value="PROPERTY_MANAGEMENT">Property Management</SelectItem>
              <SelectItem value="HOTEL">Hotel / Hospitality</SelectItem>
              <SelectItem value="DORMITORY">Dormitory / University</SelectItem>
              <SelectItem value="ASSISTED_LIVING">Assisted Living / Care Facility</SelectItem>
              <SelectItem value="GOVERNMENT">Government</SelectItem>
              <SelectItem value="OTHER">Other</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {isCommercial && (
            <div className="sm:col-span-2 space-y-1.5">
              <Label>Company / Organization Name</Label>
              <Input {...register("companyName")} placeholder="Acme Property Management" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>First Name *</Label>
            <Input {...register("firstName")} placeholder="John" />
            {errors.firstName && <p className="text-xs text-red-500">{errors.firstName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Last Name *</Label>
            <Input {...register("lastName")} placeholder="Smith" />
            {errors.lastName && <p className="text-xs text-red-500">{errors.lastName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input {...register("email")} type="email" placeholder="john@example.com" />
            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input {...register("phone")} type="tel" placeholder="(555) 123-4567" />
          </div>
          <div className="space-y-1.5">
            <Label>Alt Phone</Label>
            <Input {...register("altPhone")} type="tel" placeholder="(555) 987-6543" />
          </div>
          <div className="space-y-1.5">
            <Label>Referral Source</Label>
            <Input {...register("referralSource")} placeholder="Google, referral, etc." />
          </div>
        </CardContent>
      </Card>

      {/* Billing Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing Address</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Street Address</Label>
            <Input {...register("billingAddressLine1")} placeholder="123 Main St" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Address Line 2</Label>
            <Input {...register("billingAddressLine2")} placeholder="Apt, Suite, etc." />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input {...register("billingCity")} placeholder="Chicago" />
          </div>
          <div className="space-y-1.5">
            <Label>State</Label>
            <Input {...register("billingState")} placeholder="IL" maxLength={2} />
          </div>
          <div className="space-y-1.5">
            <Label>ZIP Code</Label>
            <Input {...register("billingZip")} placeholder="60601" />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register("notes")}
            placeholder="Any special instructions, preferences, or notes about this customer..."
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" loading={loading} className="flex-1 sm:flex-none">
          {customerId ? "Update Customer" : "Create Customer"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
