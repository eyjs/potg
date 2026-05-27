"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Header } from "@/common/layouts/header"
import { Button } from "@/common/components/ui/button"
import { Input } from "@/common/components/ui/input"
import { Label } from "@/common/components/ui/label"
import { Textarea } from "@/common/components/ui/textarea"
import api from "@/lib/api"
import { handleApiError } from "@/lib/api-error"
import {
  createClanSchema,
  type CreateClanFormValues,
} from "@/modules/clan/schemas/create-clan.schema"

export default function CreateClanPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const form = useForm<CreateClanFormValues>({
    resolver: zodResolver(createClanSchema),
    mode: "onSubmit",
    defaultValues: { name: "", tag: "", description: "" },
  })
  const errors = form.formState.errors

  const onValid = async (values: CreateClanFormValues) => {
    setIsLoading(true)
    try {
      await api.post('/clans', values)
      router.push("/")
    } catch (error) {
      handleApiError(error, "클랜 생성 실패")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-8 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">클랜 생성</h1>
        <form onSubmit={form.handleSubmit(onValid)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="name">클랜 이름</Label>
            <Input id="name" {...form.register("name")} />
            {errors.name && (
              <p className="text-destructive text-xs">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="tag">클랜 태그</Label>
            <Input id="tag" maxLength={5} {...form.register("tag")} />
            {errors.tag && (
              <p className="text-destructive text-xs">{errors.tag.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea id="description" {...form.register("description")} />
            {errors.description && (
              <p className="text-destructive text-xs">
                {errors.description.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "생성 중..." : "클랜 생성"}
          </Button>
        </form>
      </main>
    </div>
  )
}
