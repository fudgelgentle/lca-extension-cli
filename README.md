# lca-extension-cli

The Life Cycle Assessment Visualization creates a carbon footprint visualization based on relevant text information of mobile devices.

# Running the extension locally:
1. Clone the repository
2. Run `npm install extension-cli` in the root directory.
3. Now, run `npx xt-build` in the root directory. You will see `release.zip` being created
4. Unzip `release.zip` to get the `release` folder
5. Go to Google Extensions `(chrome://extensions/)` then to `My Extensions`
6. Turn on `Developer Mode` (in the top right)
7. Click on `Load unpacked` button on the top left and select the `release` folder
8. The extension can now be used locally

**Running updated code:** If there are changes/updates in the repo, to get the latest update, please delete the current `release` folder (if it exists), run `npx xt-build`, unzip `release.zip` to get the new `release` folder, then refresh the extension on Google Extensions.

**Adding new scripts:**  Whenever adding a new .js script to src, make sure to edit `js_bundles` in `package.json` to 'whitelist' that .js file. Otherwise, the .js file will not work.

## Development

This extension was created with [Extension CLI](https://oss.mobilefirst.me/extension-cli/)!

