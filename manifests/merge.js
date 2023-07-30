import jq from "node-jq";
import fs from "fs";
import path from "path";

/* This script merges the common manifest with the browser-specific manifest.
 * Usage: node manifests/merge.js <browser>
 * Example: node manifests/merge.js chrome
 */

const commonManifest = JSON.parse(
  fs.readFileSync("manifests/manifest.common.json", "utf8")
);
const browserManifest = JSON.parse(
  fs.readFileSync(`manifests/manifest.${process.argv[2]}.json`, "utf8")
);

jq.run(".[0] * .[1]", [commonManifest, browserManifest], {
  input: "json",
}).then((output) => {
  if (!fs.existsSync(`build/${process.argv[2]}`)) {
    fs.mkdirSync(`build/${process.argv[2]}`, { recursive: true });
  }
  fs.writeFileSync(
    path.join(`build/${process.argv[2]}`, "manifest.json"),
    output
  );
});
