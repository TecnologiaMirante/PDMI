import { Toaster as Sonner } from "sonner";

function Toaster({ ...props }) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      duration={1200}
      closeButton
      swipeDirections={["right", "left", "up"]}
      toastOptions={{
        classNames: {
          closeButton: [
            "!left-auto !right-2 !top-1/2 !-translate-y-1/2 !translate-x-0",
            "!w-5 !h-5 !rounded-full !border-0",
            "!bg-black/10 hover:!bg-black/20",
            "!text-current opacity-60 hover:opacity-100",
            "transition-opacity duration-150",
          ].join(" "),
        },
      }}
      style={{
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)",
      }}
      {...props}
    />
  );
}

export { Toaster };
