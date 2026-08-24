# Striae Release Notes - v10.2.2

**Release Date**: August 23, 2026
**Period**: August 23, 2026 (same-day)
**Total Commits**: 4 (non-merge since the v10.2.1 release)

## Patch Release - Item Details Data Entry Refinements

## Summary

v10.2.2 is a small, same-day patch focused entirely on the item-details data entry UI for bullets, cartridge cases, and shotshells. It adds new length and mark-detail fields, clarifies existing labels, and expands a bullet type option, with corresponding updates to the annotation types and case-summary text generation. No worker, storage, or API changes are included.

## Detailed Changes

### Item Details Data Entry Refinements (UI/Data Entry)

- **Length Fields** - Added a `Length` text field to the Bullet and Cartridge Case sections (`app/components/sidebar/notes/item-details/item-details-sections.tsx`), with corresponding state, save-data mapping, and summary-row support in `use-item-details-state.ts`, `item-details-shared.ts`, and `app/types/annotations.ts`.
- **Chambering and Reloading Marks Checkboxes** - Added `Chambering Marks` and `Reloading Marks` checkboxes to the Cartridge Case and Shotshell sections, with matching state, types, and case-summary text.
- **Breechface Marks Checkbox** - Added a `Breechface Marks` checkbox to the Cartridge Case and Shotshell sections, with matching state, types, and case-summary text.
- **Primer/Aperture Shear Label** - Relabeled the Cartridge Case `Primer Shear` checkbox to `Primer/Aperture Shear` in both the UI and the generated case-summary text.
- **Bullet Type Option** - Relabeled the `HP` bullet type option to `HP/JHP` in `BULLET_TYPE_OPTIONS`.

## Release Statistics

- **Baseline**: .github/release-notes/RELEASE_NOTES_v10.2.1.md
- **Commits Included**: 4 (non-merge commits from 2026-08-23)
- **Build Status**: Passed (`npm run build`)
- **Typecheck Status**: Passed (`npm run typecheck`)
- **Lint Status**: Passed (`npm run lint`)

## Closing Note

v10.2.2 is a UI/data-entry-only patch with no changes to worker behavior, storage formats, or public APIs.
