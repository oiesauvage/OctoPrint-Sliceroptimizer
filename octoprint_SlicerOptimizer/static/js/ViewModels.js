/* eslint-disable func-names */
/* eslint-disable no-unused-vars */
/* global ko, notifySuccess, notifyError, buttonLoading, range, notifyError */

/**
 * View Model for filaments.
 * @param {string} filamentUrl - url for filaments in plugin API.
 */
const FilamentViewModel = function (filamentUrl) {
  const self = this;
  self.filament_url = filamentUrl;
  self.available_names = ko.observableArray();
  self.selected_name = ko.observable();
  self.description_names = ko.observableArray();
  self.description_values = ko.observableArray();
  // filament creation form
  self.filament_name = $('#filament_name');
  self.filament_material = $('#filament_material');
  self.filament_diameter = $('#filament_diameter');
  self.fil_ext_min = $('#filament_ext_min_temperature');
  self.fil_ext_max = $('#filament_ext_max_temperature');
  self.fil_bed_min = $('#filament_bed_min_temperature');
  self.fil_bed_max = $('#filament_bed_max_temperature');

  // auto-update object when new filament name selected.
  self.selected_name.subscribe(() => {
    self.updateDataFromApi();
  });
  // methods

  /**
   * Updates experiment data from plugin API.
   */
  self.updateDataFromApi = function () {
    if (typeof self.selected_name() !== 'undefined') {
      $.getJSON(`${self.filament_url}/${self.selected_name()}`, (data) => {
        const desc = self.getDescription(data);
        self.description_names(desc.names);
        self.description_values(desc.values);
      });
    } else {
      self.description_names([]);
      self.description_values([]);
    }
  };

  /**
   * Update experiment names from plugin API.
   */
  self.updateNamesFromApi = function () {
    $.get(`${self.filament_url}/get_names`, (data) => {
      self.available_names(data);
      const newName = self.filament_name.val();
      if (self.available_names().includes(newName)) {
        self.selected_name(newName);
      }
    });
  };

  /**
   * Delete selected experiment in database.
   */
  self.deleteInDB = function () {
    $.ajax({
      url: `${self.filament_url}/${self.selected_name()}`,
      type: 'DELETE',
    }).done(() => {
      self.updateNamesFromApi();
      notifySuccess(`Filament ${self.selected_name()} deleted!`)();
    });
  };

  /**
   * Create new experiment in database.
   */
  self.addInDBfromForm = function () {
    const form = new FormData();
    form.append('filament_name', self.filament_name.val());
    form.append('filament_material', self.filament_material.val());
    form.append('filament_diameter', self.filament_diameter.val());
    form.append('filament_ext_min_temperature', self.fil_ext_min.val());
    form.append('filament_ext_max_temperature', self.fil_ext_max.val());
    form.append('filament_bed_min_temperature', self.fil_bed_min.val());
    form.append('filament_bed_max_temperature', self.fil_bed_max.val());

    if (self.checkFrom()) {
      $.ajax({
        url: `${self.filament_url}/add`,
        type: 'POST',
        data: form,
        contentType: false,
        processData: false,
      }).done(() => {
        notifySuccess('New filament created.')();
        self.updateNamesFromApi();
        $('#abort_fil_creation').click();
      }).fail(notifyError(
        'Filament name already exists. Delete filament or try another name.',
        '#filament_name_field',
      ));
    }
  };

  /**
   * Generate arrays to populate descriptive table for experiments.
   * @param {Object} filamentData - Object from experiment data returned by plugin API.
   * @returns Two arrays for names and corresponding descriptions.
   */
  self.getDescription = function (filamentData) {
    const names = ['Filament name', 'Material', 'Diameter (mm)', 'Extrusion temperatures', 'Bed temperatures'];
    const values = [
      filamentData.name,
      filamentData.material,
      filamentData.diameter,
      `min: ${filamentData.extrusion_temp_range[0]}<br> max: ${filamentData.extrusion_temp_range[1]}`,
      `min: ${filamentData.bed_temp_range[0]}<br> max: ${filamentData.bed_temp_range[1]}`,
    ];
    return { names, values };
  };

  /**
   * Checks if the form for new experiments is valid.
   * @returns boolean
   */
  self.checkFrom = function () {
    const filExtMin = parseFloat(self.fil_ext_min.val());
    const filExtMax = parseFloat(self.fil_ext_max.val());
    const filBedMin = parseFloat(self.fil_bed_min.val());
    const filBedMax = parseFloat(self.fil_ext_max.val());
    let isValid = true;
    if (filExtMax < filExtMin) {
      notifyError('Filament extrusion temperatures are inverted', '#filament_ext_temp')();
      isValid = false;
    }
    if (filBedMax < filBedMin) {
      notifyError('Filament bed temperatures are inverted', '#filament_bed_temp')();
      isValid = false;
    }
    return isValid;
  };
};

/**
 * Printers View Model
 * @param {string} printersUrl - url for printers in plugin API.
 */
const PrinterViewModel = function (printersUrl) {
  const self = this;
  self.printers_url = printersUrl;
  self.available_names = ko.observableArray();
  self.name = ko.observable();
  self.description_names = ko.observableArray();
  self.description_values = ko.observableArray();
  self.printers_data = {};
  // auto-update object
  self.name.subscribe(() => {
    self.updateDescription();
  });
  // methods

  /**
   * Update printer data from API.
   */
  self.updateDataFromApi = function () {
    $.getJSON(self.printers_url, (data) => {
      self.printers_data = data;
      self.available_names(Object.keys(data));
    });
  };

  /**
   * Updates printer description in descriptive array.
   */
  self.updateDescription = function () {
    let names = [];
    let values = [];
    if (typeof self.name() !== 'undefined') {
      const printerData = self.printers_data[self.name()];
      printerData.name = self.name;
      const desc = self.get_description(printerData);
      names = desc.names;
      values = desc.values;
    }
    self.description_names(names);
    self.description_values(values);
  };

  /**
   * Generates description for descriptive table of selected printer.
   * @param {Object} printerData - printer data returned by plugin API.
   * @returns Arrays of names and corresponding descriptions.
   */
  self.get_description = function (printerData) {
    const names = ['Printer id', 'Bed size', 'Speed (mm/s)', 'Nozzle diameter (mm)'];
    const values = [printerData.name,
      `min: ${printerData.bed_size[0]}<br> max: ${printerData.bed_size[1]}`,
      `min: ${printerData.min_speed}<br> max: ${printerData.max_speed}`,
      printerData.nozzle_diameter];
    return { names, values };
  };
};

/**
 * Parameters View Model
 * @param {string} parametersUrl - url for parameters in plugin API.
 */
const ParametersViewModel = function (parametersUrl) {
  const self = this;
  self.parameters_url = parametersUrl;
  self.available_names = ko.observableArray();
  self.array = ko.observableArray();
  // self.names = ko.observableArray();
  // self.min_values = ko.observableArray();
  // self.max_values = ko.observableArray();
  self.selected_name = ko.observable();
  self.min_value = ko.observable();
  self.max_value = ko.observable();
  // self.getAvailableNames()
  // methods

  /**
   * Retrieve available parameter names from plugin API.
   */
  self.getAvailableNames = function () {
    $.get(`${self.parameters_url}/get_available_names`, (data) => {
      self.available_names(data.sort());
    });
  };

  /**
   * Adds a new parameter in experiment.
   */
  self.addParameter = function () {
    if (self.checkForm()) {
      self.array.push({
        name: self.selected_name(),
        min_value: self.min_value(),
        max_value: self.max_value(),
        range_text: `min: ${self.min_value()}, max: ${self.max_value()}`,
      });
      self.available_names.remove(self.selected_name());
      self.min_value(undefined);
      self.max_value(undefined);
    }
  };

  /**
   * Delete a parameter in experiment.
   */
  self.deleteParameter = function () {
    self.array.remove(this);
    self.available_names.push(this.name);
    self.available_names.sort();
  };

  /**
   * Checks if new parameter form is valid.
   * @returns boolean
   */
  self.checkForm = function () {
    const minValue = parseFloat(self.min_value());
    const maxValue = parseFloat(self.max_value());
    if ((maxValue < 0) || (minValue < 0)) {
      notifyError('Negative values not allowed for parameters.', '#param-range')();
      return false;
    }
    if (maxValue > minValue) {
      return true;
    }
    notifyError('Parameter values are inverted, equal or missing.', '#param-range')();
    return false;
  };
};

/**
 * View model for experiments
 * @param {string} experimentUrl - url of experiments for plugin API
 * @param {ParametersViewModel} parameters - A ParametersViewModel instance
 */
const ExperimentViewModel = function (experimentUrl, parameters) {
  const self = this;
  self.experiment_url = experimentUrl;
  self.parameters = parameters;
  // experiment card
  self.available_names = ko.observableArray();
  self.selected_name = ko.observable();
  self.selected_summary = ko.observable();
  self.selected_params_desc = ko.observableArray();
  self.description_names = ko.observableArray();
  self.description_values = ko.observableArray();
  self.max_samples = ko.observable();
  self.init_gcode = ko.observable();
  self.end_gcode = ko.observable();
  // sample file
  self.sample_id = 'sample';
  self.sample_select = ko.observable();
  self.sample_accept = '.stl';
  self.sample_files_field = 'samples';
  // config file
  self.config_id = 'config';
  self.config_select = ko.observable();
  self.config_accept = '.ini';
  self.config_files_field = 'slicer_configs';
  // buttons
  self.submit_id = 'submit_experiment';
  self.submit_btn = $(`#${self.submit_id}`);
  self.init_end_gcode_save_btn = $('#init_end_gcode_save_btn');
  self.init_end_gcode_abort_btn = $('#init_end_gcode_abort_btn');
  self.delete_btn = $('#delete_experiment_btn');
  self.change_init_end_gcode_btn = $('#change_init_end_gcode_btn');
  self.delete_btn.prop('disabled', true);
  self.change_init_end_gcode_btn.prop('disabled', true);
  //  jquery form inputs
  self.name = $('#exp_name');
  self.is_first_layer = $('#exp_is_first_layer');
  self.spacing = $('#exp_spacing');
  self.printer = $('#exp_printer');
  self.filament = $('#exp_filament');
  // event handlers
  self.submit_btn.click(() => {
    self.create_experiment();
  });
  self.init_end_gcode_save_btn.click(() => {
    self.saveInitEndGcode();
  });
  // auto-update object when new experiment name selected.
  self.selected_name.subscribe((name) => {
    self.updateDataFromApi();
    if (typeof name === 'undefined') {
      self.delete_btn.prop('disabled', true);
      self.change_init_end_gcode_btn.prop('disabled', true);
    } else {
      self.delete_btn.prop('disabled', false);
      self.change_init_end_gcode_btn.prop('disabled', false);
    }
  });
  // methods

  /**
   * Validates if the new experiment form is correct.
   * @returns boolean
   */
  self.validate_form = function () {
    let isvalid = true;
    const requiredFieldIds = ['exp_name', 'exp_printer', 'exp_filament', 'exp_spacing', 'select_sample'];
    requiredFieldIds.forEach((field) => {
      if ($(`#${field}`).val() === '') {
        notifyError('Please fill-in the missing field.', `#${field}_field`)();
        isvalid = false;
      }
    });
    if (self.parameters.array().length === 0) {
      notifyError('Register at least one parameter to optimize.')();
      isvalid = false;
    }
    return isvalid;
  };

  /**
   * Create a new experiment through plugin API.
   */
  self.create_experiment = function () {
    const form = new FormData();
    form.append('name', self.name.val());
    form.append('sample_file', self.sample_select());
    form.append('is_first_layer', self.is_first_layer.prop('checked'));
    form.append('spacing', self.spacing.val());
    form.append('printer', self.printer.val());
    form.append('filament', self.filament.val());
    form.append('init_config', self.config_select());
    form.append('params_list', JSON.stringify(self.parameters.array()));

    if (self.validate_form()) {
      $.ajax({
        url: `${self.experiment_url}/add`,
        type: 'POST',
        data: form,
        contentType: false,
        processData: false,
      }).done(() => {
        notifySuccess('New experiment created.')();
        self.updateNamesFromApi();
        $('#abort_experiment_creation').click();
      }).fail(notifyError(
        'Experiment name already exists. Delete experiment or try another name.',
        '#exp_name_field',
      )).then(() => { self.selected_name(self.name.val()); });
    }
  };

  /**
   * Save init and end gcode for selected experiment.
   */
  self.saveInitEndGcode = function () {
    const form = new FormData();
    form.append('experiment_name', self.selected_name());
    form.append('init_gcode', self.init_gcode());
    form.append('end_gcode', self.end_gcode());
    $.ajax({
      url: `${self.experiment_url}/init_end_gcode`,
      type: 'POST',
      data: form,
      contentType: false,
      processData: false,
      beforeSend() { buttonLoading(self.init_end_gcode_save_btn, 'start'); },
    }).done((data) => {
      notifySuccess('Initial and end G-Code saved.')();
    }).fail(() => {
      notifyError('Initial and end G-Code injection failed.')();
    }).always(() => {
      buttonLoading(self.init_end_gcode_save_btn, 'stop');
      self.init_end_gcode_abort_btn.click();
    });
  };

  /**
   * Update experiment data from API.
   */
  self.updateDataFromApi = function () {
    if (self.selected_name()) {
      $.getJSON(`${self.experiment_url}/${self.selected_name()}`, (data) => {
        self.max_samples(data.max_samples);
        const desc = self.getDescription(data);
        self.description_names(desc.names);
        self.description_values(desc.values);
        self.selected_summary(self.getSummary(data));
        self.selected_params_desc(self.getParamsDesc(data));
        self.init_gcode(data.init_gcode);
        self.end_gcode(data.end_gcode);
      });
    } else {
      self.description_names([]);
      self.description_values([]);
      self.selected_summary('');
      self.selected_params_desc([]);
    }
  };

  /**
   * Update experiment names from API.
   */
  self.updateNamesFromApi = function () {
    $.get(`${self.experiment_url}/get_names`, (data) => {
      self.available_names(data);
      const newName = self.name.val();
      if (self.available_names().includes(newName)) {
        self.selected_name(newName);
      }
    });
  };

  /**
   * Delete one experiment.
   */
  self.deleteInDB = function () {
    $.ajax({
      url: `${self.experiment_url}/${self.selected_name()}`,
      type: 'DELETE',
    }).done(() => {
      self.updateNamesFromApi();
      notifySuccess(`Experiment ${self.selected_name()} deleted!`)();
    });
  };

  /**
   * Generate description from experiment data returned by API to populate descriptive table.
   * @param {Object} experimentData - experiment data returned by API.
   * @returns Arrays of names and corresponding descriptions.
   */
  self.getDescription = function (experimentData) {
    const names = ['Name', 'Printer', 'Filament', 'Sample file', 'Spacing'];
    const values = [
      experimentData.name,
      experimentData.printer,
      experimentData.filament,
      experimentData.sample_file,
      `${experimentData.spacing} mm`,
    ];
    return { names, values };
  };

  /**
   * Generate additional description string fro experiment.
   * @param {Object} experimentData - experiment data returned by API.
   * @returns Descriptive string summary.
   */
  self.getSummary = function (experimentData) {
    let summary = '';
    if (!experimentData.is_first_layer && experimentData.config_file === 'undefined') {
      summary = '';
    } else if (experimentData.is_first_layer && experimentData.config_file !== 'undefined') {
      summary = `For first layer tests, with ${experimentData.config_file} as slic3r initial configuration.`;
    } else if (experimentData.is_first_layer && experimentData.config_file === 'undefined') {
      summary = 'For first layer tests.';
    } else {
      summary = `With ${experimentData.config_file} as slic3r initial configuration.`;
    }
    if (summary !== '') {
      summary += ' | ';
    }
    summary += `max. samples number: ${experimentData.max_samples}`;
    return summary;
  };

  /**
   * Generate parameter descriptions for tooltips.
   * @param {Object} experimentData - experiment data returned by API.
   * @returns descriptive text
   */
  self.getParamsDesc = function (experimentData) {
    function description(param) {
      const desc = {};
      desc.name = param.name;
      let minVal = param.low;
      if (!Number.isInteger(minVal)) {
        minVal = minVal.toFixed(2);
      }
      let maxVal = param.high;
      if (!Number.isInteger(maxVal)) {
        maxVal = maxVal.toFixed(2);
      }
      desc.text = `min: ${minVal} | max: ${maxVal}`;
      return desc;
    }
    return experimentData.params_list.map(description);
  };
};

/**
 * Grid Vew Model
 * @param {string} gridUrl - url for samples grids in plugin API.
 * @param {Object} experiment - ExperimentView model instance.
 */
const GridViewModel = function (gridUrl, experiment) {
  const self = this;
  self.grid_url = gridUrl;
  self.selected_grid_id = ko.observable();
  self.samples = ko.observableArray();
  self.grid_numbers = ko.observableArray();
  self.exp_name = experiment.selected_name; // ko observable
  self.max_samples = experiment.max_samples; // ko observable
  // inputs
  self.n_samples = $('#samples_number');
  self.new_grid_button = $('#new_grid_btn');
  self.delete_grid_btn = $('#delete_grid_btn');
  self.save_grid_btn = $('#save_grid_btn');
  self.gen_gcode_btn = $('#gen_gcode_btn');
  self.compute_btn = $('#compute_btn');
  // event handlers
  experiment.selected_name.subscribe((newName) => {
    if (typeof newName !== 'undefined') {
      self.getGrid();
      self.save_grid_btn.prop('disabled', false);
      self.delete_grid_btn.prop('disabled', false);
      self.gen_gcode_btn.prop('disabled', false);
      self.compute_btn.prop('disabled', false);
    } else {
      self.samples([]);
      self.save_grid_btn.prop('disabled', true);
      self.delete_grid_btn.prop('disabled', true);
      self.gen_gcode_btn.prop('disabled', true);
      self.compute_btn.prop('disabled', true);
    }
  });
  experiment.available_names.subscribe(() => {
    self.samples([]);
  });
  self.samples.subscribe((samples) => {
    self.acceptNewGrid();
    self.acceptDeleteGrid();
    self.acceptGCodeGen();
    self.acceptSaveGrid();
    self.acceptComputeOptim();
  });
  self.selected_grid_id.subscribe(() => {
    self.acceptGCodeGen();
  });
  // methods

  /**
   * Adds a new samples grid to selected experiment.
   */
  self.addGrid = function () {
    const form = new FormData();
    form.append('experiment_name', self.exp_name());
    form.append('samples_number', self.n_samples.val());

    if (self.validateNewGridForm()) {
      $.ajax({
        url: `${self.grid_url}/new`,
        type: 'POST',
        data: form,
        contentType: false,
        processData: false,
        beforeSend() { buttonLoading(self.new_grid_button, 'start'); },
      }).done((data) => {
        self.updateGrid(data);
        notifySuccess('New samples grid created.')();
      }).fail(() => {
        notifyError('Grid creation failed.')();
      }).always(() => {
        buttonLoading(self.new_grid_button, 'stop');
        self.acceptNewGrid();
      });
    }
  };

  /**
   * Validate the form for new samples grid creation.
   * @returns boolean
   */
  self.validateNewGridForm = function () {
    let isFormValid = true;
    if (self.n_samples.val() > self.max_samples()) {
      isFormValid = false;
    } else if (self.n_samples.val() < 1) {
      isFormValid = false;
    }
    if (!isFormValid) {
      notifyError('Invalid samples number.', '#samples_grid_field')();
    }
    return isFormValid;
  };

  /**
   * Validate the quality values entered in selected sample grid.
   * @returns boolean
   */
  self.validateNewQualityValues = function () {
    let isFormValid = true;
    const qualityValues = self.samples().map((sample) => sample.quality);
    Object.keys(qualityValues).forEach((i) => {
      if (qualityValues[i] === '' || qualityValues[i] === null) {
        isFormValid = false;
      }
    });
    if (!isFormValid) {
      notifyError('Please fill-in all samples quality values.')();
    }
    return isFormValid;
  };

  /**
   * Enable button if gcode for selected sample grid be created.
   */
  self.acceptGCodeGen = function () {
    const samples = self.samples();
    let genGcodeOk = true;
    const selectedSamples = [];
    Object.keys(samples).forEach((i) => {
      const s = samples[i];
      if (s.sample_grid_id === self.selected_grid_id()) {
        selectedSamples.push(s);
      }
    });
    if (samples.length === 0 || selectedSamples.length === 0) {
      genGcodeOk = false;
    }
    self.gen_gcode_btn.prop('disabled', !genGcodeOk);
  };

  /**
   * Enable button if a new grid can be created.
   */
  self.acceptNewGrid = function () {
    const costs = self.samples().map((sample) => sample.cost);
    let allCostsFilled = true;
    Object.keys(costs).forEach((i) => {
      if (costs[i] === null) {
        allCostsFilled = false;
      }
    });
    let newGridOk = false;
    if (typeof self.exp_name() !== 'undefined') {
      if (costs.length === 0) {
        newGridOk = true;
      } else if (allCostsFilled) {
        newGridOk = true;
      }
    }
    if (newGridOk) {
      self.new_grid_button.tooltip('destroy');
    } else {
      self.new_grid_button.tooltip({ title: 'Fill-in and save quality values.' });
    }
    self.new_grid_button.prop('disabled', !newGridOk);
  };

  /**
   * Enable button if a grid can be deleted.
   */
  self.acceptDeleteGrid = function () {
    if (self.samples().length === 0) {
      self.delete_grid_btn.prop('disabled', true);
    } else {
      self.delete_grid_btn.prop('disabled', false);
    }
  };

  /**
   * Enable button if a grid can be saved.
   */
  self.acceptSaveGrid = function () {
    if (self.samples().length === 0) {
      self.save_grid_btn.prop('disabled', true);
    } else {
      self.save_grid_btn.prop('disabled', false);
    }
  };

  /**
   * Enable compute optimization button if it can be performed.
   */
  self.acceptComputeOptim = function () {
    const costs = self.samples().map((sample) => sample.cost);
    let allCostsFilled = true;
    Object.keys(costs).forEach((i) => {
      if (costs[i] === null) {
        allCostsFilled = false;
      }
    });
    if (allCostsFilled && self.grid_numbers().length > 1) {
      self.compute_btn.prop('disabled', false);
    } else {
      self.compute_btn.prop('disabled', true);
    }
  };

  /**
   * Delete the selected samples grid.
   */
  self.deleteGrid = function () {
    $.ajax({
      url: `${self.grid_url}/${self.exp_name()}?grid_id=${self.selected_grid_id()}`,
      type: 'DELETE',
      beforeSend() { buttonLoading(self.delete_grid_btn, 'start'); },
    }).done((data) => {
      self.updateGrid(data);
      notifySuccess('Samples successfully deleted.')();
    }).fail(
      () => {
        notifyError('Samples deletion failed.');
      },
    ).always(
      () => {
        buttonLoading(self.delete_grid_btn, 'stop');
        self.acceptNewGrid();
        self.acceptComputeOptim();
      },
    );
  };

  /**
   * Get samples grid data from plugin API.
   */
  self.getGrid = function () {
    if (self.exp_name()) {
      $.get(`${self.grid_url}/${self.exp_name()}`, (data) => {
      }).done((data) => {
        self.updateGrid(data);
        self.acceptComputeOptim();
      })
        .fail(() => {
          notifyError('Something went wrong during sample grid fetch.')();
        });
    }
  };

  /**
   * Update sample grid values from API data.
   * @param {Object} data - samples grid data from API.
   */
  self.updateGrid = function (data) {
    let sData;
    let nSamples;
    let lastSample;
    let nGrids;
    try {
      sData = JSON.parse(data);
      self.samples(sData);
      nSamples = sData.length;
      lastSample = sData[nSamples - 1];
      nGrids = lastSample.sample_grid_id + 1;
      self.grid_numbers(range(nGrids));
      self.selected_grid_id(nGrids - 1);
    } catch (err) {
      sData = [];
      self.samples(sData);
      self.grid_numbers(range(undefined));
    }
  };

  /**
   * Save quality values entered in samples grid.
   */
  self.saveGrid = function () {
    // get quality values
    const samples = self.samples();
    const qualityValues = samples.map((s) => s.quality);
    // send values to server
    const form = new FormData();
    form.append('experiment_name', self.exp_name());
    form.append('quality_values', JSON.stringify(qualityValues));
    if (self.validateNewQualityValues()) {
      $.ajax({
        url: `${self.grid_url}/quality_values`,
        type: 'POST',
        data: form,
        contentType: false,
        processData: false,
        beforeSend() { buttonLoading(self.save_grid_btn, 'start'); },
      }).done((data) => {
        self.updateGrid(data);
        self.acceptGCodeGen();
        notifySuccess('Quality values updated.')();
      }).fail(
        () => {
          notifyError('Quality values updating failed.')();
        },
      ).always(
        () => {
          buttonLoading(self.save_grid_btn, 'stop');
          self.acceptNewGrid();
          self.acceptComputeOptim();
        },
      );
    }
  };

  /**
   * Generate gcode for selected samples grid.
   */
  self.printGrid = function () {
    const form = new FormData();
    form.append('experiment_name', self.exp_name());
    form.append('grid_id', self.selected_grid_id());
    $.ajax({
      url: `${self.grid_url}/print`,
      type: 'POST',
      data: form,
      contentType: false,
      processData: false,
      beforeSend() { buttonLoading(self.gen_gcode_btn, 'start'); },
    }).done(() => {
      notifySuccess('gcode generated in Files!')();
    }).fail(
      () => {
        notifyError('Error encountered in gcode generation.')();
      },
    ).always(
      () => {
        buttonLoading(self.gen_gcode_btn, 'stop');
      },
    );
  };
};

/**
 * Results View Model
 * @param {string} resultsUrl - url for optimization results in plugin API.
 * @param {Object} experiment - ExperimentView model instance.
 */
const ResultsViewModel = function (resultsUrl, experiment) {
  const self = this;
  self.results_url = resultsUrl;
  // observables
  self.exp_name = experiment.selected_name;
  self.results = ko.observableArray();
  self.fmin = ko.observable();
  self.std = ko.observable();
  // buttons
  self.compute_btn = $('#compute_btn');
  self.validation_sample_btn = $('#validation_sample_btn');
  self.compute_btn.prop('disabled', true);
  self.validation_sample_btn.prop('disabled', true);
  // events
  $('#experiment_select').change(() => {
    self.results([]);
    self.fmin(null);
    self.std(null);
    self.compute_btn.prop('disabled', true);
    self.validation_sample_btn.prop('disabled', true);
  });
  // methods
  self.computeResults = function () {
    const form = new FormData();
    form.append('experiment_name', self.exp_name());
    $.ajax({
      url: `${self.results_url}/compute`,
      type: 'POST',
      data: form,
      contentType: false,
      processData: false,
      beforeSend() {
        buttonLoading(self.compute_btn, 'start');
        self.validation_sample_btn.prop('disabled', true);
      },
    }).done((data) => {
      notifySuccess('Optimization successful!')();
      self.fmin(data.fmin.toFixed(2));
      self.std(data.std.toFixed(2));
      self.results([]);
      Object.keys(data.results).forEach((name) => {
        let val = data.results[name];
        if (!Number.isInteger(val)) {
          val = val.toFixed(2);
        }
        self.results.push({ name, value: val });
      });
      self.validation_sample_btn.prop('disabled', false);
    }).fail(
      () => {
        notifyError('Error encountered in optimization.')();
      },
    ).always(
      () => {
        buttonLoading(self.compute_btn, 'stop');
      },
    );
  };
  self.printValidationSample = function () {
    const form = new FormData();
    form.append('experiment_name', self.exp_name());
    $.ajax({
      url: `${self.results_url}/print`,
      type: 'POST',
      data: form,
      contentType: false,
      processData: false,
      beforeSend() { buttonLoading(self.validation_sample_btn, 'start'); },
    }).done(() => {
      notifySuccess('Validation gcode generated in Files!')();
    }).fail(
      () => {
        notifyError('Error encountered in gcode generation.')();
      },
    ).always(
      () => {
        buttonLoading(self.validation_sample_btn, 'stop');
      },
    );
  };
};
