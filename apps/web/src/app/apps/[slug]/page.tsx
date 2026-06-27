'use client';

import { notFound } from 'next/navigation';
import { ModuleAppFrame } from '@/components/apps/ModuleAppFrame';
import { VentureConnectFrame } from '@/components/apps/VentureConnectFrame';
import { isVentureAppSlug, slugToModuleId } from '@bellasos/contracts';

type Props = {
  params: { slug: string };
  searchParams: { project?: string };
};

export default function AppSlugPage({ params, searchParams }: Props) {
  const { slug } = params;

  if (isVentureAppSlug(slug)) {
    return <VentureConnectFrame ventureId={slug} />;
  }

  const moduleId = slugToModuleId(slug);
  if (!moduleId) {
    notFound();
  }

  return (
    <ModuleAppFrame moduleId={moduleId} initialProjectId={searchParams.project ?? null} />
  );
}
