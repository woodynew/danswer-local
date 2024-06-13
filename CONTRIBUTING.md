<!-- DANSWER_METADATA={"link": "https://github.com/danswer-ai/danswer/blob/main/CONTRIBUTING.md"} -->

# Contributing to Danswer
Hey there! We are so excited that you're interested in Danswer.

As an open source project in a rapidly changing space, we welcome all contributions.


## 💃 Guidelines
### Contribution Opportunities
The [GitHub Issues](https://github.com/danswer-ai/danswer/issues) page is a great place to start for contribution ideas.

Issues that have been explicitly approved by the maintainers (aligned with the direction of the project)
will be marked with the `approved by maintainers` label.
Issues marked `good first issue` are an especially great place to start.

**Connectors** to other tools are another great place to contribute. For details on how, refer to this
[README.md](https://github.com/danswer-ai/danswer/blob/main/backend/danswer/connectors/README.md).

If you have a new/different contribution in mind, we'd love to hear about it!
Your input is vital to making sure that Danswer moves in the right direction.
Before starting on implementation, please raise a GitHub issue.

And always feel free to message us (Chris Weaver / Yuhong Sun) on 
[Slack](https://join.slack.com/t/danswer/shared_invite/zt-2afut44lv-Rw3kSWu6_OmdAXRpCv80DQ) / 
[Discord](https://discord.gg/TDJ59cGV2X) directly about anything at all. 


### Contributing Code
To contribute to this project, please follow the
["fork and pull request"](https://docs.github.com/en/get-started/quickstart/contributing-to-projects) workflow.
When opening a pull request, mention related issues and feel free to tag relevant maintainers.

Before creating a pull request please make sure that the new changes conform to the formatting and linting requirements.
See the [Formatting and Linting](#-formatting-and-linting) section for how to run these checks locally.


### Getting Help 🙋
Our goal is to make contributing as easy as possible. If you run into any issues please don't hesitate to reach out.
That way we can help future contributors and users can avoid the same issue.

We also have support channels and generally interesting discussions on our
[Slack](https://join.slack.com/t/danswer/shared_invite/zt-2afut44lv-Rw3kSWu6_OmdAXRpCv80DQ)
and 
[Discord](https://discord.gg/TDJ59cGV2X).

We would love to see you there!


## Get Started 🚀
Danswer being a fully functional app, relies on some external pieces of software, specifically:
- [Postgres](https://www.postgresql.org/) (Relational DB)
- [Vespa](https://vespa.ai/) (Vector DB/Search Engine)

This guide provides instructions to set up the Danswer specific services outside of Docker because it's easier for
development purposes but also feel free to just use the containers and update with local changes by providing the
`--build` flag.


### Local Set Up
It is recommended to use Python version 3.11

If using a lower version, modifications will have to be made to the code.
If using a higher version, the version of Tensorflow we use may not be available for your platform.


#### Installing Requirements
Currently, we use pip and recommend creating a virtual environment.

For convenience here's a command for it:
```bash
python -m venv .venv
source .venv/bin/activate
```
_For Windows, activate the virtual environment using Command Prompt:_
```bash
.venv\Scripts\activate
```
If using PowerShell, the command slightly differs:
```powershell
.venv\Scripts\Activate.ps1
```

Install the required python dependencies:
```bash
pip install -r danswer/backend/requirements/default.txt
pip install -r danswer/backend/requirements/dev.txt
pip install -r danswer/backend/requirements/model_server.txt
```

Install [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) for the frontend.
Once the above is done, navigate to `danswer/web` run:
```bash
npm i
```

Install Playwright (required by the Web Connector)

> Note: If you have just done the pip install, open a new terminal and source the python virtual-env again.
This will update the path to include playwright

Then install Playwright by running:
```bash
playwright install
```


#### Dependent Docker Containers
First navigate to `danswer/deployment/docker_compose`, then start up Vespa and Postgres with:
```bash
docker compose -f docker-compose.dev.yml -p danswer-stack up -d index relational_db
```
(index refers to Vespa and relational_db refers to Postgres)

#### Running Danswer
To start the frontend, navigate to `danswer/web` and run:
```bash
npm run dev
```

Next, start the model server which runs the local NLP models.
Navigate to `danswer/backend` and run:
```bash
uvicorn model_server.main:app --reload --port 9000
```
_For Windows (for compatibility with both PowerShell and Command Prompt):_
```bash
powershell -Command "
    uvicorn model_server.main:app --reload --port 9000
"
```

The first time running Danswer, you will need to run the DB migrations for Postgres.
After the first time, this is no longer required unless the DB models change.

Navigate to `danswer/backend` and with the venv active, run:
```bash
alembic upgrade head
```

Next, start the task queue which orchestrates the background jobs.
Jobs that take more time are run async from the API server.

Still in `danswer/backend`, run:
```bash
python ./scripts/dev_run_background_jobs.py
```

To run the backend API server, navigate back to `danswer/backend` and run:
```bash
AUTH_TYPE=disabled uvicorn danswer.main:app --reload --port 8080
```
_For Windows (for compatibility with both PowerShell and Command Prompt):_
```bash
powershell -Command "
    $env:AUTH_TYPE='disabled'
    uvicorn danswer.main:app --reload --port 8080 
"
```

Note: if you need finer logging, add the additional environment variable `LOG_LEVEL=DEBUG` to the relevant services.

### Formatting and Linting
#### Backend
For the backend, you'll need to setup pre-commit hooks (black / reorder-python-imports).
First, install pre-commit (if you don't have it already) following the instructions
[here](https://pre-commit.com/#installation).
Then, from the `danswer/backend` directory, run:
```bash
pre-commit install
```

Additionally, we use `mypy` for static type checking.
Danswer is fully type-annotated, and we would like to keep it that way! 
To run the mypy checks manually, run `python -m mypy .` from the `danswer/backend` directory.


#### Web
We use `prettier` for formatting. The desired version (2.8.8) will be installed via a `npm i` from the `danswer/web` directory. 
To run the formatter, use `npx prettier --write .` from the `danswer/web` directory.
Please double check that prettier passes before creating a pull request.


### Release Process
Danswer follows the semver versioning standard.
A set of Docker containers will be pushed automatically to DockerHub with every tag.
You can see the containers [here](https://hub.docker.com/search?q=danswer%2F).
