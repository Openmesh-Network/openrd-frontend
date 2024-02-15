import * as React from "react"
import LinkPrimitive from "next/link"

export interface LinkProps
  extends Omit<React.ComponentPropsWithoutRef<typeof LinkPrimitive>, "href"> {
  href?: string
}

const Link = React.forwardRef<
  React.ElementRef<typeof LinkPrimitive>,
  LinkProps
>(({ href, children, ...props }, ref) => (
  <div>
    {href !== undefined ? (
      <LinkPrimitive ref={ref} href={href} {...props}>
        {children}
      </LinkPrimitive>
    ) : (
      <span ref={ref} {...props}>
        {children}
      </span>
    )}
  </div>
))
Link.displayName = LinkPrimitive.displayName

export { Link }
