export default function Timeline() {
  const items = [
    {
      date: "6:30 PM (AEDT)\n9th October",
      description: "Public Announcement",
    },
    {
      date: "6:30 PM (AEDT)\n9th October",
      description: "Whitelisting starts",
    },
    {
      date: "11:59 PM (AEDT)\n11th October",
      description: "Whitelisting closes",
    },
    {
      date: "During\n12th October",
      description: "Distribution",
    },
    {
      date: "6 PM (AEDT)\n12th October",
      description: "Special Community Event",
    },
  ]

  return (
    <div>
      <ol className="w-full items-center justify-center md:flex">
        {items.map((item, i) => (
          <li key={i} className="relative mb-6 grow md:mb-0">
            <div className="flex items-center">
              <div className="z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-100 ring-0 ring-white dark:bg-blue-900 dark:ring-gray-900 md:ring-8">
                <svg
                  className="size-2.5 text-blue-800 dark:text-blue-300"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M20 4a2 2 0 0 0-2-2h-2V1a1 1 0 0 0-2 0v1h-3V1a1 1 0 0 0-2 0v1H6V1a1 1 0 0 0-2 0v1H2a2 2 0 0 0-2 2v2h20V4ZM0 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8H0v10Zm5-8h10a1 1 0 0 1 0 2H5a1 1 0 0 1 0-2Z" />
                </svg>
              </div>
              <div className="flex h-0.5 w-full bg-gray-200 dark:bg-gray-700"></div>
            </div>
            <div className="mt-3 md:pe-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white whitespace-pre-line">
                {item.date}
              </h3>
              <p className="text-base font-normal text-gray-500 dark:text-gray-400">
                {item.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
