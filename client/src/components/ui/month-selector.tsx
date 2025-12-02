import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { MONTHS, Month } from "@/lib/types";

export function MonthSelector() {
  const { selectedMonth, setSelectedMonth } = useStore();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Luna Curentă:</span>
      <Select value={selectedMonth} onValueChange={(v) => setSelectedMonth(v as Month)}>
        <SelectTrigger className="w-[180px] bg-background border-input">
          <SelectValue placeholder="Selectează luna" />
        </SelectTrigger>
        <SelectContent>
          {MONTHS.map((month) => (
            <SelectItem key={month} value={month}>
              {month}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
