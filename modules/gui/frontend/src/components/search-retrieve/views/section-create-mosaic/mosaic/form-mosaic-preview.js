/**
 * @author Mino Togna
 */
require('./form-mosaic-preview.scss')
var EventBus      = require('../../../../event/event-bus')
var Events        = require('../../../../event/events')
var FormValidator = require('../../../../form/form-validator')

require('devbridge-autocomplete')

var parentContainer = null
var template        = require('./form-mosaic-preview.html')
var html            = $(template({}))

var formNotify = null

var rowLandsat        = null
var landsatBands      = require('./bands-landsat.js')
var inputBandsLandsat = null

var rowSentinel2        = null
var sentinel2Bands      = require('./bands-sentinel2.js')
var inputBandsSentinel2 = null

var btnSubmit = null

var state = {}

var onBandsSelectionChange = function (selection) {
  state.mosaicPreviewBand = (selection) ? selection.data : null
}

var init = function (parent) {
  parentContainer = parent
  var container   = parentContainer.find('.mosaic-preview')
  container.append(html)
  
  formNotify   = html.find('.form-notify')
  rowLandsat   = html.find('.row-LANDSAT')
  rowSentinel2 = html.find('.row-SENTINEL2')
  
  btnSubmit = html.find('.btn-submit')
  
  inputBandsLandsat = html.find('input[name=bands-landsat]')
  inputBandsLandsat.sepalAutocomplete({
    lookup    : landsatBands
    , onChange: onBandsSelectionChange
  })
  
  //sentinel2
  inputBandsSentinel2 = html.find('input[name=bands-sentinel2]')
  inputBandsSentinel2.sepalAutocomplete({
    lookup    : sentinel2Bands
    , onChange: onBandsSelectionChange
  })
  
  btnSubmit.click(function (e) {
    e.preventDefault()
    FormValidator.resetFormErrors(html)
    
    if (state.mosaicPreviewBand) {
      state.mosaicPreview = true
      EventBus.dispatch(Events.SECTION.SEARCH_RETRIEVE.PREVIEW_MOSAIC, null, state)
    } else {
      FormValidator.addError(inputBandsLandsat)
      FormValidator.addError(inputBandsSentinel2)
      formNotify.html('A valid band must be selected').velocitySlideDown({delay: 20, duration: 400})
    }
  })
  
}

var hide = function (options) {
  parentContainer.velocitySlideUp(options)
}

var toggleVisibility = function (options) {
  parentContainer.velocitySlideToggle(options)
}

var reset = function () {
  FormValidator.resetFormErrors(html)
  inputBandsLandsat.sepalAutocomplete('reset')
  inputBandsSentinel2.sepalAutocomplete('reset')
  html.find('.row-sensors').hide()
}

var setActiveState = function (e, activeState) {
  reset()
  state = activeState
  
  if (state && state.sensorGroup) {
    html.find('.row-' + state.sensorGroup).show()
    if (state.mosaicPreviewBand) {
      setBandValue(sentinel2Bands, inputBandsSentinel2)
      setBandValue(landsatBands, inputBandsLandsat)
    }
    if (state.median) {
      disableDateBands()
    }
  }
}

var setBandValue = function (bands, input) {
  var obj = bands.find(function (o) {
    return o.data == state.mosaicPreviewBand
  })
  if (obj)
    input.val(obj.value).data('reset-btn').enable()
}

var disableDateBands = function () {
  var excludeDates = function (band) {
    return band.date !== true
  }
  
  inputBandsLandsat.sepalAutocomplete('dispose')
  inputBandsSentinel2.sepalAutocomplete('dispose')
  
  inputBandsLandsat.sepalAutocomplete({
    lookup    : landsatBands.filter(excludeDates)
    , onChange: onBandsSelectionChange
  })
  
  inputBandsSentinel2.sepalAutocomplete({
    lookup    : sentinel2Bands.filter(excludeDates)
    , onChange: onBandsSelectionChange
  })
  
  if (state.mosaicPreviewBand) {
    setBandValue(landsatBands, inputBandsLandsat)
    setBandValue(sentinel2Bands, inputBandsSentinel2)
    
    $.each(landsatBands.filter(function (band) {
      return band.date === true
    }), function (i, band) {
      if (state.mosaicPreviewBand === band.data) {
        state.mosaicPreviewBand = null
        inputBandsLandsat.sepalAutocomplete('reset')
        inputBandsSentinel2.sepalAutocomplete('reset')
      }
    })
    // $.each(sentinel2Bands.filter(function (band) {
    //   return band.date === true
    // }), function (i, band) {
    //   if (state.mosaicPreviewBand === band.data) {
    //     state.mosaicPreviewBand = null
    //     inputBandsSentinel2.sepalAutocomplete('reset')
    //   }
    // })
  }
}

var enableDateBands = function () {
  inputBandsLandsat.sepalAutocomplete('dispose')
  inputBandsSentinel2.sepalAutocomplete('dispose')
  
  inputBandsLandsat.sepalAutocomplete({
    lookup    : landsatBands
    , onChange: onBandsSelectionChange
  })
  
  //sentinel2
  inputBandsSentinel2 = html.find('input[name=bands-sentinel2]')
  inputBandsSentinel2.sepalAutocomplete({
    lookup    : sentinel2Bands
    , onChange: onBandsSelectionChange
  })
  
  setBandValue(landsatBands, inputBandsLandsat)
  setBandValue(sentinel2Bands, inputBandsSentinel2)
}

EventBus.addEventListener(Events.SECTION.SEARCH.STATE.ACTIVE_CHANGED, setActiveState)

module.exports = {
  init              : init
  , hide            : hide
  , toggleVisibility: toggleVisibility
  , reset           : reset
  , disableDateBands: disableDateBands
  , enableDateBands : enableDateBands
}