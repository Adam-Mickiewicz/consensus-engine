"use client";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function ConversationRedirect() {
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    if (params?.id) {
      sessionStorage.setItem("ce-load-conversation", params.id);
      router.replace("/debate");
    }
  }, [params?.id]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui", background: "#f5f2ec", color: "#7a7570", fontSize: 14 }}>
      Ładowanie rozmowy...
    </div>
  );
}
