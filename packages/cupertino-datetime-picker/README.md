# cupertino-datetime-picker

The iOS 14+ compact date & time picker for React: an inline calendar with
month and year wheels, and time wheels that also take typing. Built for
shadcn/ui on Base UI and Tailwind v4, with no date library.

```sh
pnpm add cupertino-datetime-picker @base-ui/react
```

```css
@import "tailwindcss";
@import "cupertino-datetime-picker/styles.css";
@source "../node_modules/cupertino-datetime-picker/dist";
```

```tsx
import { DateTimePicker } from "cupertino-datetime-picker";

<DateTimePicker value={date} onChange={setDate} />;
```

Or copy the source into your project through the shadcn registry:

```sh
npx shadcn@latest add https://cupertino-datetime-picker-docs.vercel.app/r/cupertino-datetime-picker.json
```

Documentation, live demos, and the full API:
https://cupertino-datetime-picker-docs.vercel.app
