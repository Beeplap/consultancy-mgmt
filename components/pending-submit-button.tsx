"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { ComponentProps, ReactNode } from "react";

type PendingSubmitButtonProps = ComponentProps<typeof Button> & {
  pendingChildren?: ReactNode;
};

export function PendingSubmitButton({
  children,
  pendingChildren,
  disabled,
  onClick,
  ...props
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      {...props}
      disabled={disabled || pending}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;

        if (event.currentTarget.form && !event.currentTarget.form.checkValidity()) return;
      }}
    >
      {pending ? pendingChildren ?? children : children}
    </Button>
  );
}
