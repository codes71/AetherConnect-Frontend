"use client"

import * as React from "react"
import DatePicker from "react-datepicker"

import { cn } from "@/lib/utils"
import { Input } from "./input"

export type CalendarProps = React.ComponentProps<typeof DatePicker>

function Calendar({ className, ...props }: CalendarProps) {
  return (
    <div className={cn("p-3", className)}>
      <DatePicker
        {...props}
        customInput={<Input />}
        popperPlacement="bottom-start"
      />
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
