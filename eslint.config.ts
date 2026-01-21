/** Imports */
import importPlugin from 'eslint-plugin-import';
import typescriptEslintParser from '@typescript-eslint/parser';
import typescriptEslintPlugin from '@typescript-eslint/eslint-plugin';


/** Exports */
module.exports = {
    languageOptions: {
        parser: typescriptEslintParser,
    },
    plugins: {
        '@typescript-eslint': typescriptEslintPlugin,
        'import': importPlugin,
    },
    files: [
        'src/**/*.ts',
    ],
    rules: {
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': [
            'error',
            {
                vars: 'all',
                varsIgnorePattern: '^_',
                args: 'after-used',
                ignoreRestSiblings: true,
                argsIgnorePattern: '^_',
            },
        ],
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-this-alias': 'off',
        '@typescript-eslint/consistent-type-imports': [
            'error',
            {
                prefer: 'type-imports',
                disallowTypeAnnotations: false,
                fixStyle: 'inline-type-imports',
            },
        ],
        'import/extensions': [
            'error',
            'always',
            {ignorePackages: true, js: 'always', mjs: 'always', ts: 'never'},
        ],
    },
};
