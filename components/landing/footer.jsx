import { siteConfig } from "@/lib/site-config";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-6 text-sm text-muted-foreground sm:px-6">
        {siteConfig.footer.text}
      </div>
    </footer>
  );
}
