# LifeStack — Design Guidelines & Visual Language

## 1. Visual Language & Atmosphere

LifeStack adheres to a **premium futuristic design language** characterized by depth, translucency, and biophilic-digital elegance. The aesthetic mimics a cutting-edge cognitive interface rather than a generic productivity SaaS tool.

### Color Palette

| Token Name | Hex Code | Purpose |
|------------|----------|---------|
| `space-dark` | `#050811` | Deepest root background |
| `navy-dark` | `#0a0f1d` | Primary interface canvas background |
| `navy-card` | `#11182c` | Surface base for glass panels |
| `cyan-glow` | `#00f2fe` | Primary energetic accent & active state indicator |
| `blue-soft` | `#38bdf8` | Secondary informational highlights & links |
| `violet-core` | `#8b5cf6` | Neural pathways, creative focus, secondary accents |
| `gold-accent` | `#f59e0b` | High-priority badges, achievements, streaks |
| `text-primary` | `#f8fafc` | Primary text content |
| `text-secondary` | `#94a3b8` | Subtext, labels, metadata |
| `text-muted` | `#64748b` | Disabled or quiet indicators |

### Glassmorphism & Translucency
- **Backgrounds:** `rgba(15, 23, 42, 0.65)` to `rgba(10, 15, 29, 0.75)`
- **Backdrop Blur:** `backdrop-blur-md` (8px–12px blur)
- **Borders:** Subtle 1px translucent borders (`border-white/10` or `border-cyan-500/20`) with gradient light catches.
- **Shadows:** Diffuse ambient glow (`box-shadow: 0 0 25px rgba(0, 242, 254, 0.08)`).

## 2. Layout & Spatial Composition

### Core Architecture Rules
1. **Zero Sidebar Policy:** There is strictly **NO left sidebar**. A standard sidebar breaks the symmetrical harmony required by the central neural core.
2. **Compact Top Toolbar:** Persistent, ultra-compact floating toolbar positioned at the top edge of the viewport containing brand identity, core route navigation pills, system time/state, and user controls.
3. **Central Neural Brain Core:** The focal point of the dashboard view is a central neural-network / artificial-brain visual element.
4. **Orbital Surrounding Arrangement:** Information panels and widgets are positioned around the central brain in an organic, orbital layout rather than rigid rectangular columns.
5. **Organic Curved Silhouettes:** Panels utilize smooth, generous border radii (`rounded-2xl` to `rounded-3xl` or SVG-curved masks) to evoke natural neural nodes rather than harsh square corners.

## 3. Typography & Micro-Interactions

- **Font Family:** Clean geometric sans-serif (Inter / Plus Jakarta Sans / Outfit).
- **Hierarchy:** High contrast between crisp titles and muted labels. Generous tracking on uppercase identifiers (`tracking-wider`, `text-xs uppercase`).
- **Motion Principles:**
  - Transitions should feel weighted and smooth (`transition-all duration-300 ease-out`).
  - Subtle breathing ambient glow on interactive elements.
  - Avoid hyperactive or distracting particle explosions; keep interactions calm, elegant, and intentional.
