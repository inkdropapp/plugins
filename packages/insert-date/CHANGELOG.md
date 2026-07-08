## Unreleased
* Support Inkdrop v6
* Replace Moment.js with date-fns
    * **Breaking:** format tokens have changed. The default is now `PPPPp` (was `LLLL`).
      See the "Migrating from Moment.js formats" section of the README.
* Rewrite in TypeScript
* Load date-fns on first use, so activation no longer pays for it

## 0.1.0 - First Release
* Every feature added
* Every bug fixed
