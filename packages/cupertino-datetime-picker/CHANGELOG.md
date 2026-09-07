# cupertino-datetime-picker

## 0.1.1

### Patch Changes

- [`9760aa3`](https://github.com/Fanzzzd/cupertino-datetime-picker/commit/9760aa325561a4a48646af740abd4d852b625cd8) Thanks [@Fanzzzd](https://github.com/Fanzzzd)! - A wheel scrolling itself to a typed or set value no longer reports the rows it passes on the way. On a busy main thread such a report could land after the real one and win, so typing 9:46 could end at 9:48.
