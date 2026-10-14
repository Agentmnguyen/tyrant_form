# 1453 Event Roster Style Guide

This guide documents the shared visual system found in the SVS Prep app and the Tundra Arms League app. Use it for the 1453 Event Roster without carrying over unrelated event-specific business logic.

## Core Feel

- Mobile-first, game-operations interface with a dark arctic/war-room mood.
- Dense but orderly screens: compact panels, sharp hierarchy, short labels, and large tap targets.
- Cyan is the main action/accent color, green indicates success/open/synced states, gold indicates warning or attention states, and red indicates destructive/error states.
- Keep the first screen functional and app-like, not a marketing landing page.

## Colors

```css
--bg: #06101c;
--bg-2: #0a1a2b;
--panel: rgba(10, 25, 42, 0.9);
--panel-2: rgba(13, 35, 56, 0.92);
--line: rgba(137, 223, 255, 0.18);
--line-strong: rgba(137, 223, 255, 0.34);
--text: #f6fbff;
--muted: #9fb8c8;
--blue: #43d7ff;
--blue-2: #149fd1;
--green: #60f3b4;
--gold: #ffc857;
--red: #ff7b72;
--focus: rgba(67, 215, 255, 0.24);
```

Use layered navy backgrounds with a subtle cyan radial glow near the top. Avoid white surfaces, large purple gradients, beige palettes, and purely decorative blobs.

## Typography

- Font stack: `Arial, Helvetica, sans-serif`.
- Body copy uses tight, readable line-height around `1.42` to `1.48`.
- Headings, labels, buttons, chips, and table headers are heavy, usually `font-weight: 900`.
- Hero `h1`: `clamp(34px, 9vw, 60px)`, tight line-height, centered, with dark shadow and soft cyan glow.
- Section `h2`: `clamp(24px, 6vw, 34px)`.
- Letter spacing stays `0`, except small uppercase eyebrow labels may use slight positive spacing.

## Spacing, Radius, Borders, Shadows

- App shell: centered, max width around `1260px`; narrow signup flow around `760px`.
- Mobile padding: `14px 12px 42px`; desktop padding: `28px 20px 52px`.
- Gap rhythm: `8px`, `10px`, `12px`, `14px`, `16px`.
- Border radius: `8px` for panels, buttons, inputs, cards, and choices; `999px` only for pills/chips/progress tracks.
- Borders are thin cyan-tinted lines, usually `rgba(137, 223, 255, 0.18)`.
- Panels use translucent navy fills, a faint top highlight, and black depth shadows.
- Cyan glow is reserved for primary buttons, selected choices, focus rings, and progress bars.

## Layout Patterns

- Public forms use a narrow centered shell, framed banner hero, sticky progress card, stacked panel steps, and sticky mobile wizard actions.
- Admin uses a wide shell, event control panel, metric summary grid, filter controls, sort row, and dense participation cards/tables.
- Responsive grids collapse to one column on small screens.
- Cards are used for repeated items and contained tools only; avoid cards nested inside cards.

## Reusable Components

- `Hero`: framed image/banner plus centered title, supporting copy, and optional pill.
- `Panel`: bordered translucent navy section with optional eyebrow/title/action header.
- `ProgressCard`: sticky step label plus cyan-to-green progress bar.
- `Field`, `TextInput`, `SelectField`: full-width controls with dark fills and cyan focus state.
- `ChoiceToggle`: large selected/unselected tap target with check icon.
- `Button`: primary, secondary, danger, and small variants, usually with lucide icons.
- `StatCard`: compact metrics with default/warning/success tones.
- `Badge`, `Chip`, `Pill`: rounded status indicators for alliances, sync state, event state, and compact answers.
- `SubmissionCard`/`TablePanel`: dense admin records with sticky headers or compact key/value grids.

## Controls

- Buttons are `inline-flex`, min-height `52px`, 8px radius, 8px icon gap, heavy text, and press down slightly on active state.
- Primary buttons use a cyan vertical gradient and near-black text.
- Secondary buttons use a dark blue fill with cyan border.
- Danger buttons use red-tinted border/background and red text.
- Inputs and selects are full-width, min-height `52px`, dark fill, cyan border, and 4px cyan focus ring.
- Selects use CSS chevrons instead of default browser chrome.
- Choice tiles use blue gradient and glow when selected.
- Checkbox cards are two-column grids with a visible checkbox and explanatory label block.

## Tables And Admin Lists

- Tables are information-dense with sticky dark headers, uppercase header labels, `10px` cell padding, zebra rows, and horizontal scroll.
- Admin records favor responsive participation cards with compact `mini-kv` cells for mobile readability.
- Filters use grid layouts with icon-wrapped search inputs and select controls.
- Sort controls are small secondary/primary buttons in a wrapping row.

## Animation And Interaction

- Step transitions fade/slide in over about `180ms ease`.
- Progress width animates over about `220ms ease`.
- Button active state uses `translateY(1px) scale(0.99)`.
- Focus states are prominent and accessible.
- Motion stays subtle and functional; no large decorative animation.
