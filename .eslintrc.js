module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    '@react-native-community',
    "prettier"
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
};
