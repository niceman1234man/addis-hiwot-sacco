export default function Button({ children, variant = "primary", className = "", ...props }) {
  return (
    <button className={`button-${variant}${className ? ` ${className}` : ""}`} {...props}>
      {children}
    </button>
  );
}