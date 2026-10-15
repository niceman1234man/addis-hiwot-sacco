import { ClerkProvider } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { useNavigate } from "react-router-dom";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkPublishableKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBasePath(path) {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const appearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside",
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/favicon.svg`,
  },
  variables: {
    colorPrimary: "#214c3b",
    colorForeground: "#19392e",
    colorMutedForeground: "#6e786d",
    colorDanger: "#a45d43",
    colorBackground: "#fbfaf5",
    colorInput: "#fffef9",
    colorInputForeground: "#19392e",
    colorNeutral: "#dedecf",
    fontFamily: '"DM Sans", sans-serif',
    borderRadius: "3px",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#fbfaf5] rounded-[3px] max-w-full w-[440px] overflow-hidden shadow-xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: { color: "#19392e", fontFamily: '"Manrope", sans-serif' },
    headerSubtitle: { color: "#6e786d" },
    formFieldLabel: { color: "#42574a" },
    formFieldInput: {
      borderColor: "#d9ddcf",
      borderRadius: "3px",
      backgroundColor: "#fffef9",
      color: "#19392e",
    },
    formButtonPrimary: {
      backgroundColor: "#214c3b",
      color: "#fffaf0",
      borderRadius: "3px",
    },
  },
};

export default function ClerkAuthProvider({ children }) {
  const navigate = useNavigate();

  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey}
      proxyUrl={clerkProxyUrl}
      appearance={appearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Staff sign in",
            subtitle: "Sign in to manage Addis Hiwot staff accounts.",
          },
        },
        signUp: {
          start: {
            title: "Accept your staff invitation",
            subtitle: "Create your account to access the staff portal.",
          },
        },
      }}
      routerPush={(to) => navigate(stripBasePath(to))}
      routerReplace={(to) => navigate(stripBasePath(to), { replace: true })}
    >
      {children}
    </ClerkProvider>
  );
}
