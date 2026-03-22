import { Suspense } from "react";
import ClientsView from "./ClientsView";

export const dynamic = 'force-dynamic';

export default function CrmClientsPage() {
  return (
    <Suspense>
      <ClientsView />
    </Suspense>
  );
}
