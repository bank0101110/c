import { siteConfig } from "@/lib/site-config";
import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="border-b border-border bg-muted/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-4 px-4 py-16 text-center sm:px-6 sm:py-24">
        <Badge variant="outline">{siteConfig.hero.eyebrow}</Badge>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
          {siteConfig.hero.title}
        </h1>
        <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
          {siteConfig.hero.subtitle}
        </p>
      </div>
    </section>
  );
}
