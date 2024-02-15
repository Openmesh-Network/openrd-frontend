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
  ProjectSize = "projectSize",
  TeamSize = "teamSize",
  Description = "description",

  ChainId = "chainId",
  TaskId = "taskId",

  Deadline = "deadline",
  Manager = "manager",
  DisputeManager = "disputeManager",
  Creator = "creator",
  State = "state",
  UsdValue = "usdValue",
}

export const filterFieldOptions: ComboboxOption<FilterProperty>[] = [
  {
    label: "Title",
    value: FilterProperty.Title,
  },
  {
    label: "Project size",
    value: FilterProperty.ProjectSize,
  },
  {
    label: "Team size",
    value: FilterProperty.TeamSize,
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
    label: "Task Id",
    value: FilterProperty.TaskId,
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
    label: "DisputeManager",
    value: FilterProperty.DisputeManager,
  },
  {
    label: "Creator",
    value: FilterProperty.Creator,
  },
  {
    label: "State",
    value: FilterProperty.State,
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
      return [FilterType.Equal, FilterType.Includes]
    case FilterProperty.ChainId:
    case FilterProperty.Manager:
    case FilterProperty.DisputeManager:
    case FilterProperty.Creator:
      return [FilterType.Equal, FilterType.OneOf]
    case FilterProperty.ProjectSize:
    case FilterProperty.TeamSize:
    case FilterProperty.TaskId:
    case FilterProperty.State:
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
    <div className="flex w-full">
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
