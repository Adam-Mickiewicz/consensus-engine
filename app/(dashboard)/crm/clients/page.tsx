import { Suspense } from "react";
import ClientsView from "./ClientsView";
import GlobalCRMFilters from "@/components/crm/GlobalCRMFilters";

export const dynamic = 'force-dynamic';

export default function CrmClientsPage() {
  return (
    <Suspense fallback={null}>
      <GlobalCRMFilters />
      <ClientsView />
    </Suspense>
  );
}
