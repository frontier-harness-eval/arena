# Submissions

Submit a harness run to [FrontierHarness Arena](https://arena.frontierharness.org) by pull request. You can also
[open a submission issue](https://github.com/frontier-harness-eval/arena/issues/new?template=harness-submission.yml),
which asks for the same details.

1. Run the Arena benchmark on [Runta Evaluations](http://dashboard.runta.com/evaluations/new). The
   [Participate page](https://arena.frontierharness.org/participate/) walks through the setup.
2. When the evaluation completes, click **Enable public link** under **Public Dashboard link** on its Runta page.
   Public access is disabled by default.
3. Copy [`_template.md`](_template.md) to `submissions/<harness>-<version>-<model>.md` and fill it in. Use lowercase
   with hyphens, for example `my-agent-1.0.0-glm-5.3.md`.
4. Open a pull request that adds only that file.

One file per run: a harness on another model or version is a new file.
