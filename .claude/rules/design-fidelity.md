# Design Fidelity

The UI designs are **approved and final**. Build screens to match them; do not redesign, simplify, or
substitute your own layout, copy, icons or colors.

## Source of truth

- Canvas: https://claude.ai/artifact/3ZkGMWw8nBkVvLpoe1tEmo (artboards are `project/*.dc.html`).
- Screen flows in the canvas are `Auth`, `AuthGate`, `Onboard`, `Account`, `Chat`, `Detail`, `Post`, etc.;
  the short files (`AuthRegister.dc.html`, `OnbArea.dc.html`) only import the flow with props.
- Reading: `Artifact` tool, `action: "read"`, `url` above, `paths: ["project/<Name>.dc.html"]`. The file is
  saved locally; read the saved copy (it is long; use `sed -n '/<x-dc>/,/<\/x-dc>/p'`, and the
  `<script type="text/x-dc">` block for copy and state logic).

## Before building or editing a screen

1. Read the artboard(s) for that screen and every state it has (error, empty, loading, picked, etc.).
2. Copy **exactly**: Vietnamese copy, spacing, sizes, radii, colors (hex), font weights, button order and
   labels, which elements appear (skip buttons, step bars, hint text, footnotes).
3. Icons and illustrations come from the design: port `project/CatIcons.dc.html` to
   `src/components/icons/cat-icon.tsx` (forms, categories) and `src/components/icons/tab-icon.tsx` (tabs);
   the logo goes in `src/components/auth/trao-logo.tsx`. Port SVGs from the canvas with `react-native-svg`;
   never draw substitutes, never use emoji or a generic icon library in their place.
4. Colors from the design are used as hex values in NativeWind arbitrary classes
   (`bg-[#RRGGBB]`); put repeated tokens in `tailwind.config.js` only if the canvas defines them as tokens.
   When copying SVG, JSX attributes must be expressions (`fill={C.y}`), never the literal string `"{C.y}"`.
5. Only deviate when the design cannot work with real behavior (e.g. a mocked OS permission dialog becomes
   the real native prompt). Say what you changed and why in the final reply.

## After building

- Do not run Expo web or a simulator. Re-read the artboard and compare it with the code line by line
  (copy, spacing, sizes, radii, hex colors, states), then run `npm run type-check` and `npm run lint`.
- The user checks the result on a device. Say that the match was verified against the artboard in code
  only, never that it was visually confirmed.
