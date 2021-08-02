/* global PNotify */
/* eslint-disable no-new */
/* eslint-disable func-names */
/* eslint-disable no-unused-vars */
/*
 * Provides notification functions using PNotify and other utilities.
 *
 * Author: Nils Artiges
 * License: AGPLv3
 */

/**
 * Notify errors with PNotify.
 * @param {string} text - Text for the notification.
 * @param {string} fieldTag - id tag for highlighted control-group.
 * @returns function to execute triggering the error alert.
 */
function notifyError(text, fieldTag) {
  const notifyFunc = function () {
    new PNotify({ type: 'error', title: 'Error!', text });
    if (fieldTag !== undefined) {
      $(fieldTag).attr('class', 'control-group error');
      $(fieldTag).change(function () { $(this).attr('class', 'control-group'); });
    }
  };
  return notifyFunc;
}

/**
 * Notify a success with PNotify.
 * @param {string} text Text for the notification.
 * @returns function to execute triggering the success alert.
 */
function notifySuccess(text) {
  const notifyFunc = function () {
    new PNotify({ type: 'success', title: 'Success!', text });
  };
  return notifyFunc;
}

/**
 * Generates an array of integers in Python style.
 * @param {number} startVal - Initial value.
 * @param {number} stopVal - Stopping value.
 * @param {number} stepVal - Step value.
 * @returns Array of integers.
 */
function range(startVal, stopVal, stepVal) {
  let start = startVal;
  let stop = stopVal;
  let step = stepVal;
  if (typeof stop === 'undefined') {
    // one param defined
    stop = start;
    start = 0;
  }

  if (typeof step === 'undefined') {
    step = 1;
  }

  if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
    return [];
  }

  const result = [];
  for (let i = start; step > 0 ? i < stop : i > stop; i += step) {
    result.push(i);
  }

  return result;
}

/**
 * Puts/exits a button in a loading state (disabled, with spinner).
 * @param {Object} jqbutton - JQuery button object.
 * @param {string} state - "stop" or "start" to disable/enable loading state.
 */
function buttonLoading(jqbutton, state) {
  if (state === 'start') {
    jqbutton.attr('data-html', jqbutton.html());
    const width = jqbutton.width();
    jqbutton.prop('disabled', true);
    jqbutton.html("<i class='fas fa-spinner fa-spin'></i>");
    jqbutton.width(width);
  } else if (state === 'stop') {
    jqbutton.html(jqbutton.attr('data-html'));
    jqbutton.prop('disabled', false);
  }
}
