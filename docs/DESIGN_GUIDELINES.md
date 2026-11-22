# LifeStack — Design Guidelines

## Visual system

LifeStack uses a dark navy canvas, layered translucent surfaces, and restrained red accents. Keep text readable against glass surfaces and use borders and contrast to distinguish controls from information.

### Shared tokens

The source of truth is `frontend/src/styles/index.css` and `frontend/tailwind.config.js`. Current CSS variables include:

| Token | Use |
|---|---|
| `--color-canvas` / `--color-canvas-raised` | App background and raised regions |
| `--color-glass` / `--color-glass-raised` / `--color-glass-hover` | Layered panels and interactive surfaces |
| `--color-border` / `--color-border-strong` | Surface edges and control boundaries |
| `--color-text` / `--color-text-muted` / `--color-text-subtle` | Readable content hierarchy |
| `--color-navy-accent` / `--color-navy-accent-soft` | Primary interaction and progress emphasis |
| `--color-red-accent` / `--color-red-accent-soft` | Secondary emphasis, destructive actions, and status |
| `--glass-blur`, `--glass-shadow`, `--glass-highlight` | Frosted surface depth |

Use the navy and red color families. Avoid introducing unrelated accent families or low-contrast text. Feature-specific styling should be scoped to that feature; shared tokens belong in the global system.

## Layout and responsiveness

- The app shell tracks the browser's dynamic viewport. The top navigation stays compact and the content area receives the remaining height.
- Pages use the available width rather than a narrow centered column. At smaller widths, grids collapse, controls wrap, and long content scrolls within the page.
- Avoid fixed viewport-height calculations tied to an assumed navbar size. Let the app shell provide available height; content should scroll instead of being clipped.
- Preserve keyboard focus visibility, semantic headings, labels, button types, and accessible names.
- Use responsive grids for summaries and charts. Charts need text legends or labels in addition to color.

## Glass surfaces and controls

- Use subtle translucency, blur, a fine border, and soft shadow to establish layers. Keep blur restrained enough that text and controls remain clear.
- Use shared `hud-surface`, `floating-glass-panel`, `hud-page-header`, `hud-section-nav`, and `hud-action-button` primitives where they fit.
- Style actions as buttons. Destructive actions should remain visually distinct and require confirmation where data deletion is consequential.
- Progress indicators should include a readable value and accessible label; color alone must not carry meaning.

## Charts

- Current Study and Projects charts are SVG/CSS presentations of derived feature metrics; they do not use a charting dependency.
- Add an accessible text alternative or visible legend for pie charts, and expose progress values for bar charts.
- Clearly label present-state charts. Do not imply historical trends until dated snapshots or event history support them.

## Motion

Use short, subtle transitions for hover and progress changes. Respect `prefers-reduced-motion`; avoid animation that obscures data or delays control response.
