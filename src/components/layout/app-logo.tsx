import { FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';

export default function AppLogo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
      <FileSpreadsheet className="h-7 w-7" />
      <span className="text-2xl font-semibold">XLSConvert</span>
    </Link>
  );
}
