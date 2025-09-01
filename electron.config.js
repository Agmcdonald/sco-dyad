module.exports = {
  // Avoid the problematic .ignored_electron directory
  directories: {
    output: "electron-dist",
    buildResources: "build"
  },
  files: [
    "dist/**/*",
    "electron/**/*",
    "node_modules/**/*",
    "!node_modules/.ignored_electron/**/*"
  ],
  extraMetadata: {
    main: "electron/main.js"
  }
};