"use client"

// Lightweight wrapper around sonner toaster used by shadcn/ui setups.
// Note: ensure `sonner` is added to package.json (npm i sonner) in the project.
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner'

export const Toaster = () => {
  return <SonnerToaster position="top-right" />
}

export const toast = sonnerToast

export default toast
