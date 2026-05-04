"use client";

import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type PendingSubmitButtonProps = ComponentProps<typeof Button> & {
  pendingChildren?: ReactNode;
  cooldownMs?: number;
};

export function PendingSubmitButton({
  children,
  pendingChildren,
  cooldownMs = 1500,
  disabled,
  onClick,
  ...props
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();
  const lockedRef = useRef(false);
  const [coolingDown, setCoolingDown] = useState(false);

  useEffect(() => {
    if (pending) {
      lockedRef.current = true;
      return;
    }

    if (!lockedRef.current) return;

    const timer = window.setTimeout(() => {
      lockedRef.current = false;
      setCoolingDown(false);
    }, cooldownMs);

    return () => window.clearTimeout(timer);
  }, [cooldownMs, pending]);

  const isDisabled = disabled || pending || coolingDown;

  return (
    <Button
      {...props}
      disabled={isDisabled}
      onClick={(event) => {
        if (lockedRef.current || pending || coolingDown) {
          event.preventDefault();
          return;
        }

        onClick?.(event);
        if (event.defaultPrevented) return;

        if (event.currentTarget.form && !event.currentTarget.form.checkValidity()) return;

        lockedRef.current = true;
        setCoolingDown(true);
      }}
    >
      {pending ? pendingChildren ?? children : children}
    </Button>
  );
}
