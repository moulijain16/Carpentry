import { notFound } from "next/navigation";
import EnquiryDetail from "@/components/EnquiryDetail";
import { getEnquiry, statusHistory } from "@/lib/enquiries";

export const dynamic = "force-dynamic";

export default async function EnquiryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;

  const enquiryId = Number(id);
  if (!Number.isInteger(enquiryId)) notFound();

  const enquiry = getEnquiry(enquiryId);
  if (!enquiry) notFound();

  return (
    <EnquiryDetail
      initialEnquiry={enquiry}
      initialHistory={statusHistory(enquiryId)}
      startInEdit={edit === "1"}
    />
  );
}
