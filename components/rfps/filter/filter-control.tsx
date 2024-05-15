"use client"

import { Combobox, ComboboxOption } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"

export interface FilterString {
  min?: string
  max?: string
  equal?: string
  includes?: string
  oneOf?: string
}

export interface IFilterValues {
  property: FilterProperty
  value: FilterString
}

export enum FilterProperty {
  Title = "title",
  // Tags = "tags",
  MaxProjectFunding = "maxProjectFunding",
  MaxAwardedProjects = "maxAwardedProjects",
  Description = "description",

  ChainId = "chainId",
  RFPId = "rfpId",

  Deadline = "deadline",
  Manager = "manager",
  TaskManager = "taskManager",
  DisputeManager = "disputeManager",
  Creator = "creator",
  UsdValue = "usdValue",
}

export const filterFieldOptions: ComboboxOption<FilterProperty>[] = [
  {
    label: "Title",
    value: FilterProperty.Title,
  },
  {
    label: "Max Project Funding",
    value: FilterProperty.MaxProjectFunding,
  },
  {
    label: "Max Awarded Projects",
    value: FilterProperty.MaxAwardedProjects,
  },
  {
    label: "Description",
    value: FilterProperty.Description,
  },
  {
    label: "Chain",
    value: FilterProperty.ChainId,
  },
  {
    label: "RFP Id",
    value: FilterProperty.RFPId,
  },
  {
    label: "Deadline",
    value: FilterProperty.Deadline,
  },
  {
    label: "Manager",
    value: FilterProperty.Manager,
  },
  {
    label: "Task Manager",
    value: FilterProperty.TaskManager,
  },
  {
    label: "DisputeManager",
    value: FilterProperty.DisputeManager,
  },
  {
    label: "Creator",
    value: FilterProperty.Creator,
  },
  {
    label: "Usd value",
    value: FilterProperty.UsdValue,
  },
]

export enum FilterType {
  Equal = "equal",
  Includes = "includes",
  OneOf = "oneOf",
  Min = "min",
  Max = "max",
}

export const filterTypeOptions: ComboboxOption<FilterType>[] = [
  {
    label: "is equal to",
    value: FilterType.Equal,
  },
  {
    label: "includes",
    value: FilterType.Includes,
  },
  {
    label: "is one of",
    value: FilterType.OneOf,
  },
  {
    label: "is at least",
    value: FilterType.Min,
  },
  {
    label: "is at most",
    value: FilterType.Max,
  },
]

function validFilterTypes(property: FilterProperty): FilterType[] {
  switch (property) {
    case FilterProperty.Title:
    case FilterProperty.Description:
    case FilterProperty.MaxProjectFunding:
      return [FilterType.Equal, FilterType.Includes]
    case FilterProperty.ChainId:
    case FilterProperty.Manager:
    case FilterProperty.TaskManager:
    case FilterProperty.DisputeManager:
    case FilterProperty.Creator:
      return [FilterType.Equal, FilterType.OneOf]
    case FilterProperty.MaxAwardedProjects:
    case FilterProperty.RFPId:
      return [
        FilterType.Equal,
        FilterType.OneOf,
        FilterType.Min,
        FilterType.Max,
      ]
    case FilterProperty.Deadline:
    case FilterProperty.UsdValue:
      return [FilterType.Equal, FilterType.Min, FilterType.Max]
  }
}

export function FilterControl({
  values,
  onChange,
}: {
  values: IFilterValues
  onChange: (control: IFilterValues) => void
}) {
  return (
    <div className="flex w-full gap-x-[15px]">
      <Combobox
        options={filterFieldOptions}
        value={values.property}
        onChange={(rawOption) => {
          const option = rawOption as FilterProperty
          onChange({
            ...values,
            property: option,
          })
        }}
      />
      <Combobox
        options={filterTypeOptions.filter((type) =>
          validFilterTypes(values.property).includes(type.value)
        )}
        value={Object.keys(values.value)[0]}
        onChange={(change) => {
          onChange({
            ...values,
            value: {
              [change as string]: Object.values(values.value)[0],
            },
          })
        }}
      />
      <Input
        value={Object.values(values.value)[0]}
        onChange={(change) =>
          onChange({
            ...values,
            value: {
              [Object.keys(values.value)[0]]: change.target.value,
            },
          })
        }
      />
    </div>
  )
}
