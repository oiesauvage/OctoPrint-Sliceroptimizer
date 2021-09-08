# OctoPrint-Sliceroptimizer

This plugin is an interface for `slicoptim` python package.  
It aims to generate semi-randomized slicing tests for FDM 3d printing.  
Each test sample is rated by the user. Ratings are then exploited by an optimizer to compute optimal slicing values.

## Requirements

This plugin relies on `slic3r` software. Make sure it is installed with:

```bash
sudo apt install slic3r
```
### Raspberry-Pi case

If you run octoprint on a Raspberry-Pi, you may need additional requirements due to the `arm` platform. If you try to install the plugin directly and doesn't have a working global setup for `piwheels`, the compilation of dependencies such `pandas` or `numpy` may take a tremendous additional time. To solve this problem, you can run in your octoprint environment:

```bash
pip install sliceoptim --extra-index-url https://www.piwheels.org/simple
```

Besides, `numpy` will require some dependencies to work properly:

```bash
sudo apt install libatlas3-base libgfortran5
```

WARNING: There are currently issues with `piwheels` and the [Raspberry-Pi docker image for octoprint](https://github.com/OctoPrint/octoprint-docker). Indeed, the used Python version (3.8) has no matching packages in `piwheels` repository.


## Installation

This Octoprint plugin is currently in beta and not yet on the plugins repository. Once all requirements are met, install it manually using this URL:

    https://github.com/oiesauvage/OctoPrint-Sliceroptimizer/archive/master.zip


## How to use

TODO
