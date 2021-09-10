# coding=utf-8
from __future__ import absolute_import, with_statement
from octoprint.access.permissions import Permissions
from sliceoptim.core import (
    Filament,
    Printer,
    ParametersSpace,
    Experiment,
    ExperimentError,
)
from sliceoptim.io import Database
import flask
from flask import json, request
import shutil
import os

### (Don't forget to remove me)
# This is a basic skeleton for your plugin's __init__.py. You probably want to adjust the class name of your plugin
# as well as the plugin mixins it's subclassing from. This is really just a basic skeleton to get you started,
# defining your plugin as a template plugin, settings and asset plugin. Feel free to add or remove mixins
# as necessary.
#
# Take a look at the documentation on what other plugin mixins are available.

import octoprint.plugin
from octoprint.printer.profile import PrinterProfileManager


class SliceroptimizerPlugin(
    octoprint.plugin.StartupPlugin,
    octoprint.plugin.SettingsPlugin,
    octoprint.plugin.AssetPlugin,
    octoprint.plugin.TemplatePlugin,
    octoprint.plugin.BlueprintPlugin,
    octoprint.plugin.EventHandlerPlugin,
):

    ##~~ SettingsPlugin mixin
    def get_settings_defaults(self):
        return dict(
            # put your plugin's default settings here
        )

    ##~~ AssetPlugin mixin

    def get_assets(self):
        # Define your plugin's asset files to automatically include in the
        # core UI here.
        return dict(
            js=[
                "js/SlicerOptimizer.js",
                "js/utils.js",
                "js/components.js",
                "js/ViewModels.js",
            ],
            css=["css/SlicerOptimizer.css"],
            less=["less/SlicerOptimizer.less"],
        )

    ##~~ Softwareupdate hook

    def get_update_information(self):
        # Define the configuration for your plugin to use with the Software Update
        # Plugin here. See https://docs.octoprint.org/en/master/bundledplugins/softwareupdate.html
        # for details.
        return dict(
            SlicerOptimizer=dict(
                displayName="Sliceroptimizer Plugin",
                displayVersion=self._plugin_version,
                # version check: github repository
                type="github_release",
                user="oiesauvage",
                repo="OctoPrint-Sliceroptimizer",
                current=self._plugin_version,
                # update method: pip
                pip="https://github.com/oiesauvage/OctoPrint-Sliceroptimizer/archive/{target_version}.zip",
            )
        )

    # After startup
    def on_after_startup(self):
        # setup database
        self.db = Database(self.get_plugin_data_folder())
        self.sync_printers_with_octoprint()
        self.experiment = None
        self.results = None
        # load default stl files
        stl_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "stl_files")
        if os.path.isdir(stl_path):
            trg_path = self.get_plugin_data_folder()
            file_names = os.listdir(stl_path)
            for file_name in file_names:
                shutil.copy2(os.path.join(stl_path, file_name), trg_path)
            shutil.rmtree(stl_path)
        pass

    # After printer profiles are modified
    def on_event(self, event, payload):
        if event == "PrinterProfileModified":
            self.sync_printers_with_octoprint()
        pass

    def sync_printers_with_octoprint(self):
        printer_profiles = PrinterProfileManager().get_all()
        # for each cartesian printer, create a printer object
        db_printer_names = self.db.get_printer_names()
        new_printers = []
        for p in printer_profiles.values():
            if p["volume"]["formFactor"] == "rectangular":
                max_speed = min(p["axes"]["x"]["speed"], p["axes"]["y"]["speed"])
                printer = Printer(
                    name=p["id"],
                    bed_size=[p["volume"]["width"], p["volume"]["depth"]],
                    nozzle_diameter=p["extruder"]["nozzleDiameter"],
                    max_speed=max_speed,
                    min_speed=0.1 * max_speed,
                )
                new_printers.append(printer)
        # update the database with each created printer
        for printer in new_printers:
            if printer.name in db_printer_names:
                self.db.delete_printer(printer.name)
                self.db.add_printer(printer=printer)
                self._logger.info("Updated printer " + printer.name)
            else:
                self.db.add_printer(printer=printer)
                self._logger.info("Added new printer " + printer.name)
        # delete removed printers in octoprint
        for db_printer_name in db_printer_names:
            if db_printer_name not in [p.name for p in new_printers]:
                self.db.delete_printer(db_printer_name)
        return

    # Plugin API requests
    @octoprint.plugin.BlueprintPlugin.route(
        "/filament/<string:name>",
        methods=["GET", "DELETE", "POST"],
    )
    def manage_filament(self, name):
        if request.method == "GET":
            if name == "get_names":
                fil_names = self.db.get_filament_names()
                resp = flask.make_response(flask.jsonify(fil_names))
                resp.status_code = 200
                self._logger.info("Retrieving filament names : " + str(fil_names))
                return resp
            else:
                try:
                    filament = self.db.get_filament(name=name)
                    resp = flask.make_response(flask.jsonify(filament.__dict__))
                    resp.status_code = 200
                except ValueError:
                    resp = flask.make_response(
                        "No filament with name {} available".format(name)
                    )
                    resp.status_code = 404
                self._logger.info("Filament {} retrived.".format(name))
        elif request.method == "DELETE":
            try:
                self.db.delete_filament(name=name)
                resp = flask.make_response()
                resp.status_code = 200
            except ValueError:
                resp = flask.make_response(
                    "No filament with name {} available for deletion".format(name)
                )
                resp.status_code = 404
            self._logger.info("Filament {} deleted.".format(name))
        elif (request.method == "POST") and name == "add":
            filament_params = flask.request.form
            new_filament = Filament(
                name=filament_params["filament_name"],
                material=filament_params["filament_material"],
                extrusion_temp_range=[
                    filament_params["filament_ext_min_temperature"],
                    filament_params["filament_ext_max_temperature"],
                ],
                bed_temp_range=[
                    filament_params["filament_bed_min_temperature"],
                    filament_params["filament_bed_max_temperature"],
                ],
                diameter=filament_params["filament_diameter"],
            )
            try:
                self.db.add_filament(new_filament)
                self._logger.info(
                    "new filament is "
                    + str(self.db.get_filament(new_filament.name).__dict__)
                )
                resp = flask.make_response("Filament created.")
                resp.status_code = 201
            except ValueError:
                resp = flask.make_response("Error: filament name already exists!")
                resp.status_code = 409
        return resp

    @octoprint.plugin.BlueprintPlugin.route("/printers", methods=["GET"])
    def get_printers(self):
        printer_names = self.db.get_printer_names()
        printers = {
            name: self.db.get_printer(name=name).__dict__ for name in printer_names
        }
        resp = flask.make_response(flask.jsonify(printers))
        resp.status_code = 200
        self._logger.info("Retrieving printers names data")
        return resp

    @octoprint.plugin.BlueprintPlugin.route(
        "/parameters/get_available_names", methods=["GET"]
    )
    def get_available_parameter_names(self):
        params = ParametersSpace().params_spec
        names = list(params.keys())
        resp = flask.make_response(flask.jsonify(names))
        resp.status_code = 200
        self._logger.info(
            "Retreiving {} available Slic3r parameters.".format(len(names))
        )
        return resp

    @octoprint.plugin.BlueprintPlugin.route("/files", methods=["POST", "GET"])
    @Permissions.FILES_UPLOAD.require(403)
    def upload_file(self):
        folder = self.db.folder_path
        if request.method == "POST":
            path = request.values["file.path"]
            name = request.values["file.name"]
            with open(path, "rb") as f:
                stl_file = f.read()
            with open(folder / name, "wb") as new_file:
                new_file.write(stl_file)
                self._logger.info("Saving new file: " + name)
            resp = flask.make_response()
            resp.status_code = 201
            return resp
        elif request.method == "GET":
            stl_files = [f.name for f in folder.glob("*.stl")]
            ini_files = [f.name for f in folder.glob("*.ini")]
            file_names = {"samples": stl_files, "slicer_configs": ini_files}
            self._logger.info("Retreiving file names")
            resp = flask.make_response(flask.jsonify(file_names))
            resp.status_code = 200
            return resp

    @octoprint.plugin.BlueprintPlugin.route(
        "/files/<string:filename>", methods=["DELETE"]
    )
    @Permissions.FILES_DELETE.require(403)
    def delete_files(self, filename):
        folder = self.db.folder_path
        file = folder / filename
        file.unlink()
        self._logger.info("File {} deleted!".format(filename))
        resp = flask.make_response()
        resp.status_code = 200
        return resp

    @octoprint.plugin.BlueprintPlugin.route(
        "/experiment/<string:name>", methods=["GET", "POST", "DELETE"]
    )
    def manage_experiments(self, name):
        if request.method == "POST" and name == "add":
            fdata = request.form
            folder = self.db.folder_path
            if fdata["init_config"] == "undefined":
                config_file = None
            else:
                config_file = folder / fdata["init_config"]
            if fdata["is_first_layer"] == "true":
                is_first_layer = True
            else:
                is_first_layer = False
            params_space = ParametersSpace()
            for p in flask.json.loads(fdata["params_list"]):
                params_space.add_param(
                    name=p["name"],
                    low=float(p["min_value"]),
                    high=float(p["max_value"]),
                )
            exp_data = {
                "name": fdata["name"],
                "is_first_layer": is_first_layer,
                "spacing": float(fdata["spacing"]),
                "printer": self.db.get_printer(fdata["printer"]),
                "filament": self.db.get_filament(fdata["filament"]),
                "params_space": params_space,
                "sample_file": folder / fdata["sample_file"],
                "config_file": config_file,
                "output_file": None,
            }
            self._logger.info(exp_data),
            new_experiment = Experiment(**exp_data)
            try:
                self.experiment = new_experiment
                self.db.add_experiment(new_experiment)
                self._logger.info("Experiment created: " + self.experiment.name)
                resp = flask.make_response()
                resp.status_code = 200
            except ValueError:
                resp = flask.make_response("Error: experiment name already exists!")
                resp.status_code = 409
            return resp
        if request.method == "POST" and name == "init_end_gcode":
            fdata = request.form
            exp_name = fdata["experiment_name"]
            if exp_name != self.experiment.name:
                self.experiment = self.db.get_experiment(exp_name)
            self.experiment.init_gcode = fdata["init_gcode"]
            self.experiment.end_gcode = fdata["end_gcode"]
            self.db.update_experiment(self.experiment)
            resp = flask.make_response()
            resp.status_code = 200
            return resp
        elif request.method == "GET":
            if name == "get_names":
                exp_names = self.db.get_experiment_names()
                resp = flask.make_response(flask.jsonify(exp_names))
                resp.status_code = 200
                return resp
            else:
                # load experiment
                self.experiment = self.db.get_experiment(name)
                if self.experiment.config_file is not None:
                    config_file = str(self.experiment.config_file.stem)
                else:
                    config_file = "undefined"
                # build descriptive json to send back
                exp_dict = {
                    "name": self.experiment.name,
                    "is_first_layer": self.experiment.is_first_layer,
                    "printer": self.experiment.printer.name,
                    "filament": self.experiment.filament.name,
                    "max_samples": int(self.experiment.max_samples_count),
                    "spacing": float(self.experiment.spacing),
                    "sample_file": str(self.experiment.sample_file.stem),
                    "config_file": config_file,
                    "params_list": [
                        {"name": p.name, "low": float(p.low), "high": float(p.high)}
                        for p in self.experiment.params_space
                    ],
                    "init_gcode": self.experiment.init_gcode,
                    "end_gcode": self.experiment.end_gcode,
                }
                resp = flask.make_response(flask.jsonify(exp_dict))
                resp.status_code = 200
                return resp
        elif request.method == "DELETE":
            try:
                self.db.delete_experiment(name=name)
                resp = flask.make_response()
                resp.status_code = 200
            except ValueError:
                resp = flask.make_response(
                    "No experiment with name {} available for deletion".format(name)
                )
                resp.status_code = 404
            self._logger.info("Experiment {} deleted.".format(name))
            return resp

    @octoprint.plugin.BlueprintPlugin.route(
        "/grid/<string:name>", methods=["GET", "POST", "DELETE"]
    )
    def manage_grids(self, name):
        # add / change all grids csv file
        folder = self.db.folder_path
        if request.method == "POST" and name == "new":
            # create new sample grid
            fdata = request.form
            exp_name = fdata["experiment_name"]
            n_samples = int(fdata["samples_number"])
            if exp_name != self.experiment.name:
                self.experiment = self.db.get_experiment(exp_name)
            self.experiment.create_new_sample_grid(n_samples=n_samples)
            # save experiment
            self.db.update_experiment(experiment=self.experiment)
            # send grid_data as json
            samples_grid = self.experiment.to_dataframe()
            resp = flask.make_response(
                flask.jsonify(samples_grid.to_json(orient="records"))
            )
            resp.status_code = 200
            return resp
        if request.method == "POST" and name == "quality_values":
            # get quality values
            fdata = request.form
            exp_name = fdata["experiment_name"]
            if exp_name != self.experiment.name:
                self.experiment = self.db.get_experiment(exp_name)
            quality_values = json.loads(fdata["quality_values"])
            # update quality values
            samples_grid = self.experiment.to_dataframe()
            # samples_grid["quality"] = [float(q) for q in quality_values]
            # print(samples_grid)
            for i, s in enumerate(self.experiment.get_samples_list()):
                s.quality = float(quality_values[i])
            # self.experiment.from_dataframe(samples_grid, infer_space=False)
            print(self.experiment.to_dataframe())
            self.experiment.compute_and_update_samples_costs()
            self.experiment.register_costs_to_optimizer()
            self.db.update_experiment(self.experiment)
            new_samples_grid = self.experiment.to_dataframe()
            resp = flask.make_response(
                flask.jsonify(new_samples_grid.to_json(orient="records"))
            )
            resp.status_code = 200
            return resp
        if request.method == "POST" and name == "print":
            fdata = request.form
            exp_name = fdata["experiment_name"]
            grid_id = int(fdata["grid_id"])
            if exp_name != self.experiment.name:
                self.experiment = self.db.get_experiment(exp_name)
            grid = self.experiment.sample_grid_list[grid_id]
            output_file = self._settings.global_get_basefolder("watched")
            filename = "/exp_{}_samplegrid_{}.gcode".format(exp_name, grid_id)
            grid.write_gcode(output_file + filename)
            resp = flask.make_response()
            resp.status_code = 200
            return resp
        # get all samples
        elif request.method == "GET":
            if name != self.experiment.name:
                self.experiment = self.db.get_experiment(name)
            # send grid_data as json
            try:
                samples_grid = self.experiment.to_dataframe().to_json(orient="records")
                resp = flask.make_response(flask.jsonify(samples_grid))
            except ExperimentError:
                resp = flask.make_response()
            resp.status_code = 200
            return resp
        # delete a grid of samples
        elif request.method == "DELETE":
            grid_id = int(request.args.get("grid_id"))
            if name != self.experiment.name:
                self.experiment = self.db.get_experiment(name)
            # get df, delete grid and reset
            samples_grid = self.experiment.to_dataframe()
            new_samples_grid = samples_grid[
                samples_grid.sample_grid_id != grid_id
            ].copy()
            new_samples_grid.sample_grid_id = new_samples_grid.sample_grid_id.apply(
                lambda x: x - 1 if x > grid_id else x
            )
            self.experiment.from_dataframe(new_samples_grid, infer_space=False)
            try:
                self.experiment.compute_and_update_samples_costs()
                self.experiment.register_costs_to_optimizer()
            except ExperimentError:
                pass
            # save send grid_data as json
            self.db.update_experiment(experiment=self.experiment)
            if len(self.experiment.sample_grid_list) != 0:
                resp = flask.make_response(
                    flask.jsonify(
                        self.experiment.to_dataframe().to_json(orient="records")
                    )
                )
            else:
                resp = flask.make_response()
            resp.status_code = 200
            return resp
        return

    @octoprint.plugin.BlueprintPlugin.route(
        "/results/<string:action>", methods=["POST"]
    )
    def compute_and_get_results(self, action):
        if request.method == "POST" and action == "compute":
            fdata = request.form
            exp_name = fdata["experiment_name"]
            if exp_name != self.experiment.name:
                self.experiment = self.db.get_experiment(exp_name)
            results, std, fmin = self.experiment.estim_best_config()
            self.results = results
            results_data = {"results": results, "std": std, "fmin": fmin}
            resp = flask.make_response(flask.jsonify(results_data))
            resp.status_code = 200
            return resp
        if request.method == "POST" and action == "print":
            fdata = request.form
            exp_name = fdata["experiment_name"]
            if exp_name != self.experiment.name:
                self.experiment = self.db.get_experiment(exp_name)
            output_file = self._settings.global_get_basefolder("watched")
            filename = "/exp_{}_validation_sample.gcode".format(exp_name)
            self.experiment.write_validation_sample(
                self.results, output_file + filename
            )
            resp = flask.make_response()
            resp.status_code = 200
            return resp

    ## Hooks
    def bodysize_hook(self, current_max_body_sizes, *args, **kwargs):
        return [("POST", r"/files", 50 * 1000 * 1024)]


# If you want your plugin to be registered within OctoPrint under a different name than what you defined in setup.py
# ("OctoPrint-PluginSkeleton"), you may define that here. Same goes for the other metadata derived from setup.py that
# can be overwritten via __plugin_xyz__ control properties. See the documentation for that.
__plugin_name__ = "Sliceroptimizer Plugin"

# Starting with OctoPrint 1.4.0 OctoPrint will also support to run under Python 3 in addition to the deprecated
# Python 2. New plugins should make sure to run under both versions for now. Uncomment one of the following
# compatibility flags according to what Python versions your plugin supports!
# __plugin_pythoncompat__ = ">=2.7,<3" # only python 2
__plugin_pythoncompat__ = ">=3,<4"  # only python 3
# __plugin_pythoncompat__ = ">=2.7,<4" # python 2 and 3


def __plugin_load__():
    global __plugin_implementation__
    __plugin_implementation__ = SliceroptimizerPlugin()

    global __plugin_hooks__
    __plugin_hooks__ = {
        "octoprint.plugin.softwareupdate.check_config": __plugin_implementation__.get_update_information,
        "octoprint.server.http.bodysize": __plugin_implementation__.bodysize_hook,
    }
