// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 WC3 Roadmap contributors
import * as React from "react"
import { Circle } from "lucide-react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

import { cn } from "#/lib/utils"

/**
 * shadcn-style RadioGroup root.
 *
 * Wraps Radix RadioGroup.Root — provides role="radiogroup", aria-required,
 * and arrow-key navigation natively.
 */
function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
      {...props}
    />
  )
}

/**
 * shadcn-style RadioGroupItem.
 *
 * Wraps Radix RadioGroup.Item — renders role="radio", aria-checked, and
 * keyboard focus. Pair with a plain <label htmlFor={id}> (not the shadcn
 * Label component) for accessible option labelling.
 */
function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        "aspect-square size-4 shrink-0 rounded-full border border-input text-primary shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
        <Circle className="size-2.5 fill-current text-current" />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
