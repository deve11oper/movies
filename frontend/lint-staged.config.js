/**
 * Lint and format the frontend files included in a commit.
 */
export default {
  '*.{js,ts,vue,css}': ['eslint --fix', 'prettier --write'],
}
