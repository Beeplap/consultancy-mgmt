"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type ConfirmSubmitButtonProps = {
  children: ReactNode;
  message: string;
  className?: string;
};

export function ConfirmSubmitButton({ children, message, className = "" }: ConfirmSubmitButtonProps) {
  return (
    <Button
      type="submit"
      variant="danger"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </Button>
  );
}
