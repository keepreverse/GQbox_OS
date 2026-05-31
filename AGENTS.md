# AGENTS.md

## Project role

You are working on a frontend project.

Your goal is not only to make the code work, but to make the interface feel intentional, polished, responsive and non-generic.

Use the installed Taste Skill skills when the task is related to frontend design, UI implementation, redesign, layout, visual polish, interaction states, animation or product pages.

## Default frontend standards

- Use Next.js, React, TypeScript and Tailwind when available.
- Check package.json before importing third-party libraries.
- Do not add unnecessary dependencies.
- Prefer simple, readable components.
- Keep changes reviewable.
- Run the build or typecheck after meaningful changes.

## Design standards

Avoid generic AI-generated UI patterns:

- no generic centered SaaS hero unless specifically requested
- no endless 3-column card grids
- no fake startup names like Acme, Nexus, Nova, Quantum
- no fake stats like 99.99% uptime unless grounded in the product
- no emoji icons for serious product UI
- no placeholder avatars or John Doe testimonials unless explicitly asked
- no excessive gradients
- no heavy glassmorphism unless the style requires it
- no h-screen hero that breaks on mobile browsers

## Typography

- Do not default to Inter for every premium design.
- Use typography as a core part of the visual identity.
- Keep hero headlines readable.
- Avoid overly long hero text.
- Use clear hierarchy between headline, subheadline, metadata and CTAs.

## Layout

- Prefer intentional composition over template layouts.
- Use asymmetry when it improves visual interest.
- Make bento grids structurally clean, not random.
- Avoid cards inside cards inside cards.
- Use generous spacing for premium pages.
- Use higher density only for dashboards and data-heavy interfaces.

## Motion

- Motion should support comprehension, not distract.
- Prefer transform and opacity animations.
- Avoid animating layout-heavy properties.
- Keep motion subtle for SaaS/productivity interfaces.
- Use stronger motion only for creative landing pages.

## Responsive rules

- Design mobile states intentionally.
- Use min-h-[100dvh] instead of h-screen for full-height sections.
- Test narrow layouts mentally before finalizing.
- Avoid horizontal overflow.
- Make navigation, grids and CTAs usable on mobile.

## Interaction states

For interactive UI, include relevant states:

- loading
- empty
- error
- disabled
- hover
- focus
- active
- selected

Do not ship only the happy path.

## Accessibility

- Use semantic HTML where possible.
- Buttons should be buttons, links should be links.
- Maintain readable contrast.
- Add aria-labels where needed.
- Preserve keyboard usability.

## When creating a new UI from scratch

Use this default Taste Skill direction unless the user specifies otherwise:

- DESIGN_VARIANCE: 6
- MOTION_INTENSITY: 5
- VISUAL_DENSITY: 4

Prioritize:

- strong typography
- intentional layout
- responsive structure
- non-generic visual direction
- real interaction states
- clean code

## When redesigning existing UI

Do not rewrite everything from scratch.

First audit the current UI:

- typography
- spacing
- layout
- colors
- surfaces
- components
- responsive behavior
- interaction states
- accessibility
- code quality

Then improve the interface while preserving the existing stack and functionality.

## When outputting code

Do not use placeholder comments such as:

- TODO
- rest of code here
- same as above
- for brevity
- repeat this pattern
- implementation omitted

Write complete, usable code.
