## Unreleased
* Support Inkdrop v6
* Replace Moment.js with date-fns
    * **Breaking:** format tokens have changed.
      See the "Migrating from Moment.js formats" section of the README.
* Add a context-menu submenu of predefined formats, each previewing the current date in your locale
* The Format setting is now empty by default. Set it and it is listed first, above the predefined
  formats; leave it empty and only the predefined ones are shown. The keybinding falls back to
  `PPPPp` (full date & time) when it is empty.
* Offer the same menu on the note title input
* Rewrite in TypeScript
* Load date-fns off the activation path (warmed 1s later, so menu labels can preview)

## 0.1.0 - First Release
* Every feature added
* Every bug fixed
