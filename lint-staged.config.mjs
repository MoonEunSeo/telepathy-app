export default {
  '*.{ts,tsx,js,jsx}': ['oxlint -c .oxlintrc.json --fix', 'prettier --write'],
  '*.{json,css,md,yml,yaml}': ['prettier --write'],
};
