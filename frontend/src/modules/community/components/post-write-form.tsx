"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/common/components/ui/button"
import { Input } from "@/common/components/ui/input"
import { ImagePlus, X, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"
import { useCreatePost } from "../hooks/use-community"
import api from "@/lib/api"
import Image from "next/image"

export function PostWriteForm() {
  const router = useRouter();
  const { user } = useAuth();
  const createPost = useCreatePost(user?.clanId);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || images.length >= 4) return;

    setIsUploading(true);
    try {
      const remaining = 4 - images.length;
      const filesToUpload = Array.from(files).slice(0, remaining);

      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await api.post("/uploads", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        setImages((prev) => [...prev, res.data.url]);
      }
    } catch {
      toast.error("이미지 업로드에 실패했습니다");
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim() && !content.trim() && images.length === 0) {
      toast.error("제목이나 내용을 입력해주세요");
      return;
    }

    try {
      const post = await createPost.mutateAsync({
        title: title.trim() || undefined,
        content: content.trim() || undefined,
        media: images.length > 0 ? images : undefined,
      });
      toast.success("게시글이 작성되었습니다");
      router.push(`/community/${post.id}`);
    } catch {
      toast.error("게시글 작성에 실패했습니다");
    }
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="제목을 입력하세요 (선택)"
        maxLength={200}
        className="bg-muted/30 border-border/50 text-lg font-bold"
      />

      {/* Content */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="내용을 입력하세요..."
        maxLength={2000}
        rows={8}
        className="w-full px-3 py-2 text-sm bg-muted/30 border border-border/50 rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 min-h-[200px]"
      />

      {/* Image Upload */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              disabled={images.length >= 4 || isUploading}
              className="hidden"
            />
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border/50 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ImagePlus className="w-4 h-4" />
              )}
              <span>이미지 추가 ({images.length}/4)</span>
            </div>
          </label>
        </div>

        {/* Image Preview */}
        {images.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {images.map((url, index) => (
              <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden">
                <Image
                  src={url}
                  alt=""
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Character Count */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>제목 {title.length}/200 | 내용 {content.length}/2000</span>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={createPost.isPending || (!title.trim() && !content.trim() && images.length === 0)}
        className="w-full h-12 text-base font-bold bg-primary text-primary-foreground"
      >
        {createPost.isPending ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          "작성하기"
        )}
      </Button>
    </div>
  );
}
