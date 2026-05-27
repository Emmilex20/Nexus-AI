import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <SignIn
      routing="path"
      path="/sign-in"
      signUpUrl="/sign-up"
      fallbackRedirectUrl="/dashboard"
      appearance={{
        elements: {
          rootBox: "mx-auto",
          cardBox:
            "rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/30 backdrop-blur",
          card: "bg-transparent shadow-none",
          headerTitle: "text-white",
          headerSubtitle: "text-slate-400",
          socialButtonsBlockButton:
            "border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]",
          formFieldLabel: "text-slate-300",
          formFieldInput:
            "rounded-2xl border-white/10 bg-slate-950/70 text-white placeholder:text-slate-500",
          formButtonPrimary:
            "rounded-2xl bg-violet-500 text-white hover:bg-violet-400",
          footerActionText: "text-slate-400",
          footerActionLink: "text-violet-300 hover:text-violet-200",
        },
      }}
    />
  );
}
