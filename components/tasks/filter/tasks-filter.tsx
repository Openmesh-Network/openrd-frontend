"use client"

import { ChangeEvent, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { Filter, ObjectFilter } from "@/openrd-indexer/api/filter"
import { FilterTasksReturn } from "@/openrd-indexer/api/return-types"
import { parseBigInt } from "@/openrd-indexer/utils/parseBigInt"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"

import { filterTasks } from "@/lib/indexer"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { ErrorWrapper } from "@/components/ui/error-wrapper"
import { Form, FormControl, FormItem, FormMessage } from "@/components/ui/form"
import { useSelectableChains } from "@/components/context/selectable-chains"

import {
  FilterControl,
  filterFieldOptions,
  FilterProperty,
  FilterString,
  filterTypeOptions,
} from "./filter-control"

function getSubfilter(
  obj: ObjectFilter,
  property: FilterProperty
): ObjectFilter {
  switch (property) {
    case FilterProperty.Title:
    case FilterProperty.ProjectSize:
    case FilterProperty.TeamSize:
    case FilterProperty.Description:
      if (!obj.cachedMetadata) {
        obj.cachedMetadata = {}
      }
      if (!obj.cachedMetadata.objectFilter) {
        obj.cachedMetadata.objectFilter = {}
      }
      return obj.cachedMetadata.objectFilter
    case FilterProperty.Tags:
      if (!obj.cachedMetadata) {
        obj.cachedMetadata = {}
      }
      if (!obj.cachedMetadata.objectFilter) {
        obj.cachedMetadata.objectFilter = {}
      }
      if (!obj.cachedMetadata.objectFilter.tags) {
        obj.cachedMetadata.objectFilter.tags = {
          some: {
            objectFilter: {},
          },
        }
      }
      if (!obj.cachedMetadata.objectFilter.tags.some?.objectFilter) {
        throw new Error("Tag filter object instantiated incorrectly.")
      }
      return obj.cachedMetadata.objectFilter.tags.some.objectFilter
    case FilterProperty.ChainId:
    case FilterProperty.TaskId:
    case FilterProperty.Deadline:
    case FilterProperty.Manager:
    case FilterProperty.DisputeManager:
    case FilterProperty.Creator:
    case FilterProperty.State:
    case FilterProperty.UsdValue:
      return obj
  }
}

function getPropertyType(
  property: FilterProperty
): "number" | "bigint" | "string" {
  switch (property) {
    case FilterProperty.Title:
    case FilterProperty.Tags:
    case FilterProperty.Description:
    case FilterProperty.Manager:
    case FilterProperty.DisputeManager:
    case FilterProperty.Creator:
      return "string"
    case FilterProperty.Deadline:
    case FilterProperty.TaskId:
      return "bigint"
    case FilterProperty.ProjectSize:
    case FilterProperty.TeamSize:
    case FilterProperty.ChainId:
    case FilterProperty.State:
    case FilterProperty.UsdValue:
      return "number"
  }
}

function applyType(
  filter: FilterString,
  type: "number" | "bigint" | "string"
): Filter {
  const parse =
    type === "number"
      ? parseInt
      : type === "bigint"
        ? parseBigInt
        : (id: string) => id
  const parsedFilter: Filter = {}
  if (filter.min) {
    const parsedValue = parse(filter.min)
    if (typeof parsedValue !== "string") {
      parsedFilter.min = parsedValue
    }
  }
  if (filter.max) {
    const parsedValue = parse(filter.max)
    if (typeof parsedValue !== "string") {
      parsedFilter.max = parsedValue
    }
  }
  if (filter.equal) {
    const parsedValue = parse(filter.equal)
    parsedFilter.equal = parsedValue
  }
  if (filter.includes) {
    const parsedValue = parse(filter.includes)
    parsedFilter.includes = parsedValue
  }
  if (filter.oneOf) {
    const parsedValue = filter.oneOf.split(",").map((item) => {
      return { equal: parse(item) }
    })
    parsedFilter.oneOf = parsedValue
  }
  return parsedFilter
}

export const formSchema = z.object({
  filter: z
    .object({
      property: z.nativeEnum(FilterProperty),
      value: z.object({
        min: z.string().optional(),
        max: z.string().optional(),
        equal: z.string().optional(),
        includes: z.string().optional(),
        oneOf: z.string().optional(),
      }),
    })
    .array(),
})

export function TasksFilter({
  onFilterApplied,
}: {
  onFilterApplied: (filtered: FilterTasksReturn) => void
}) {
  const selectableChains = useSelectableChains()
  const searchParams = useSearchParams()
  const [tasksSearchBar, setTasksSearchBar] = useState("")
  const [tagFilter, setTagFilter] = useState("")

  const defaultFilter = [
    {
      property: FilterProperty.ChainId,
      value: { oneOf: selectableChains.join(",") },
    },
    {
      property: FilterProperty.State,
      value: { equal: "0" },
    },
  ]

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      filter: defaultFilter,
    },
  })

  const lastPromise = useRef<Promise<FilterTasksReturn>>()
  async function onSubmit(values: z.infer<typeof formSchema>) {
    const getFilteredTasks = async () => {
      const prettyFilter = [...values.filter]

      if (tagFilter) {
        prettyFilter.push({
          property: FilterProperty.Tags,
          value: { equal: tagFilter },
        })
      }

      const filter = prettyFilter.reduce((acc, value) => {
        if (!value.property || Object.keys(value).length === 0) {
          // skip
          return acc
        }

        let obj = getSubfilter(acc, value.property)
        obj[value.property] = {
          ...obj[value.property],
          ...applyType(value.value, getPropertyType(value.property)),
        }
        return acc
      }, {} as ObjectFilter)

      if (tasksSearchBar) {
        if (!filter.cachedMetadata) {
          filter.cachedMetadata = {}
        }

        filter.cachedMetadata.oneOf = (
          filter.cachedMetadata.oneOf ?? []
        ).concat([
          {
            objectFilter: {
              title: {
                includes: tasksSearchBar.toLowerCase(),
                convertValueToLowercase: true,
              },
            },
          },
          {
            objectFilter: {
              description: {
                includes: tasksSearchBar.toLowerCase(),
                convertValueToLowercase: true,
              },
            },
          },
        ])
      }

      const filteredTasks = await filterTasks(filter)
      return filteredTasks
    }

    const currentPromise = getFilteredTasks()
    lastPromise.current = currentPromise
    currentPromise
      .then((filteredTasks) => {
        if (lastPromise.current !== currentPromise) {
          // New filter request has been made, ignore results from this one (otherwise risk to overwrite results of newer one; race condition)
          return
        }

        onFilterApplied(filteredTasks)
      })
      .catch(console.error)
  }

  useEffect(() => {
    // Initial get tasks (with just default filter applied)
    onSubmit(form.getValues()).catch(console.error)
  }, [tasksSearchBar, tagFilter])

  const {
    fields: filter,
    append: appendFilter,
    remove: removeFilter,
    update: updateFilter,
    replace: replaceFilter,
  } = useFieldArray({
    name: "filter",
    control: form.control,
  })

  useEffect(() => {
    const filter = [...defaultFilter]
    searchParams.forEach((value, key) => {
      const prop = key as FilterProperty
      if (!Object.values(FilterProperty).includes(prop)) {
        console.warn(`Url param ${key} is not a known filter property.`)
        return
      }

      filter.push({
        property: prop,
        value: JSON.parse(decodeURIComponent(value)),
      })
    })

    replaceFilter(filter)
    form.trigger("filter")
    onSubmit(form.getValues()).catch(console.error)
  }, [searchParams])

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <div className="flex flex-col place-content-between gap-2 md:flex-row">
          <input
            type="text"
            onChange={(e) => setTasksSearchBar(e.target.value)}
            value={tasksSearchBar}
            placeholder="Search tasks, projects"
            className="h-[35px] w-full rounded-[8px] border-[0.7px] border-[#0085FF] bg-white px-5 py-[12px] text-[14px] font-light text-[#000000] placeholder-[#9b9b9b] outline-none focus:border-primary dark:bg-opacity-10 md:h-[44px] md:text-[16px]"
          />
          <Combobox
            options={[{ label: "No Tag Filter", value: "" }].concat(
              [
                "Community Building",
                "Content Creation",
                "Marketing",
                "Technical Writing",
                "Design",
                "Animation",
                "Content Writing",
              ]
                .toSorted()
                .map((t) => {
                  return { label: t, value: t }
                })
            )}
            value={tagFilter}
            onChange={(t) => setTagFilter(t as string)}
          />
        </div>
        <AccordionTrigger className="text-xl">Filter tasks</AccordionTrigger>
        <AccordionContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormItem>
                <FormControl>
                  <div>
                    <div className="grid gap-y-[10px]">
                      {filter.map((filterItem, i) => (
                        <ErrorWrapper
                          key={i}
                          error={form.formState.errors.filter?.at?.(i)}
                        >
                          <div className="flex w-full gap-x-1 ">
                            <FilterControl
                              values={{
                                property: filterItem.property,
                                value: filterItem.value,
                              }}
                              onChange={(change) => {
                                updateFilter(i, change)
                                form.trigger("filter")
                              }}
                            />
                            <Button
                              className="my-auto ml-[5px] h-fit p-[2px]"
                              onClick={() => removeFilter(i)}
                              variant="destructive"
                            >
                              <Image
                                height={20}
                                width={20}
                                src={`/images/utils/x.svg`}
                                alt={"Remove"}
                              />
                            </Button>
                          </div>
                        </ErrorWrapper>
                      ))}
                    </div>
                    <Button
                      className="mt-[20px] h-fit px-[8px] py-[5px]"
                      onClick={() =>
                        appendFilter({
                          property: filterFieldOptions[0].value,
                          value: { [filterTypeOptions[0].value]: "" },
                        })
                      }
                    >
                      Add filter
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
              <Button type="submit">Apply filters</Button>
            </form>
          </Form>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
