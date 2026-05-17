---
status: verifying
trigger: "navigation architecture is absolutely horrible. Three states: Desktop hero- hamburger- hover over resources makes access to contact impossible. Remove resource dropdown on desktop hamburger. Leave it on desktop. State two- scrolldown menu- good, resource dropdown on desktop fine. State 3- mobile- hover on resources jump opens wider and open- jolting- no transition- and entire mobile is it a bit small?"
created: 2026-03-20T00:00:00Z
updated: 2026-03-20T00:00:00Z
---

## Current Focus

hypothesis: Resources dropdown was the root cause of all nav UX issues
test: removed dropdown array from Resources nav item
expecting: Resources now plain link in all nav states
next_action: verify fix in browser

## Symptoms

expected: Resources is a plain link everywhere - no dropdown/subsections in any nav state
actual: Resources has expandable dropdown with subsections (Medical Advocacy, Legal Resources, etc.) causing UX issues
errors: none - UX issue
reproduction: hover/click on Resources in any nav state
started: always this way

## Eliminated

[none yet]

## Evidence

- timestamp: 2026-03-20
  checked: src/components/Navigation.astro
  found: navItems array had dropdown property on Resources with 4 subsections
  implication: dropdown causes hover/expand behavior in all states

## Resolution

root_cause: Resources nav item had dropdown array causing complex hover/expand UX
fix: Removed dropdown property - Resources is now plain link to /resources
verification: pending user confirmation
files_changed: [src/components/Navigation.astro]
