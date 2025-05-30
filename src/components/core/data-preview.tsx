import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface DataPreviewProps {
  data: string[][];
}

export default function DataPreview({ data }: DataPreviewProps) {
  if (!data || data.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No data to display.</p>;
  }

  const maxColumns = Math.max(0, ...data.map(row => row.length));

  return (
    <ScrollArea className="w-full whitespace-nowrap rounded-md border shadow-md max-h-[500px]">
      <Table>
        <TableCaption>Preview of extracted data. Scroll horizontally if needed.</TableCaption>
        <TableHeader>
          <TableRow>
            {Array.from({ length: maxColumns }).map((_, colIndex) => (
              <TableHead key={colIndex} className="font-semibold bg-muted/50">
                Column {colIndex + 1}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, rowIndex) => (
            <TableRow key={rowIndex}>
              {Array.from({ length: maxColumns }).map((_, cellIndex) => (
                <TableCell key={cellIndex} className="min-w-[100px]">
                  {row[cellIndex] !== undefined ? row[cellIndex] : ''}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
