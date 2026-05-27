"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";

import { cn } from "@/lib/utils";

const Collapsible = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

export { Collapsible, CollapsibleTrigger, CollapsibleContent };

/** Ensures expanded planner sections stay visible across browsers. */
export function CollapsiblePanel({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof CollapsiblePrimitive.CollapsibleContent>) {
  return (
    <CollapsibleContent
      className={cn("overflow-hidden data-[state=closed]:hidden data-[state=open]:block", className)}
      {...props}
    />
  );
}
