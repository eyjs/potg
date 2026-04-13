"use client"

import { Share2 } from "lucide-react"
import { Button } from "@/common/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface ShareButtonProps {
  url?: string;
  successMessage?: string;
  className?: string;
}

export function ShareButton({
  url,
  successMessage = "링크가 복사되었습니다",
  className,
}: ShareButtonProps) {
  const handleShare = async () => {
    const shareUrl = url || window.location.href;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(successMessage);
    } catch {
      // Fallback for environments where clipboard API is not available
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      toast.success(successMessage);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className={cn(
        "gap-2 text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <Share2 className="w-4 h-4" />
      <span>공유</span>
    </Button>
  );
}
