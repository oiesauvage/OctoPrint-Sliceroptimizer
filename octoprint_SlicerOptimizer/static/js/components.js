/* eslint-disable func-names */
/* eslint-disable no-multi-str */
/* eslint-disable object-shorthand */
/* global ko, OctoPrint, notifySuccess, buttonLoading, notifyError */

/**
 * Displays info in form of a two rows table.
 */
ko.components.register('descriptive-table', {
  viewModel: function (params) {
    this.names = params.names;
    this.values = params.values;
  },
  template:
        '<table class="table table-hover table-condensed"> \
            <thead> \
            <tr> \
                <!-- ko foreach: names --> \
                <th data-bind="text: $data"></th> \
                <!-- /ko --> \
            </tr> \
            </thead> \
            <tbody> \
            <tr> \
                <!-- ko foreach: values --> \
                <td data-bind="html: $data"></td> \
                <!-- /ko --> \
            </tr> \
            </tbody> \
        <table>',
});

/**
 * Additional text summary and parameters list for experiments.
 */
ko.components.register('experiment-additional-description', {
  viewModel: function (params) {
    const self = this;
    self.summary = params.summary;
    self.params_list = params.params_list;
    // methods
    self.activate_tooltips = function () {
      $('#params_list_desc').change($('[data-toggle="tooltip"]').tooltip());
    };
  },
  template:
        '<p data-bind="text: summary"></p> \
            <H5>Parameters</H5> \
            <div id="params_list_desc" class="row-fluid"> \
                <!-- ko foreach: {data: params_list, afterRender: activate_tooltips} --> \
                    <span style="cursor: default;" class="label label-info" data-toggle="tooltip" data-html="true" \
                    data-bind="text: $data.name, attr:{title: $data.text}"></span> \
                <!-- /ko --> \
            </div>',
});

/**
 * Component for creation of the parameters space of an experiment.
 */
ko.components.register('parameters-table', {
  viewModel: function (params) {
    this.params = params.value;
  },
  template:
        '<table class="table table-hover table-condensed">  \
            <thead> \
            <tr>  \
                <th>Parameter (slic3r)</th>  \
                <th class="span3">Values range</th>  \
                <th class="span1"></th>  \
            </tr>  \
            </thead> \
            <tbody> \
        <!-- ko foreach: params.array --> \
            <tr>  \
                <td data-bind="text: name"></td>  \
                <td data-bind="text: range_text"></td>  \
                <td>  \
                    <button data-bind="click: $component.params.deleteParameter" class="btn btn-danger"><i class="fas fa-trash"></i></button>  \
                </td>  \
            </tr>  \
        <!-- /ko --> \
            <tr>  \
                <td> \
                <select name="param_name" class="span3" \
                data-bind="options: params.available_names, value: params.selected_name">  \
                </select>  \
                </td>  \
                <td>  \
                <div class="control-group" id="param-range">  \
                    <input id="param_min_value" data-bind="value: params.min_value" class="input-mini" type="number" min="0" , step="0.01">  \
                    <input id="param_max_value" data-bind="value: params.max_value" class="input-mini" type="number" min="0" , step="0.01">  \
                </div>  \
                </td>  \
                <td>  \
                    <button class="btn btn-success" data-bind="click: params.addParameter"><i class="fas fa-plus"></i></button>  \
                </td>  \
            </tr>  \
            </tbody> \
        </table>',
});

/**
 * Component for file selection and uploading.
 */
ko.components.register('select-file-uploader', {
  viewModel: function (params) {
    const self = this;
    self.files_url = `${OctoPrint.getBlueprintUrl('SlicerOptimizer')}files`;
    self.submit_id = params.submit_id;
    self.files_field = params.files_field;
    self.select_id = `select_${params.id}`;
    self.input_id = `input_${params.id}`;
    self.input_btn_id = `${self.input_id}_btn`;
    self.delete_id = `delete_${params.id}`;
    self.selected_name = params.selected_name;
    self.files = ko.observableArray();
    self.accept = params.accept;
    self.caption = params.caption;
    self.files_modified = false;
    // methods
    self.init = function () {
      self.submit_btn = $(`#${self.submit_id}`);
      self.file_select = $(`#${self.select_id}`);
      self.file_input = $(`#${self.input_id}`);
      self.file_input_btn = $(`#${self.input_id}`);
      self.file_delete = $(`#${self.delete_id}`);
      // event handlers
      self.file_input.change(function () {
        const newFilename = $(this)[0].files[0].name;
        if (self.files.indexOf(newFilename) < 0) {
          if (self.files_modified) {
            self.files.shift();
          }
          self.files.unshift(newFilename);
          self.file_select.val(newFilename);
          self.selected_name(newFilename);
          self.files_modified = true;
          self.uploadFile();
        }
      });
      self.file_delete.click(() => { self.deleteFile(self.selected_name()); });
      self.updateFileNames();
    };
    self.uploadFile = function () {
      const file = self.file_input[0].files[0];
      if (typeof file === 'undefined') {
        return;
      }
      const filename = self.file_input[0].files[0].name;
      if (filename !== self.selected_name()) {
        self.updateFileNames();
        return;
      }
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', filename);

      $.ajax({
        url: self.files_url,
        type: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        beforeSend: function () {
          buttonLoading(self.file_input_btn, 'start');
          self.submit_btn.prop('disabled', true);
        },
      }).done(() => {
        self.updateFileNames();
        notifySuccess('File uploading successful.')();
      }).fail(() => {
        notifyError('File uploading failed.')();
      }).then(() => {
        buttonLoading(self.file_input_btn, 'stop');
        self.submit_btn.prop('disabled', false);
      });
    };

    self.updateFileNames = function () {
      $.get(self.files_url, (data) => {
        self.files(data[self.files_field]);
        self.files_modified = false;
      });
    };

    self.deleteFile = function (filename) {
      $.ajax({
        url: `${self.files_url}/${filename}`,
        type: 'DELETE',
        success: function () {
          self.updateFileNames();
          notifySuccess(`File ${filename} deleted!`)();
        },
      });
    };
  },
  template:
        '<div data-bind="template: { afterRender: init }">  \
        <form class="form-inline">  \
            <select class="span5" \
                data-bind="options: files, value: selected_name, optionsCaption: caption, attr: {id: select_id}">  \
            </select>  \
            <label class="btn btn-primary" data-bind="attr: {for: input_id, id: input_btn_id}">  \
                <input data-bind="attr: {id: input_id, accept: accept}" type="file" style="display:none">  \
                <i class="fas fa-upload"></i>  \
            </label>  \
            <button type="button" class="btn btn-danger" data-bind="attr: {id: delete_id}">  \
                <i class="fas fa-trash"></i>  \
            </button>  \
        </form>  \
        </div>',
});

/**
 * Component to display a samples grid and register quality values.
 */
ko.components.register('samples-grid', {
  viewModel: function (params) {
    const self = this;
    self.samples = params.samples;
    self.samples_desc = ko.computed(() => {
      let desc = [];// ko.observableArray([]);
      desc = self.samples().map((s) => {
        const sample = s;
        sample.print_time = `${sample.print_time.toFixed(2)} min.`;
        if (sample.cost !== null) {
          sample.cost = sample.cost.toFixed(1);
        }
        return sample;
      });
      return desc;
    });
    self.selected_grid_id = params.selected_grid_id;
  },
  template:
        '<table class="table table-hover table-condensed">  \
            <thead> \
                <tr>  \
                    <th>Sample id</th>  \
                    <th>Print time</th>  \
                    <th>Quality</th>  \
                    <th>Computed Cost</th>  \
                </tr>  \
            </thead> \
            <tbody> \
                <!-- ko foreach: samples_desc --> \
                <!-- ko if: $data.sample_grid_id === $component.selected_grid_id() --> \
                <tr>  \
                    <td data-bind="text: $index"></td>  \
                    <td data-bind="text: $data.print_time"></td>  \
                    <td>  \
                        <input type="number" class="input-small" data-bind="value: $data.quality" step="any">  \
                    </td>  \
                    <td data-bind="text: $data.cost"></td>  \
                </tr>  \
                <!-- /ko --> \
                <!-- /ko --> \
            </tbody> \
        </table>',
});

/**
 * Component to display optimization results.
 */
ko.components.register('optimization-results', {
  viewModel: function (params) {
    const self = this;
    self.results = params.results;
    self.std = params.std;
    self.fmin = params.fmin;
  },
  template:
    '<table class="table table-hover table-condensed"> \
            <thead> \
                <tr> \
                    <th>Parameter</th> \
                    <th>Value</th> \
                </tr> \
            </thead> \
            <tbody> \
                <!-- ko foreach: results --> \
                <tr> \
                    <td data-bind="text: $data.name"></td> \
                    <td data-bind="text: $data.value"></td> \
                </tr> \
                <!-- /ko --> \
                <tr> \
                    <td>cost precision</td> \
                    <td data-bind="text: std"></td> \
                </tr> \
                <tr> \
                    <td>optimal cost</td> \
                    <td data-bind="text: fmin"></td> \
                </tr> \
            </tbody> \
    </table>',
});
