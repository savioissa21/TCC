import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function NavItem({ icon: Icon, label, isActive, onClick }: NavItemProps) {
  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      className={cn(
        "w-full justify-start gap-3 text-slate-600 dark:text-slate-400",
        isActive && "bg-slate-100 text-slate-900 font-semibold dark:bg-slate-800 dark:text-white"
      )}
      onClick={onClick}
    >
      <Icon size={18} />
      {label}
    </Button>
  );
}