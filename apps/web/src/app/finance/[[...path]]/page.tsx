import { FinanceAppFrame } from '@/components/finance/FinanceAppFrame';

type Props = {
  params: { path?: string[] };
};

export default function FinancePage({ params }: Props) {
  return <FinanceAppFrame pathSegments={params.path ?? []} />;
}
