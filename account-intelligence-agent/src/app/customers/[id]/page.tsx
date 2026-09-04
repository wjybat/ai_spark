import { CustomerWorkspace } from "@/components/customer-workspace";
export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  return <CustomerWorkspace initialCustomerId={(await params).id} />;
}
