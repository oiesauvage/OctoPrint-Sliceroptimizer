/* eslint-disable func-names */
/* global FilamentViewModel, PrinterViewModel, ParametersViewModel,
   ExperimentViewModel, GridViewModel, ResultsViewModel, OCTOPRINT_VIEWMODELS */
/*
 * View model for OctoPrint-Sliceroptimizer
 *
 * Author: Nils Artiges
 * License: AGPLv3
 */

$(() => {
  function SliceroptimizerViewModel() {
    const self = this;

    // variables
    const baseUrl = '/plugin/SlicerOptimizer';
    const filamentUrl = `${baseUrl}/filament`;
    const printersUrl = `${baseUrl}/printers`;
    const parametersUrl = `${baseUrl}/parameters`;
    const experimentUrl = `${baseUrl}/experiment`;
    const gridUrl = `${baseUrl}/grid`;
    const resultsUrl = `${baseUrl}/results`;

    self.filament = new FilamentViewModel(filamentUrl);
    self.printer = new PrinterViewModel(printersUrl);
    self.parameters = new ParametersViewModel(parametersUrl);
    self.experiment = new ExperimentViewModel(experimentUrl, self.parameters);
    self.grid = new GridViewModel(gridUrl, self.experiment);
    self.results = new ResultsViewModel(resultsUrl, self.experiment, self.grid);

    self.onAfterBinding = function () {
      self.parameters.getAvailableNames();
      self.experiment.updateNamesFromApi();
    };
  }

  /* view model class, parameters for constructor, container to bind to
     * Please see http://docs.octoprint.org/en/master/plugins/viewmodels.html#registering-custom-viewmodels for more details
     * and a full list of the available options.
     */
  OCTOPRINT_VIEWMODELS.push({
    construct: SliceroptimizerViewModel,
    // ViewModels your plugin depends on, e.g. loginStateViewModel, settingsViewModel, ...
    dependencies: [],
    // Elements to bind to, e.g. #settings_plugin_SlicerOptimizer, #tab_plugin_SlicerOptimizer, ...
    elements: ['#tab_plugin_SlicerOptimizer'],
  });
});
