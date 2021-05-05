# About

It's a simple implementation of [a base repository pattern](https://martinfowler.com/eaaCatalog/repository.html#:~:text=Repository%20also%20supports%20the%20objective,pattern%20in%20Domain%20Driven%20Design%20.)
that provides simple database operations with entity.
  
# Publishing the package

If you want to publish the package, you need to add environment variable:

* `NPM_REGISTRY_ACCESS_TOKEN`. It has to contain the value of the access token 
  to @eigenspace account on the public [npm registry](https://www.npmjs.com/)
  (See `.npmrc`). 
  
# CI configuration

You can find a configured secret for `NPM_REGISTRY_ACCESS_TOKEN` in
[Github Eigenspace secrets](https://github.com/organizations/eigen-space/settings/secrets/actions).

# Why do we have that dependencies?

* `@eigenspace/common-types` - contains base common types.
* `@eigenspace/logger` - used for logging actions.
* `@eigenspace/utils` - used as collection of string and object utils.

# Why do we have that dev dependencies?

* `@eigenspace/codestyle` - includes lint rules, config for typescript.
* `@eigenspace/commit-linter` - linter for commit messages.
* `@types/*` - contains type definitions for specific library.
* `clean-webpack-plugin` - it is used to clean dist folder before build.
* `copy-webpack-plugin` - it is used to copy additional files into dist.
* `eslint` - it checks code for readability, maintainability, and functionality errors.
* `eslint-plugin-eigenspace-script` - includes set of script linting rules
  and configuration for them.
* `husky` - used for configure git hooks.
* `lint-staged` - used for configure linters against staged git files.
* `pg` - it is used to operate with the storage represented as
  Postgres database. It is in dev dependencies because we use it as a peer dependency.
  We expect that every consumer of the library works with a database due to it needs
  db migration. So, it will provide required dependency.
* `ts-loader` - webpack loader to build typescript files.
* `ts-node` - to run without build typescript.
* `typescript` - is a superset of JavaScript that have static type-checking and ECMAScript features.
* `webpack` - it is used to build the package/library.
* `webpack-cli` - it is used to send commands to webpack using commandline interface.