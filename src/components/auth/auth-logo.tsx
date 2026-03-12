import { Sparkles } from "lucide-react";

interface AuthLogoProps {
  highlightText?: string;
  className?: string;
}

export function AuthLogo({
  highlightText = "Studio",
  className,
}: AuthLogoProps) {
  return (
    <div className={`flex items-center gap-3 mb-8 ${className}`}>
      <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-primary via-primary-dark to-primary-dark flex items-center justify-center">
        <Sparkles size={22} className="text-white" />
      </div>
      <span className="text-xl font-bold text-foreground">
        Erza <span className="text-primary">{highlightText}</span>
      </span>
    </div>
  );
}
