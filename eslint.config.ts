/** Imports */
import eslint from '@eslint/js';
import tsEslint from 'typescript-eslint';
import {defineConfig} from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import typescriptEslintParser from '@typescript-eslint/parser';


/** Exports */
export default defineConfig(
    {ignores: ['build/**', 'dist/**', 'coverage/**']},
    eslint.configs.recommended,
    tsEslint.configs.recommended,
    {
        languageOptions: {
            parser: typescriptEslintParser,
        },
        plugins: {
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
            '@typescript-eslint/no-require-imports': 'off',
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
    },
);
