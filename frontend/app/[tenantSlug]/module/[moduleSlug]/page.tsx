"use client";

import { notFound, useParams } from "next/navigation";
import { FinanceWorkspace } from "../../../../components/app/ScreenshotWorkspaces";

export default function ModulePage() {
  const params = useParams<{ moduleSlug: string }>();

  if (params.moduleSlug === "finance") {
    return <FinanceWorkspace />;
  }

  notFound();
}
