module.exports = {
    "parserOptions": {
        "ecmaVersion": 8,
        "ecmaFeatures": {
          "experimentalObjectRestSpread": true
        },
        "sourceType": "module"
    },
    "env": {
        "node": true,
        "es6": true
    },
    "extends": "eslint:recommended",
    "rules": {
        "indent": [
            "error",
            "tab"
        ],
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ],
        "no-unused-vars": [
            "warn"
        ],
        "no-console": [
            "warn"
        ]
    }
};