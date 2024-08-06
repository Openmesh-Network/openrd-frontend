"use client"

import { ChangeEvent, Suspense, useEffect, useState } from "react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { Filter, ObjectFilter } from "@/openrd-indexer/api/filter"
import { FilterTasksReturn } from "@/openrd-indexer/api/return-types"
import { reviver } from "@/openrd-indexer/utils/json"
import { parseBigInt } from "@/openrd-indexer/utils/parseBigInt"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm, UseFormReturn } from "react-hook-form"
import { z } from "zod"

import { filterTasks } from "@/lib/indexer"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const getFilteredTasks = async () => {
      const filteredTasks = await filterTasks(
        values.filter.reduce((acc, value) => {
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
      )
      onFilterApplied(filteredTasks)
    }

    getFilteredTasks().catch(console.error)
  }

  useEffect(() => {
    // Initial get tasks (with just default filter applied)
    onSubmit(form.getValues()).catch(console.error)
  }, [])

  const handleSearchBarInput = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const value = input.value

    if (tasksSearchBar.length + value.length > 100) {
      return
    }

    setTasksSearchBar(value)

    if (value === "") {
      onSubmit(form.getValues()).catch(console.error)
    }
  }

  async function searchBarFilter(value: string) {
    const getFilteredTasks = async () => {
      const filteredTasks = await filterTasks({
        cachedMetadata: {
          oneOf: [
            {
              objectFilter: {
                title: {
                  includes: value,
                },
              },
            },
            {
              objectFilter: {
                description: {
                  includes: value,
                },
              },
            },
          ],
        },
      })
      onFilterApplied(filteredTasks)
    }

    getFilteredTasks().catch(console.error)
  }

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
        value: JSON.parse(value, reviver),
      })
    })

    replaceFilter(filter)
    form.trigger("filter")
    onSubmit(form.getValues()).catch(console.error)
  }, [searchParams])

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <input
          type="text"
          onInput={handleSearchBarInput}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              searchBarFilter(tasksSearchBar)
            }
          }}
          value={tasksSearchBar}
          placeholder="Search tasks, projects"
          className="mb-8 h-[35px] w-full rounded-[8px] border-[0.7px] border-[#0085FF] bg-white px-5 py-[12px] text-[14px] font-light text-[#000000] placeholder-[#9b9b9b] outline-none focus:border-primary dark:bg-opacity-10 md:h-[44px] md:w-[600px] md:text-[16px]"
        />
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
