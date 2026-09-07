import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { DateTimePicker } from "cupertino-datetime-picker";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { ArrowRight, Package } from "lucide-react";
import { GithubIcon } from "@/components/github-icon";
import { baseOptions, GITHUB_URL, NPM_URL, SITE_URL } from "@/lib/layout.shared";

export const Route = createFileRoute("/")({
  component: Home,
});

function eventStart(): Date {
  const date = new Date();
  date.setHours(9, 30, 0, 0);
  return date;
}

/** The iOS event editor: a "Starts" row whose pills open the panels, and the calendar inline under it. */
function Hero() {
  return (
    <div className="cdp w-[336px] max-w-full overflow-hidden rounded-[13px] bg-[var(--cdp-bg)] text-left shadow-[var(--cdp-shadow)]">
      <div className="mx-3 flex h-[52px] items-center justify-between">
        <span className="text-[17px] text-[var(--cdp-label)]">Starts</span>
        <DateTimePicker defaultValue={eventStart()} />
      </div>
      <div className="mx-3 border-t border-[var(--cdp-fill)]" />
      <DateTimePicker display="inline" defaultValue={eventStart()} />
    </div>
  );
}

function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="flex flex-1 flex-col items-center px-6 py-16 text-center sm:py-24">
        <span className="mb-6 rounded-full border border-fd-border px-4 py-1.5 text-sm text-fd-muted-foreground">
          The iOS 14+ compact picker, for the web
        </span>

        <h1 className="font-mono text-4xl font-bold tracking-tight sm:text-6xl">
          cupertino-datetime-picker
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-fd-muted-foreground">
          A date pill and a time pill. The date opens the inline calendar with month and year
          wheels; the time opens hour, minute and AM/PM wheels that also take typing. Touch, mouse,
          trackpad and keyboard. Built for shadcn/ui on Base UI and Tailwind v4, with no date
          library.
        </p>

        <div className="mt-12 flex justify-center">
          <ClientOnly fallback={<div className="h-[440px] w-[336px]" aria-hidden />}>
            <Hero />
          </ClientOnly>
        </div>

        <div className="mt-12 w-full max-w-2xl">
          <pre className="overflow-x-auto rounded-xl border border-fd-border bg-fd-secondary/40 px-5 py-4 text-left font-mono text-sm">
            <code>
              <span className="text-fd-muted-foreground select-none">$ </span>
              npx shadcn@latest add {SITE_URL}/r/cupertino-datetime-picker.json
            </code>
          </pre>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/docs/$"
            params={{ _splat: "" }}
            className="inline-flex items-center gap-2 rounded-lg bg-fd-primary px-5 py-2.5 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90"
          >
            Read the docs
            <ArrowRight className="size-4" />
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-fd-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-fd-accent"
          >
            <GithubIcon className="size-4" />
            GitHub
          </a>
          <a
            href={NPM_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-fd-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-fd-accent"
          >
            <Package className="size-4" />
            npm
          </a>
        </div>

        <p className="mt-16 max-w-xl text-sm text-fd-muted-foreground">
          The source lands in your project under <code>components/ui/cupertino/</code>, the way
          shadcn/ui components do. Wheels are native scroll with snap points, so flings are the
          platform&apos;s own; every wheel is a spinbutton and the calendar a grid.
        </p>
      </main>
    </HomeLayout>
  );
}
