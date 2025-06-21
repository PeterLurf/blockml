// Declarations for optional UI/helper libraries that are not part of the core runtime
// but are imported by generated shadcn components. We provide minimal `any` typings so
// the project can compile even when the packages are not installed.

declare module "next-themes" {
  export const ThemeProvider: any
  export type ThemeProviderProps = any
  export const useTheme: any
}

declare module "@radix-ui/react-aspect-ratio" {
  const anything: any
  export = anything
}

declare module "@radix-ui/react-navigation-menu" {
  const anything: any
  export = anything
}

declare module "@radix-ui/react-context-menu" {
  const anything: any
  export = anything
}

declare module "@radix-ui/react-radio-group" {
  const anything: any
  export = anything
}

declare module "@radix-ui/react-resizable" {
  const anything: any
  export = anything
}

declare module "@radix-ui/react-menubar" {
  const anything: any
  export = anything
}

declare module "@radix-ui/react-toggle-group" {
  const anything: any
  export = anything
}

declare module "@radix-ui/react-toggle" {
  const anything: any
  export = anything
}

declare module "react-day-picker" {
  export const DayPicker: any
}

declare module "embla-carousel-react" {
  const useEmblaCarousel: any
  export default useEmblaCarousel
  export type UseEmblaCarouselType = any
}

declare module "cmdk" {
  export const Command: any
}

declare module "vaul" {
  export const Drawer: any
}

declare module "sonner" {
  export const Toaster: any
}

declare module "clsx" {
  export function clsx(...args: any[]): string
  export type ClassValue = any
}

declare module "tailwind-merge" {
  export function twMerge(...args: any[]): string
}

declare module "tailwindcss" {
  export type Config = any
}

declare module "tailwindcss-animate" {
  const plugin: any
  export default plugin
}

declare module "react-hook-form" {
  export const Controller: any
  export type ControllerProps<T extends any = any, U extends any = any> = any
  export type FieldPath<T extends any = any> = any
  export type FieldValues = any
  export const FormProvider: any
  export const useFormContext: any
}

declare module "react-resizable-panels" {
  export const PanelGroup: any
  export const Panel: any
  export const PanelResizeHandle: any
}

declare module "react" {
  const anything: any
  export = anything
}

declare module "class-variance-authority" {
  export const cva: any
  export type VariantProps<T extends any = any> = any
}

declare module "@radix-ui/react-tooltip" {
  const anything: any
  export = anything
}

declare module "zustand" {
  export const create: any
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any
  }
}
