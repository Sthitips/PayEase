
export default function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}) {
  const variants = {
    primary: "bg-[#FF684F]",
    secondary: "bg-white",
    dark: "bg-[#182D43] text-white",
  };

  return (
    <button
      {...props}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-xl border-2 border-[#182D43]
        px-5 py-3 font-bold
        shadow-[4px_4px_0px_#182D43]
        transition-all duration-100
        hover:translate-x-[2px]
        hover:translate-y-[2px]
        hover:shadow-[2px_2px_0px_#182D43]
        active:translate-x-[4px]
        active:translate-y-[4px]
        active:shadow-none
        focus-visible:outline-2
        focus-visible:outline-offset-4
        focus-visible:outline-[#182D43]
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}
