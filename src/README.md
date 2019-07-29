Note that anything in the `utils` dir is shared with the web
client's public dir via symlink, so any files in this directory
are accessible to the web client.

As such, any code here should be universal JS, which means
no `export` (which is super annoying), and a module.exporets
check in the form of

```
if (typeod module !== "undefined" && module.exports) {
  module.exports = ...;
}
```
