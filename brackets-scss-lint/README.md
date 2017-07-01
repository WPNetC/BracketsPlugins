brackets-scss-lint
==================

SCSS linter for Brackets

## Requirements
* [Brackets](http://brackets.io/) (tested with v0.44+)
* [Ruby 1.9.3+](https://www.ruby-lang.org)
* [scss-lint](https://github.com/causes/scss-lint) (tested with 0.37.0)
  * (use `gem install scss_lint` after installing Ruby)

## scss-lint Configuration
Put your scss-lint rules in a file named `.scss-lint.yml` in the root of your project.

## brackets-scss-lint Configuration

The extension has three configuration options you can set in your
[Brackets preferences file](https://github.com/adobe/brackets/wiki/How-to-Use-Brackets#preferences).

If brackets-scss-lint can't find your scss-lint gem, you can tell it where it's
located via the following option:

```json
"scsslint.gemDir": "/dir/where/scsslint/is/installed/"
```

The default gemDir is an empty string.

---

If you're linting large scss files and are getting an error saying
"Too many errors. Try a smaller file or setting scsslint.maxBuffer config.",
you can increase the default Node buffer size via the following option:

```json
"scsslint.execMaxBuffer": 409600
```

The default execMaxBuffer value is 204800

---

You can change the default location of you linting configuration file. 
The location is in reference to the project base directory.

```json
"scsslint.configFile": ".scss-lint.yml"
```

The default is `.scss-lint.yml`
