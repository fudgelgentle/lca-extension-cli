# lca-extension-cli

The Life Cycle Assessment Visualization creates a carbon footprint visualization based on relevant text information of mobile devices.

# Running the extension locally:
1. Clone the repository
2. Run `npx xt-build` in the root directory. You will see 'release.zip' being created
3. Unzip release.zip to get the 'release' folder
4. Go to Google Extensions (chrome://extensions/) then to 'My Extensions'
5. Turn on Developer Mode (in the top right)
6. Click on 'Load unpacked' button on the top left and select the 'release' folder
7. The extension can now be used locally

**Running updated code:** If there are changes/updates in the repo, to get the latest update, please delete the current 'release' folder (if it exists), run `npx xt-build`, unzip release.zip to get the new 'release' folder, then refresh the extension on Google Extensions.

**Adding new scripts:**  Whenever adding a new .js script to src, make sure to edit js_bundles in package.json to 'whitelist' that .js file. Otherwise, the .js file will not work.

## Development

This extension was created with [Extension CLI](https://oss.mobilefirst.me/extension-cli/)!

If you find this software helpful [star](https://github.com/MobileFirstLLC/extension-cli/) or [sponsor](https://github.com/sponsors/MobileFirstLLC) this project.


### Available Commands

| Commands | Description |
| --- | --- |
| `npm run start` | build extension, watch file changes |
| `npm run build` | generate release version |
| `npm run docs` | generate source code docs |
| `npm run clean` | remove temporary files |
| `npm run test` | run unit tests |
| `npm run sync` | update config files |

For CLI instructions see [User Guide &rarr;](https://oss.mobilefirst.me/extension-cli/)

### Learn More

**Extension Developer guides**

- [Getting started with extension development](https://developer.chrome.com/extensions/getstarted)
- Manifest configuration: [version 2](https://developer.chrome.com/extensions/manifest) - [version 3](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Permissions reference](https://developer.chrome.com/extensions/declare_permissions)
- [Chrome API reference](https://developer.chrome.com/docs/extensions/reference/)

**Extension Publishing Guides**

- [Publishing for Chrome](https://developer.chrome.com/webstore/publish)
- [Publishing for Edge](https://docs.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/publish-extension)
- [Publishing for Opera addons](https://dev.opera.com/extensions/publishing-guidelines/)
- [Publishing for Firefox](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
