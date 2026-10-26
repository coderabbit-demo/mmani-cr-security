# Harbor Support design

## Scene and strategy

A field engineer presents invoice access on a bright laptop screen in a meeting room. Use a white work surface and a restrained harbor-blue accent. The interface should feel like a well-organized customer support workspace.

## Tokens

Use OKLCH: background 1 0 0; surface .97 .006 230; ink .23 .025 230; muted .46 .025 230; primary .45 .086 230; success .37 .08 155; danger .43 .15 25. Status backgrounds use pale tints and explicit text.

## Typography

Use the system sans-serif stack. Body text is 17px, labels 15px, page headings 36px. Code uses the system monospace stack at 14px. Recording mode increases body and code sizes. Lines wrap in result panels and code scrolls horizontally within its own panel.

## Layout

Persistent 250px navigation lists lessons as compact rows. A top bar identifies the local lab and current account. The invoice lesson opens first. A large business task leads into two side-by-side implementation columns. Each column contains its request, action, result, and expandable source. Explanations follow below. The catalog supports text search and Web or AI filters.

## Interaction and states

Actions show pending, success, denied, and error states using text and icons. Reset returns synthetic data to its known state. Source disclosure shows the actual mounted implementation. A route diagram explains the shared invoice service. Small transitions use opacity and respect reduced-motion preferences. At narrow widths the sidebar becomes a lesson selector and the comparison becomes one column.
