import type { ReactNode } from "react";
import { ToastProvider, ToastViewport } from "@/components/ui/toast";

type ToasterProps = {
  children: ReactNode;
};

export default function Toaster({ children }: ToasterProps) {
  return (
    <ToastProvider>
      {children}
      <ToastViewport />
    </ToastProvider>
  );
}
