import { AdminDashboard } from "@/features/admin/components/admin-dashboard";

type Props = {
  params: Promise<{
    locale: string;
  }>;
};

export default async function AdminPage({ params }: Props) {
  const { locale } = await params;

  return <AdminDashboard locale={locale} />;
}
