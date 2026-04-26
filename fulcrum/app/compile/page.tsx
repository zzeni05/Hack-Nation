"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function CompileRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/demo");
  }, [router]);

  return <main className="min-h-screen bg-paper" />;
}
